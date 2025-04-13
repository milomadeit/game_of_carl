document.addEventListener('DOMContentLoaded', () => {
    const alienGlyph = document.getElementById('alienGlyph');
    const formSection = document.getElementById('formSection');
    const walletForm = document.getElementById('walletForm');
    const walletInput = document.getElementById('walletAddress');
    const twitterConnectBtn = document.getElementById('twitterConnect');
    
    let twitterData = null;
    
    // Update the glyph click handler
    alienGlyph.addEventListener('click', () => {
        // First fade in the form
        formSection.style.display = 'block';
        formSection.style.opacity = '0';
        formSection.classList.remove('hidden');
        
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
            formSection.style.opacity = '1';
            
            // Just fade out glyph without moving it
            alienGlyph.style.opacity = '0';
            alienGlyph.style.transform = 'scale(0.8)'; // Remove the translate
        });
        
        // Clean up glyph after fade
        setTimeout(() => {
            alienGlyph.style.display = 'none';
        }, 500);
    });

    // Handle Twitter connection
    twitterConnectBtn.addEventListener('click', async () => {
        try {
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
    });
    
    // Handle Twitter callback
    if (window.location.search.includes('code=')) {
        handleTwitterCallback();
    }
    
    // Validate EVM wallet address
    function isValidEVMAddress(address) {
        // Check if it's a valid Ethereum address (0x followed by 40 hex characters)
        const evmRegex = /^0x[a-fA-F0-9]{40}$/;
        return evmRegex.test(address);
    }
    
    // Handle form submission
    walletForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!twitterData) {
            alert('Please connect your Twitter account first');
            return;
        }
        
        const walletAddress = walletInput.value.trim();
        
        if (!walletAddress) {
            alert('Please enter your wallet address');
            return;
        }
        
        // Validate EVM wallet address
        if (!isValidEVMAddress(walletAddress)) {
            alert('Please enter a valid EVM wallet address (0x followed by 40 hex characters)');
            return;
        }
        
        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    twitterAccessToken: twitterData.access_token,
                    twitterId: twitterData.twitterId,
                    twitterUsername: twitterData.twitterUsername
                }),
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Successfully registered!');
                walletForm.reset();
                twitterData = null;
                updateTwitterButtonState(false);
            } else {
                alert(data.error || 'Failed to register. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit form. Please try again.');
        }
    });
    
    // Handle Twitter callback
    async function handleTwitterCallback() {
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
                    twitterData = data;
                    updateTwitterButtonState(true);
                    // Clear the URL parameters
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (error) {
                console.error('Error exchanging code for token:', error);
                alert('Failed to complete Twitter authentication. Please try again.');
            }
        }
    }
    
    // Update Twitter button state
    function updateTwitterButtonState(connected) {
        if (connected) {
            twitterConnectBtn.textContent = 'Linked to X';
            twitterConnectBtn.disabled = true;
            twitterConnectBtn.style.backgroundColor = '#28a745';
        } else {
            twitterConnectBtn.textContent = 'Link X Profile';
            twitterConnectBtn.disabled = false;
            twitterConnectBtn.style.backgroundColor = '#1DA1F2';
        }
    }
}); 