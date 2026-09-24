document.addEventListener('DOMContentLoaded', async () => {
    // Retrieve the session token established during login
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // --- 1. Load Existing Organization Settings ---
    try {
        const response = await fetch('/api/v1/auth/me', { headers });
        const result = await response.json();
        
        if (response.ok && result.data.activeOrganization) {
            const org = result.data.activeOrganization;
            document.getElementById('currency').value = org.currency || 'USD';
            document.getElementById('timezone').value = org.timezone || 'UTC';
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
    }

    // --- 2. Handle Settings Form Submission ---
    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            currency: document.getElementById('currency').value,
            timezone: document.getElementById('timezone').value
        };

        try {
            const response = await fetch('/api/v1/organization/settings', {
                method: 'PATCH', // Assuming a PATCH endpoint exists for org updates
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Settings updated successfully.');
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
            }
        } catch (error) {
            alert('A network error occurred while saving.');
        }
    });

    // --- 3. Handle Stripe Checkout Redirection ---
    const subscribeButtons = document.querySelectorAll('.subscribe-btn');
    
    subscribeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const planId = e.target.getAttribute('data-plan-id');
            e.target.innerText = 'Processing...';
            e.target.disabled = true;

            try {
                const response = await fetch('/api/v1/billing/checkout', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        planId: planId,
                        successUrl: `${window.location.origin}/settings.html?checkout=success`,
                        cancelUrl: `${window.location.origin}/settings.html?checkout=canceled`
                    })
                });

                const result = await response.json();

                if (response.ok && result.data.url) {
                    // Redirect the user directly to the secure Stripe hosted checkout
                    window.location.href = result.data.url;
                } else {
                    alert(`Checkout failed: ${result.error?.message || 'Unknown error'}`);
                    e.target.innerText = 'Subscribe';
                    e.target.disabled = false;
                }
            } catch (error) {
                console.error('Checkout error:', error);
                alert('Failed to initialize checkout.');
                e.target.innerText = 'Subscribe';
                e.target.disabled = false;
            }
        });
    });
});