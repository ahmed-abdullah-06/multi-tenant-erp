import { hasPermission } from '../state/store.js';

const menuConfig = [
  { label: 'Dashboard', icon: '📊', path: '#dashboard', section: 'dashboard', reqPerm: null }, // Everyone sees
  { label: 'Inventory', icon: '📦', path: '#inventory', section: 'inventory', reqPerm: 'read:inventory' },
  { label: 'Purchasing', icon: '🛒', path: '#purchasing', section: 'purchasing', reqPerm: 'read:purchasing' },
  { label: 'Sales', icon: '💼', path: '#sales', section: 'sales', reqPerm: 'read:sales' },
  { label: 'Expenses', icon: '💳', path: '#expenses', section: 'expenses', reqPerm: 'read:expenses' },
  { label: 'Employees', icon: '👥', path: '#employees', section: 'employees', reqPerm: 'read:employees' },
  { label: 'Reports', icon: '📈', path: '#reports', section: 'reports', reqPerm: 'read:reports' },
  { label: 'Audit Logs', icon: '🛡️', path: '#audit', section: 'audit', reqPerm: 'read:audit' },
  { label: 'General Ledger', icon: '📒', path: '/ledger.html', section: 'ledger', reqPerm: 'read:accounting' },
  { label: 'Settings', icon: '⚙️', path: '/settings.html', section: 'settings', reqPerm: 'manage:system' }
];

export function renderSidebar(activeTab = "dashboard") {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) {
    console.warn('Sidebar container not found');
    return;
  }

  // Filter menu items based on permissions
  const visibleItems = menuConfig.filter(item => {
    // Dashboard is always visible (reqPerm is null)
    if (!item.reqPerm) return true;
    
    // Check permission for other items
    return hasPermission(item.reqPerm);
  });

  // Build sidebar HTML
  const menuItems = visibleItems.map(item => {
    const isActive = activeTab === item.section;
    
    return `
      <li>
        <a href="${item.path}" class="sidebar__link ${isActive ? 'sidebar__link--active' : ''}" data-nav="${item.section}">
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

  // Auto-close sidebar on mobile when link is clicked
  const sidebar = sidebarContainer.querySelector('.sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const link = e.target.closest('.sidebar__link');
      if (link && window.innerWidth <= 767) {
        const authShell = document.querySelector('.auth-shell');
        const overlay = document.getElementById('sidebar-overlay');
        
        if (authShell) {
          authShell.classList.remove('sidebar-open');
        }
        if (overlay) {
          overlay.style.display = 'none';
        }
        document.body.style.overflow = '';
        
        // Update aria-expanded on toggle button
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
}