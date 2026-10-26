import { apiClient } from './apiClient.js';
import { store } from './store.js';
import { ui } from './ui.js';
import { initClientSocket } from './socket.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Centralized auth check
    if (!store.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    // --- 1. Load Inventory Data ---
    const loadInventory = async () => {
        const tbody = document.getElementById('inventory-body');
        if (tbody && tbody.children.length === 0) {
            tbody.innerHTML = Array(4).fill(0).map(() => `
                <tr class="skeleton-row">
                    <td><span class="skeleton skeleton-text" style="width: 80px;"></span></td>
                    <td><span class="skeleton skeleton-text" style="width: 160px;"></span></td>
                    <td><span class="skeleton skeleton-text" style="width: 70px;"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-text" style="width: 40px; margin-left: auto;"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-badge" style="margin-left: auto;"></span></td>
                    <td class="text-right"><span class="skeleton skeleton-text" style="width: 60px; margin-left: auto;"></span></td>
                </tr>
            `).join('');
        }

        try {
            const response = await apiClient.get('/api/v1/inventory');
            const result = await response.json();

            if (tbody) tbody.innerHTML = '';

            if (!response.ok) throw new Error(result.error || 'Failed to load data');
            
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">No products found.</td></tr>';
                return;
            }

            result.data.forEach(product => {
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
            const response = await apiClient.patch(`/api/v1/inventory/balances/${balanceId}/stock-safe`, {
                currentVersion, 
                quantityChange
            });

            const result = await response.json();

            if (response.ok) {
                ui.showToast('Stock adjusted successfully.', 'success');
                modal.style.display = 'none';
                loadInventory(); 
            } else if (response.status === 409) {
                ui.showToast('Conflict Detected: Another user updated this stock a moment ago. The data has been refreshed. Please try again.', 'error');
                modal.style.display = 'none';
                loadInventory();
            } else {
                ui.showToast(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            ui.showToast('A network error occurred.', 'error');
        }
    });

    // --- 4. Add Product Handler ---
    const addProductBtn = document.querySelector('.header-flex .btn-primary[data-permission="inventory:write"]');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', async () => {
            const name = await ui.showPrompt('Product Name:');
            if (!name) return;
            const priceStr = await ui.showPrompt('Price (USD):', '19.99');
            if (!priceStr) return;
            const stockStr = await ui.showPrompt('Initial Stock:', '25');
            if (!stockStr) return;
            const sku = await ui.showPrompt('SKU code (optional):', 'PRD-' + Math.floor(Math.random() * 9000 + 1000));
            try {
                const response = await apiClient.post('/api/v1/inventory', {
                    name,
                    price: parseFloat(priceStr),
                    stock: parseInt(stockStr, 10),
                    sku: sku || undefined
                });
                const result = await response.json();
                if (response.ok) {
                    ui.showToast('Product created successfully', 'success');
                    loadInventory();
                } else {
                    ui.showToast(result.error || 'Failed to create product', 'error');
                }
            } catch (err) {
                ui.showToast(err.message || 'Failed to create product', 'error');
            }
        });
    }

    loadInventory();
    initClientSocket(() => {
        loadInventory();
    });
});