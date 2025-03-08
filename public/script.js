document.addEventListener('DOMContentLoaded', () => {
    const alienGlyph = document.getElementById('alienGlyph');
    const formSection = document.getElementById('formSection');
    const walletForm = document.getElementById('walletForm');

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

    // Handle form submission
    walletForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const walletAddress = document.getElementById('walletAddress').value;
        const twitterLink = document.getElementById('twitterLink').value;

        try {
            const response = await fetch('/api/submit-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ walletAddress, twitterLink }),
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Welcome aboard, human! CARL\'s got your back.');
            } else {
                alert('Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error submitting form. Please try again.');
        }
    });
}); 