const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Basic route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Example API endpoint for wallet submission (to be implemented)
app.post('/api/submit-wallet', (req, res) => {
    // TODO: Implement wallet submission logic
    res.json({ message: 'Wallet submission endpoint (to be implemented)' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
}); 