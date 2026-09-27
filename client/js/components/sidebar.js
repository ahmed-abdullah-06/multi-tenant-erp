import { hasPermission } from '../state/store.js';
export function renderSidebar(activeTab = "dashboard") {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  sidebarContainer.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar__header">
        <span class="sidebar__logo">Enterprise ERP</span>
      </div>
      <nav class="sidebar__nav">
        <ul class="sidebar__nav-list">
          <li>
            <a href="/dashboard.html" class="sidebar__link ${activeTab === 'dashboard' ? 'sidebar__link--active' : ''}">
              <span class="sidebar__icon">📊</span>
              <span class="sidebar__link-text">Dashboard</span>
            </a>
          </li>
          <li>
            <a href="#inventory" class="sidebar__link ${activeTab === 'inventory' ? 'sidebar__link--active' : ''}" data-nav="inventory">
              <span class="sidebar__icon">📦</span>
              <span class="sidebar__link-text">Inventory</span>
            </a>
          </li>
          <li>
            <a href="#purchasing" class="sidebar__link ${activeTab === 'purchasing' ? 'sidebar__link--active' : ''}" data-nav="purchasing">
              <span class="sidebar__icon">🛒</span>
              <span class="sidebar__link-text">Purchasing</span>
            </a>
          </li>
          <li>
            <a href="#sales" class="sidebar__link ${activeTab === 'sales' ? 'sidebar__link--active' : ''}" data-nav="sales">
              <span class="sidebar__icon">💼</span>
              <span class="sidebar__link-text">Sales & Invoices</span>
            </a>
          </li>
          <li>
            <a href="#expenses" class="sidebar__link ${activeTab === 'expenses' ? 'sidebar__link--active' : ''}" data-nav="expenses">
              <span class="sidebar__icon">💳</span>
              <span class="sidebar__link-text">Expenses</span>
            </a>
          </li>
          <li>
            <a href="#employees" class="sidebar__link ${activeTab === 'employees' ? 'sidebar__link--active' : ''}" data-nav="employees">
              <span class="sidebar__icon">👥</span>
              <span class="sidebar__link-text">Employees</span>
            </a>
          </li>
          <li>
            <a href="#reports" class="sidebar__link ${activeTab === 'reports' ? 'sidebar__link--active' : ''}" data-nav="reports">
              <span class="sidebar__icon">📈</span>
              <span class="sidebar__link-text">Reports</span>
            </a>
          </li>
          <li>
            <a href="#audit" class="sidebar__link ${activeTab === 'audit' ? 'sidebar__link--active' : ''}" data-nav="audit">
              <span class="sidebar__icon">🛡️</span>
              <span class="sidebar__link-text">Audit Logs</span>
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  `;
}

const menuConfig = [
  { label: 'Dashboard', icon: 'layout', path: '/dashboard', reqPerm: null }, // Everyone sees
  { label: 'Sales', icon: 'shopping-cart', path: '/sales', reqPerm: 'read:sales' },
  { label: 'Inventory', icon: 'box', path: '/inventory', reqPerm: 'read:inventory' },
  { label: 'General Ledger', icon: 'book', path: '/accounting', reqPerm: 'read:accounting' },
  { label: 'System Config', icon: 'settings', path: '/settings', reqPerm: 'manage:system' }
];

export const renderSidebar = () => {
  const sidebarContainer = document.getElementById('sidebar-menu');
  sidebarContainer.innerHTML = '';

  menuConfig.forEach(item => {
    // Skip rendering if the user lacks the required permission
    if (item.reqPerm && !hasPermission(item.reqPerm)) return;

    // Apply the cyberpunk glassmorphism aesthetic to the active items
    const menuItem = document.createElement('a');
    menuItem.href = item.path;
    menuItem.className = `
      flex items-center gap-3 p-3 mb-2 rounded-lg transition-all duration-300
      text-gray-300 hover:text-red-400 hover:bg-white/5 
      border border-transparent hover:border-red-500/30 shadow-[0_0_10px_rgba(255,0,0,0)] hover:shadow-[0_0_15px_rgba(255,0,0,0.2)]
    `;
    menuItem.innerHTML = `<i data-lucide="${item.icon}"></i> <span>${item.label}</span>`;
    sidebarContainer.appendChild(menuItem);
  });

  // Re-initialize icons if using lucide-icons or similar
  lucide.createIcons();
};