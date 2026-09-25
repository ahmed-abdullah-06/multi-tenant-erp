document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    // --- 1. Load Inventory Data ---
    const loadInventory = async () => {
        try {
            // Assuming your GET /api/v1/inventory endpoint includes the inventoryBalances array
            const response = await fetch('/api/v1/inventory', { headers });
            const result = await response.json();

            const tbody = document.getElementById('inventory-body');
            tbody.innerHTML = '';

            if (!response.ok) throw new Error(result.error || 'Failed to load data');
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">No products found.</td></tr>';
                return;
            }

            result.data.forEach(product => {
                // Get the primary balance record (for simplicity, we grab the first warehouse balance)
                const balance = product.inventoryBalances && product.inventoryBalances.length > 0 
                    ? product.inventoryBalances[0] 
                    : { id: null, quantity: 0, version: 1 };
                
                const isLowStock = balance.quantity <= product.minStockLevel;
                const statusHtml = isLowStock 
                    ? `<span class="status status-low">LOW STOCK</span>` 
                    : `<span class="status status-ok">HEALTHY</span>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="font-mono" style="color: var(--text-muted);">${product.sku || 'N/A'}</td>
                    <td style="font-weight: 500;">${product.name}</td>
                    <td class="font-mono">${formatCurrency(product.price)}</td>
                    <td class="text-right font-mono" style="font-size: 1.2rem;">${balance.quantity}</td>
                    <td class="text-right">${statusHtml}</td>
                    <td class="text-right" data-permission="inventory:write">
                        ${balance.id ? `<button class="btn-primary btn-small adjust-btn" 
                            data-balance-id="${balance.id}" 
                            data-version="${balance.version}"
                            data-name="${product.name}">Adjust</button>` : 'No Warehouse Link'}
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Re-trigger RBAC to hide the action column for read-only users
            document.dispatchEvent(new Event('DOMContentLoaded'));
            attachAdjustmentListeners();

        } catch (error) {
            console.error(error);
            document.getElementById('inventory-body').innerHTML = `<tr><td colspan="6" style="color: var(--accent-red); text-align: center;">Error loading inventory.</td></tr>`;
        }
    };

    // --- 2. Modal Logic ---
    const modal = document.getElementById('adjustment-modal');
    
    const attachAdjustmentListeners = () => {
        document.querySelectorAll('.adjust-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const balanceId = e.target.getAttribute('data-balance-id');
                const version = e.target.getAttribute('data-version');
                const name = e.target.getAttribute('data-name');

                document.getElementById('modal-title').innerText = `Adjust Stock: ${name}`;
                document.getElementById('modal-balance-id').value = balanceId;
                document.getElementById('modal-current-version').value = version;
                document.getElementById('modal-qty-change').value = '';
                
                modal.style.display = 'flex';
            });
        });
    };

    document.getElementById('btn-close-modal').addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'none';
    });

    // --- 3. Submit Stock Adjustment (Optimistic Locking) ---
    document.getElementById('adjustment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const balanceId = document.getElementById('modal-balance-id').value;
        const currentVersion = parseInt(document.getElementById('modal-current-version').value, 10);
        const quantityChange = parseInt(document.getElementById('modal-qty-change').value, 10);

        try {
            const response = await fetch(`/api/v1/inventory/balances/${balanceId}/stock-safe`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ currentVersion, quantityChange })
            });

            const result = await response.json();

            if (response.ok) {
                modal.style.display = 'none';
                loadInventory(); // Reload to get the new version and quantities
            } else if (response.status === 409) {
                // Optimistic Locking Failure caught!
                alert('Conflict Detected: Another user updated this stock a moment ago. The data has been refreshed. Please try again.');
                modal.style.display = 'none';
                loadInventory();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            alert('A network error occurred.');
        }
    });

    // Initialize
    loadInventory();
});