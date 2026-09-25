document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submit-btn');
    const messageBox = document.getElementById('message');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        if (!email) return;

        // 1. Set Loading State
        submitBtn.disabled = true;
        submitBtn.innerText = 'Processing...';
        messageBox.style.display = 'none';

        try {
            // 2. Send the request to your Node.js backend
            const response = await fetch('/api/v1/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            // 3. Handle the response and update the UI
            messageBox.style.display = 'block';
            
            if (response.ok) {
                // Success: Show a green message
                messageBox.style.color = '#10b981'; // Match the green from your login success message
                messageBox.innerText = 'Recovery link sent! Please check your email.';
                emailInput.value = ''; // Clear the input field
            } else {
                // Error: Show a red message
                messageBox.style.color = '#ef4444';
                messageBox.innerText = result.error || 'Failed to send recovery link.';
            }
        } catch (error) {
            // Network Error
            messageBox.style.display = 'block';
            messageBox.style.color = '#ef4444';
            messageBox.innerText = 'Network error. Please check your connection.';
        } finally {
            // Reset the button
            submitBtn.disabled = false;
            submitBtn.innerText = 'Send Recovery Link';
        }
    });
});