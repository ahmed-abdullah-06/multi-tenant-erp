import { apiClient } from './apiClient.js';
import { store } from './store.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!store.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // --- 1. Load Existing Organization Settings ---
    try {
        const response = await apiClient.get('/api/v1/auth/me');
        const result = await response.json();
        
        if (response.ok && result.data) {
            let org = result.data.activeOrganization;
            const orgId = store.getOrganizationId(); 

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

        const statusEl = document.getElementById('current-status');
        if (statusEl) {
            try {
                const subRes = await apiClient.get('/api/v1/billing/subscription');
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
            let response = await apiClient.patch('/api/v1/organizations/current', payload);

            if (!response.ok && response.status === 404) {
                response = await apiClient.patch('/api/v1/organization/settings', payload);
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
                const response = await apiClient.post('/api/v1/billing/checkout', {
                    planId: planId,
                    successUrl: `${window.location.origin}/settings.html?checkout=success`,
                    cancelUrl: `${window.location.origin}/settings.html?checkout=canceled`
                });

                const result = await response.json();

                if (response.ok && result.data.url) {
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