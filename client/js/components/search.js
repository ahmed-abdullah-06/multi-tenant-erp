// Global Search Component
// Provides search functionality across the application

class GlobalSearch {
  constructor() {
    this.searchIndex = [];
    this.isOpen = false;
    this.currentResults = [];
    this.selectedResultIndex = -1;
    this.init();
  }

  init() {
    // Create search modal
    this.createSearchModal();
    
    // Listen for keyboard shortcut (Ctrl+K or Cmd+K)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Listen for search trigger clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-search-trigger]')) {
        e.preventDefault();
        this.open();
      }
    });
  }

  createSearchModal() {
    const modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.className = 'search-modal';
    modal.innerHTML = `
      <div class="search-modal-overlay"></div>
      <div class="search-modal-content">
        <div class="search-modal-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="global-search-input" placeholder="Search products, customers, orders..." autocomplete="off">
          <kbd>ESC</kbd>
        </div>
        <div class="search-modal-results" id="global-search-results">
          <div class="search-results-empty">
            <p>Start typing to search...</p>
            <p class="search-hint">Try: product name, customer, order number</p>
          </div>
        </div>
        <div class="search-modal-footer">
          <div class="search-footer-hints">
            <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .search-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
      }
      .search-modal.active {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }
      .search-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }
      .search-modal-content {
        position: relative;
        width: 100%;
        max-width: 600px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        overflow: hidden;
      }
      .search-modal-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid #334155;
        color: #94a3b8;
      }
      .search-modal-header input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #f8fafc;
        font-size: 1rem;
      }
      .search-modal-header input::placeholder {
        color: #64748b;
      }
      .search-modal-header kbd {
        padding: 4px 8px;
        background: #334155;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.75rem;
        color: #94a3b8;
      }
      .search-modal-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 8px;
      }
      .search-results-empty {
        padding: 40px 20px;
        text-align: center;
        color: #64748b;
      }
      .search-results-empty p {
        margin: 0;
      }
      .search-hint {
        font-size: 0.85rem;
        margin-top: 8px !important;
      }
      .search-result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .search-result-item:hover,
      .search-result-item.selected {
        background: rgba(59, 130, 246, 0.15);
      }
      .search-result-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #334155;
        border-radius: 6px;
        font-size: 0.875rem;
      }
      .search-result-info {
        flex: 1;
        min-width: 0;
      }
      .search-result-title {
        color: #f8fafc;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .search-result-subtitle {
        color: #64748b;
        font-size: 0.85rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .search-result-type {
        color: #94a3b8;
        font-size: 0.75rem;
        padding: 4px 8px;
        background: #334155;
        border-radius: 4px;
      }
      .search-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid #334155;
        background: #0f172a;
      }
      .search-footer-hints {
        display: flex;
        gap: 16px;
        font-size: 0.75rem;
        color: #64748b;
      }
      .search-footer-hints span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .search-footer-hints kbd {
        padding: 2px 6px;
        background: #334155;
        border-radius: 3px;
        font-family: monospace;
      }
      @media (max-width: 768px) {
        .search-modal.active {
          padding-top: 10vh;
        }
        .search-modal-content {
          margin: 0 16px;
        }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Event listeners
    const overlay = modal.querySelector('.search-modal-overlay');
    overlay.addEventListener('click', () => this.close());

    const input = document.getElementById('global-search-input');
    input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  open() {
    this.isOpen = true;
    const modal = document.getElementById('global-search-modal');
    modal.classList.add('active');
    const input = document.getElementById('global-search-input');
    input.value = '';
    input.focus();
    this.showRecentSearches();
  }

  close() {
    this.isOpen = false;
    const modal = document.getElementById('global-search-modal');
    modal.classList.remove('active');
  }

  async handleSearch(query) {
    if (!query || query.length < 2) {
      this.showRecentSearches();
      return;
    }

    try {
      const apiClient = (await import('../api/apiClient.js')).default;
      
      // Search across multiple endpoints
      const [products, customers, orders] = await Promise.allSettled([
        apiClient(`/inventory?search=${encodeURIComponent(query)}&limit=5`),
        apiClient(`/sales/customers?search=${encodeURIComponent(query)}&limit=5`),
        apiClient(`/sales/orders?search=${encodeURIComponent(query)}&limit=5`)
      ]);

      const results = [];

      if (products.status === 'fulfilled' && products.value?.data) {
        products.value.data.forEach(item => {
          results.push({
            type: 'product',
            icon: '📦',
            title: item.name,
            subtitle: `SKU: ${item.sku || 'N/A'} • $${item.price}`,
            url: `#inventory`,
            data: item
          });
        });
      }

      if (customers.status === 'fulfilled' && customers.value?.data) {
        customers.value.data.forEach(item => {
          results.push({
            type: 'customer',
            icon: '👤',
            title: item.name,
            subtitle: item.email || 'No email',
            url: `#sales`,
            data: item
          });
        });
      }

      if (orders.status === 'fulfilled' && orders.value?.data) {
        orders.value.data.forEach(item => {
          results.push({
            type: 'order',
            icon: '📋',
            title: `Order ${item.orderNumber || item.id.slice(0, 8)}`,
            subtitle: `Status: ${item.status} • $${item.totalAmount}`,
            url: `#sales`,
            data: item
          });
        });
      }

      this.currentResults = results;
      this.renderResults(results);
    } catch (error) {
      console.error('Search error:', error);
      this.renderResults([]);
    }
  }

  renderResults(results) {
    const container = document.getElementById('global-search-results');
    
    if (results.length === 0) {
      container.innerHTML = `
        <div class="search-results-empty">
          <p>No results found</p>
          <p class="search-hint">Try a different search term</p>
        </div>
      `;
      return;
    }

    container.innerHTML = results.map((result, index) => `
      <div class="search-result-item ${index === 0 ? 'selected' : ''}" data-index="${index}" data-url="${result.url}">
        <div class="search-result-icon">${result.icon}</div>
        <div class="search-result-info">
          <div class="search-result-title">${result.title}</div>
          <div class="search-result-subtitle">${result.subtitle}</div>
        </div>
        <span class="search-result-type">${result.type}</span>
      </div>
    `).join('');

    this.selectedResultIndex = 0;

    // Add click handlers
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        this.close();
        if (url) {
          window.location.hash = url;
        }
      });
    });
  }

  showRecentSearches() {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const container = document.getElementById('global-search-results');
    
    if (recent.length === 0) {
      container.innerHTML = `
        <div class="search-results-empty">
          <p>Start typing to search...</p>
          <p class="search-hint">Try: product name, customer, order number</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="padding: 8px 12px; color: #64748b; font-size: 0.85rem; font-weight: 500;">Recent Searches</div>
      ${recent.slice(0, 5).map((term, index) => `
        <div class="search-result-item" data-term="${term}">
          <div class="search-result-icon">🔍</div>
          <div class="search-result-info">
            <div class="search-result-title">${term}</div>
          </div>
        </div>
      `).join('')}
    `;

    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const term = item.getAttribute('data-term');
        document.getElementById('global-search-input').value = term;
        this.handleSearch(term);
      });
    });
  }

  handleKeyDown(e) {
    const items = document.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedResultIndex = Math.min(this.selectedResultIndex + 1, items.length - 1);
        this.updateSelection(items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedResultIndex = Math.max(this.selectedResultIndex - 1, 0);
        this.updateSelection(items);
        break;
      case 'Enter':
        e.preventDefault();
        if (items[this.selectedResultIndex]) {
          items[this.selectedResultIndex].click();
        }
        break;
    }
  }

  updateSelection(items) {
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedResultIndex);
      if (index === this.selectedResultIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  saveSearchTerm(term) {
    if (!term) return;
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const filtered = recent.filter(t => t !== term);
    filtered.unshift(term);
    localStorage.setItem('recentSearches', JSON.stringify(filtered.slice(0, 10)));
  }
}

// Create singleton instance
const globalSearch = new GlobalSearch();

export default globalSearch;
