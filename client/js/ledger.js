import { apiClient } from './apiClient.js';
import { store } from './store.js';
import { ui } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (!store.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    let orgCurrency = 'USD';
    const formatCurrency = (amount, curr = orgCurrency) => {
        try {
            return new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: curr || 'USD',
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }).format(amount);
        } catch {
            return `${curr || 'USD'} ${parseFloat(amount || 0).toFixed(2)}`;
        }
    };

    // --- 1. Load Trial Balance ---
    const loadTrialBalance = async () => {
        const tbody = document.getElementById('trial-balance-body');
        if (tbody) {
            tbody.innerHTML = Array(4).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><span class="skeleton skeleton-text" style="width: 50px;"></span></td>
                    <td><span class="skeleton skeleton-text" style="width: 140px;"></span></td>
                    <td><span class="skeleton skeleton-badge"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-text" style="width: 60px; margin-left: auto;"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-text" style="width: 60px; margin-left: auto;"></span></td>
                </tr>
            `).join('');
        }

        try {
            const response = await apiClient.get('/api/v1/accounting/trial-balance');
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to load trial balance');

            if (result.data.currency) {
                orgCurrency = result.data.currency;
            }

            const { accounts, totalDebits, totalCredits, isBalanced } = result.data;

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

            if (tbody) tbody.innerHTML = '';

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
        const tbody = document.getElementById('journal-entries-body');
        if (tbody) {
            tbody.innerHTML = Array(3).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><span class="skeleton skeleton-text" style="width: 70px;"></span></td>
                    <td><span class="skeleton skeleton-text" style="width: 80px;"></span></td>
                    <td><span class="skeleton skeleton-text" style="width: 180px;"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-text" style="width: 70px; margin-left: auto;"></span></td>
                </tr>
            `).join('');
        }

        try {
            const response = await apiClient.get('/api/v1/accounting/journal-entries?limit=10');
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to load journal entries');

            if (tbody) tbody.innerHTML = '';

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No recent journal entries.</td></tr>';
                return;
            }

            result.data.forEach(entry => {
                const dateStr = new Date(entry.date).toLocaleDateString();
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

    loadTrialBalance();
    loadJournalEntries();

    document.getElementById('btn-new-entry').addEventListener('click', () => {
        ui.showToast('This would open a modal to manually debit/credit accounts. In an ERP, most journal entries are generated automatically by the Purchasing and Sales modules.', 'info');
    });
});