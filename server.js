require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

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

        res.json(data);
    } catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
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