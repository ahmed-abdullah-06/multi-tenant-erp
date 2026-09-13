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
