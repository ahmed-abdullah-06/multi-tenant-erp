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

    // If orgId is still not found, fetch user's organizations
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'decimal', 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(amount);
    };

    // --- 1. Load Trial Balance ---
    const loadTrialBalance = async () => {
        try {
            // Assumes you mounted the ledger.service.js to this route in your accounting.routes.js
            const response = await fetch('/api/v1/accounting/trial-balance', { headers });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to load trial balance');

            const { accounts, totalDebits, totalCredits, isBalanced } = result.data;

            // Update Header Stats
            document.getElementById('total-debits').innerText = formatCurrency(totalDebits);
            document.getElementById('total-credits').innerText = formatCurrency(totalCredits);

            const statusBadge = document.getElementById('balance-status');
            if (isBalanced) {
                statusBadge.innerText = 'STATUS: BALANCED';
                statusBadge.className = 'status-indicator status-balanced';
            } else {
                statusBadge.innerText = 'STATUS: UNBALANCED';
                statusBadge.className = 'status-indicator status-unbalanced';
            }

            // Populate Table
            const tbody = document.getElementById('trial-balance-body');
            tbody.innerHTML = '';

            if (accounts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888;">No accounts found.</td></tr>';
                return;
            }

            accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="font-mono">${acc.code}</td>
                    <td>${acc.name}</td>
                    <td><span style="font-size: 0.8rem; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${acc.type}</span></td>
                    <td class="text-right font-mono ${acc.debit > 0 ? 'text-green' : ''}">${acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                    <td class="text-right font-mono ${acc.credit > 0 ? 'text-red' : ''}">${acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            document.getElementById('trial-balance-body').innerHTML = `<tr><td colspan="5" class="text-red">Error loading trial balance: ${error.message}</td></tr>`;
        }
    };

    // --- 2. Load Recent Journal Entries ---
    const loadJournalEntries = async () => {
        try {
            const response = await fetch('/api/v1/accounting/journal-entries?limit=10', { headers });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to load journal entries');

            const tbody = document.getElementById('journal-entries-body');
            tbody.innerHTML = '';

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No recent journal entries.</td></tr>';
                return;
            }

            result.data.forEach(entry => {
                const dateStr = new Date(entry.date).toLocaleDateString();
                // Calculate the total financial impact (sum of all debits on this entry)
                const impact = entry.lines.reduce((sum, line) => sum + parseFloat(line.debit || 0), 0);
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td class="font-mono">${entry.reference || 'SYS-GEN'}</td>
                    <td>${entry.description}</td>
                    <td class="text-right font-mono">${formatCurrency(impact)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error(error);
            document.getElementById('journal-entries-body').innerHTML = `<tr><td colspan="4" class="text-red">Error loading journal entries.</td></tr>`;
        }
    };

    // Initialize Dashboard
    loadTrialBalance();
    loadJournalEntries();

    // Button Listener stub
    document.getElementById('btn-new-entry').addEventListener('click', () => {
        alert('This would open a modal to manually debit/credit accounts. In an ERP, most journal entries are generated automatically by the Purchasing and Sales modules.');
    });
});