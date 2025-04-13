require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.static('public'));
app.use(limiter); // Apply rate limiting to all routes

// Request validation middleware
const validateTwitterToken = [
    body('code').isString().trim().notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateWalletSubmission = [
    body('walletAddress')
        .isString()
        .trim()
        .notEmpty()
        .matches(/^0x[a-fA-F0-9]{40}$/)
        .withMessage('Invalid EVM wallet address format'),
    body('twitterAccessToken').isString().trim().notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Serve static files from the public directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Twitter OAuth endpoints
app.get('/api/twitter/auth-url', (req, res) => {
    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
        `response_type=code` +
        `&client_id=${process.env.TWITTER_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.TWITTER_REDIRECT_URI)}` +
        `&scope=tweet.read%20users.read` +
        `&state=${state}` +
        `&code_challenge_method=plain` +
        `&code_challenge=challenge`;

    res.json({ authUrl, state });
});

app.post('/api/twitter/token', validateTwitterToken, async (req, res) => {
    const { code } = req.body;
    
    try {
        const response = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITTER_REDIRECT_URI,
            }),
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error_description || 'Failed to exchange token');
        }

        // Get user info from Twitter
        const userResponse = await fetch('https://api.twitter.com/2/users/me', {
            headers: {
                'Authorization': `Bearer ${data.access_token}`
            }
        });
        const userData = await userResponse.json();

        res.json({
            ...data,
            twitterId: userData.data.id,
            twitterUsername: userData.data.username
        });
    } catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

// Save wallet and Twitter info to Google Sheets
app.post('/api/submit', validateWalletSubmission, async (req, res) => {
    const { walletAddress, twitterAccessToken, twitterId, twitterUsername } = req.body;
    const timestamp = new Date().toISOString();

    try {
        // Check if wallet address already exists
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:A',
        });

        const rows = response.data.values || [];
        const existingWallet = rows.find(row => row[0] === walletAddress);
        
        if (existingWallet) {
            return res.status(400).json({ error: 'Wallet address already registered' });
        }

        // Add new row to Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:E',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    walletAddress,
                    twitterId,
                    twitterUsername,
                    timestamp,
                    'Connected'
                ]],
            },
        });

        res.json({ message: 'Successfully registered!' });
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 