import { getToken, getOrganizationId } from './state/store.js';
import { ui } from './ui.js';

let socket = null;

export function initClientSocket(onStockUpdate = null) {
  if (socket && socket.connected) return socket;
  if (typeof window.io === 'undefined') {
    return null;
  }

  const token = getToken();
  const tenantId = getOrganizationId();

  if (!token || !tenantId) return null;

  try {
    socket = window.io({
      auth: { token, tenantId },
      query: { token, tenantId },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Real-time WebSocket connected for tenant:', tenantId);
    });

    socket.on('stock:low', (data) => {
      ui.showToast(`Low Stock Alert: ${data.productName || 'Product'} is down to ${data.stock} units!`, 'error');
      if (typeof onStockUpdate === 'function') onStockUpdate(data);
    });

    socket.on('stock:conflict', (data) => {
      ui.showToast(`Conflict: Another session modified this stock. Refreshed with latest data.`, 'error');
      if (typeof onStockUpdate === 'function') onStockUpdate(data);
    });

    socket.on('stock:updated', (data) => {
      if (typeof onStockUpdate === 'function') onStockUpdate(data);
    });

    socket.on('sales:order_fulfilled', (data) => {
      ui.showToast(`Sales Order #${data.orderNumber} fulfilled and invoice generated.`, 'info');
      if (typeof onStockUpdate === 'function') onStockUpdate(data);
    });

    socket.on('new-notification', (notif) => {
      ui.showToast(`${notif.title}: ${notif.message}`, notif.type === 'ERROR' ? 'error' : 'info');
    });

    return socket;
  } catch (err) {
    console.warn('Could not initialize WebSocket client:', err);
    return null;
  }
}
