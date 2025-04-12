// Twitter OAuth Configuration
const TWITTER_CLIENT_ID = 'YOUR_CLIENT_ID'; // You'll need to replace this with your actual client ID
const REDIRECT_URI = 'YOUR_REDIRECT_URI'; // Your callback URL

// Initialize Twitter OAuth
function initTwitterAuth() {
    const twitterConnectBtn = document.getElementById('twitterConnect');
    if (twitterConnectBtn) {
        twitterConnectBtn.addEventListener('click', connectTwitter);
    }
}

// Connect to Twitter
async function connectTwitter() {
    try {
        // Get the auth URL from our backend
        const response = await fetch('/api/twitter/auth-url');
        const { authUrl, state } = await response.json();
        
        // Store the state for verification
        localStorage.setItem('twitter_auth_state', state);
        
        // Redirect to Twitter
        window.location.href = authUrl;
    } catch (error) {
        console.error('Error getting auth URL:', error);
        alert('Failed to connect to Twitter. Please try again.');
    }
}

// Handle the OAuth callback
function handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = localStorage.getItem('twitter_auth_state');

    if (state !== storedState) {
        console.error('State mismatch - possible CSRF attack');
        alert('Security verification failed. Please try again.');
        return;
    }

    if (code) {
        // Exchange the code for an access token
        exchangeCodeForToken(code);
    }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code) {
    try {
        const response = await fetch('/api/twitter/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.access_token) {
            // Store the token securely
            localStorage.setItem('twitter_access_token', data.access_token);
            // Update UI to show connected state
            updateTwitterButtonState(true);
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (error) {
        console.error('Error exchanging code for token:', error);
        alert('Failed to complete Twitter authentication. Please try again.');
    }
}

// Generate random state parameter
function generateRandomState() {
    return Math.random().toString(36).substring(2, 15);
}

// Update Twitter button state
function updateTwitterButtonState(connected) {
    const button = document.getElementById('twitterConnect');
    if (button) {
        if (connected) {
            button.innerHTML = '<img src="./images/twitter-logo.png" alt="Twitter Logo" class="twitter-logo"> Connected to Twitter';
            button.disabled = true;
            button.style.backgroundColor = '#28a745';
        }
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initTwitterAuth();
    // Check if we're on the callback page
    if (window.location.search.includes('code=')) {
        handleCallback();
    }
}); 