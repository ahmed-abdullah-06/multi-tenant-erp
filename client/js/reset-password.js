document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitBtn = document.getElementById('submit-btn');
    const messageBox = document.getElementById('message');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // 1. Client-side validation
        if (password !== confirmPassword) {
            messageBox.style.display = 'block';
            messageBox.style.color = '#ef4444'; // Red error text
            messageBox.innerText = 'Passwords do not match.';
            return;
        }

        // 2. Extract the security token from the URL (e.g., ?token=abc123xyz)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            messageBox.style.display = 'block';
            messageBox.style.color = '#ef4444';
            messageBox.innerText = 'Invalid or missing security token. Please request a new link.';
            return;
        }

        // 3. Set Loading State
        submitBtn.disabled = true;
        submitBtn.innerText = 'Updating...';
        messageBox.style.display = 'none';

        try {
            // 4. Send the new password and token to the backend
            const response = await fetch(`/api/v1/auth/reset-password/${token}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: password })
            });

            const result = await response.json();

            messageBox.style.display = 'block';
            
            if (response.ok) {
                // Success: Show green message and clear the form
                messageBox.style.color = '#10b981'; 
                messageBox.innerText = 'Password updated successfully. You can now log in.';
                form.reset();
            } else {
                // Error: Show red message (e.g., token expired)
                messageBox.style.color = '#ef4444';
                messageBox.innerText = result.error || 'Failed to update password. The link may have expired.';
            }
        } catch (error) {
            messageBox.style.display = 'block';
            messageBox.style.color = '#ef4444';
            messageBox.innerText = 'Network error. Please check your connection.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Update Password';
        }
    });
});