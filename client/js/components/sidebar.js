import { hasPermission } from '../state/store.js';

const menuConfig = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard.html', reqPerm: null }, // Everyone sees
  { label: 'Inventory', icon: '📦', path: '/inventory.html', reqPerm: 'read:inventory' },
  { label: 'Purchasing', icon: '🛒', path: '/purchasing.html', reqPerm: 'read:purchasing' },
  { label: 'Sales', icon: '💼', path: '/sales.html', reqPerm: 'read:sales' },
  { label: 'Expenses', icon: '💳', path: '/expenses.html', reqPerm: 'read:expenses' },
  { label: 'Employees', icon: '👥', path: '/employees.html', reqPerm: 'read:employees' },
  { label: 'Reports', icon: '📈', path: '/reports.html', reqPerm: 'read:reports' },
  { label: 'Audit Logs', icon: '🛡️', path: '/audit.html', reqPerm: 'read:audit' },
  { label: 'General Ledger', icon: '📒', path: '/ledger.html', reqPerm: 'read:accounting' },
  { label: 'Settings', icon: '⚙️', path: '/settings.html', reqPerm: 'manage:system' }
];

export function renderSidebar(activeTab = "dashboard") {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  // Filter menu items based on permissions
  const visibleItems = menuConfig.filter(item => {
    return !item.reqPerm || hasPermission(item.reqPerm);
  });

  // Build sidebar HTML
  const menuItems = visibleItems.map(item => {
    const itemKey = item.path.replace(/\.html$/, '').replace(/^\//, '');
    const isActive = activeTab === itemKey;
    
    return `
      <li>
        <a href="${item.path}" class="sidebar__link ${isActive ? 'sidebar__link--active' : ''}" data-nav="${itemKey}">
          <span class="sidebar__icon">${item.icon}</span>
          <span class="sidebar__link-text">${item.label}</span>
        </a>
      </li>
    `;
  }).join('');

  sidebarContainer.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar__header">
        <span class="sidebar__logo">Enterprise ERP</span>
      </div>
      <nav class="sidebar__nav">
        <ul class="sidebar__nav-list">
          ${menuItems}
        </ul>
      </nav>
    </aside>
  `;
}