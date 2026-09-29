document.addEventListener('DOMContentLoaded', async () => {
    let token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token');
    let orgId = localStorage.getItem('organizationId');

    if (!token || !orgId) {
        try {
            const rawSession = localStorage.getItem('erp_session');
            if (rawSession) {
                const session = JSON.parse(rawSession);
                if (!token && session.token) token = session.token;
                if (!orgId && session.organizationId) orgId = session.organizationId;
            }
        } catch (e) {
            console.error('Failed to parse erp_session:', e);
        }
    }

    if (token && !localStorage.getItem('accessToken')) {
        localStorage.setItem('accessToken', token);
    }

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // If orgId is missing, retrieve user's organizations
    if (!orgId) {
        try {
            const orgsRes = await fetch('/api/v1/organizations/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (orgsRes.ok) {
                const orgsData = await orgsRes.json();
                const orgList = orgsData.data || [];
                if (orgList.length > 0) {
                    orgId = orgList[0].id;
                    localStorage.setItem('organizationId', orgId);
                }
            }
        } catch (e) {
            console.warn('Could not fetch active organization:', e);
        }
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(orgId ? { 'x-organization-id': orgId } : {})
    };

    // --- 1. Load Existing Organization Settings ---
    try {
        const response = await fetch('/api/v1/auth/me', { headers });
        const result = await response.json();
        
        if (response.ok && result.data) {
            let org = result.data.activeOrganization;
            if (!org && result.data.memberships && result.data.memberships.length > 0) {
                const activeMem = result.data.memberships.find(m => m.organizationId === orgId) || result.data.memberships[0];
                org = activeMem.organization;
            }
            if (org) {
                const currEl = document.getElementById('currency');
                const tzEl = document.getElementById('timezone');
                if (currEl && org.currency) currEl.value = org.currency;
                if (tzEl && org.timezone) tzEl.value = org.timezone;
            }
        }

        // Also check current subscription status
        const statusEl = document.getElementById('current-status');
        if (statusEl && orgId) {
            try {
                const subRes = await fetch('/api/v1/billing/subscription', { headers });
                if (subRes.ok) {
                    const subData = await subRes.json();
                    statusEl.innerText = subData.data?.plan?.name || subData.data?.status || 'Active Plan';
                } else {
                    statusEl.innerText = 'Active (Default)';
                }
            } catch {
                statusEl.innerText = 'Active';
            }
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
            // Try current organization update endpoint first, then settings alias
            let response = await fetch('/api/v1/organizations/current', {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok && response.status === 404) {
                response = await fetch('/api/v1/organization/settings', {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                alert('Settings updated successfully.');
            } else {
                const err = await response.json();
                alert(`Error: ${err.error || 'Failed to update settings'}`);
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