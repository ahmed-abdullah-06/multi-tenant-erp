import { requireAuthGuard } from "../auth/authGuard.js";
import apiClient from "../api/apiClient.js";
import { renderSidebar } from "../components/sidebar.js";
import { renderNavbar } from "../components/navbar.js";
import { getAccess, hasPermission } from '../state/store.js';
import { ui } from "../ui.js";
import { initClientSocket } from "../socket.js";

const dashboardCharts = {};

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuthGuard()) return;

  let currentUser = null;
  try {
    const meRes = await apiClient("/auth/me");
    currentUser = meRes.data;
  } catch (err) {
    console.warn("Auth check failed, redirecting to login:", err.message);
    window.location.href = "/login.html";
    return;
  }

  await renderNavbar(currentUser);

  // Router dispatcher
  function handleHashChange() {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    renderSidebar(hash);
    renderView(hash);
  }

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange();

  initClientSocket(() => {
    // Only refresh active view when a relevant real-time event triggers
    const currentHash = window.location.hash.replace("#", "") || "dashboard";
    if (['dashboard', 'inventory', 'sales'].includes(currentHash)) {
      renderView(currentHash);
    }
  });
});

function renderSkeletonLayout(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div class="skeleton skeleton-title" style="height: 28px; width: 220px; margin-bottom: 8px;"></div>
      <div class="skeleton skeleton-text" style="width: 340px; height: 14px;"></div>
    </div>

    <div class="skeleton-grid">
      ${Array(4).fill(0).map(() => `
        <div class="skeleton-metric-card">
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
          <div class="skeleton skeleton-val"></div>
          <div class="skeleton skeleton-sub"></div>
        </div>
      `).join('')}
    </div>

    <div class="data-card" style="margin-top: 1.5rem;">
      <div style="padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
        <div class="skeleton skeleton-title" style="width: 180px; margin: 0;"></div>
        <div class="skeleton skeleton-badge"></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th><span class="skeleton skeleton-text" style="width: 60px;"></span></th>
              <th><span class="skeleton skeleton-text" style="width: 120px;"></span></th>
              <th><span class="skeleton skeleton-text" style="width: 80px;"></span></th>
              <th><span class="skeleton skeleton-text" style="width: 70px;"></span></th>
              <th><span class="skeleton skeleton-text" style="width: 90px;"></span></th>
            </tr>
          </thead>
          <tbody>
            ${Array(5).fill(0).map(() => `
              <tr class="skeleton-row">
                <td><span class="skeleton skeleton-text" style="width: 70px;"></span></td>
                <td><span class="skeleton skeleton-text" style="width: 140px;"></span></td>
                <td><span class="skeleton skeleton-text" style="width: 80px;"></span></td>
                <td><span class="skeleton skeleton-badge"></span></td>
                <td><span class="skeleton skeleton-text" style="width: 60px;"></span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderView(viewName) {
  const container = document.getElementById("view-container");
  renderSkeletonLayout(container);

  try {
    switch (viewName) {
      case "dashboard":
        await renderDashboardOverview(container);
        break;
      case "inventory":
        await renderInventoryView(container);
        break;
      case "purchasing":
        await renderPurchasingView(container);
        break;
      case "sales":
        await renderSalesView(container);
        break;
      case "expenses":
        await renderExpensesView(container);
        break;
      case "employees":
        await renderEmployeesView(container);
        break;
      case "reports":
        await renderReportsView(container);
        break;
      case "audit":
        await renderAuditView(container);
        break;
      case "ledger":
        await renderLedgerView(container);
        break;
      case "settings":
        await renderSettingsView(container);
        break;
      default:
        container.innerHTML = `<h3>View not found</h3>`;
    }
  } catch (err) {
    container.innerHTML = `
      <div class="alert-box alert-error" style="display: block;">
        Error loading view: ${err.message}
      </div>
    `;
  }
}

// ---------------- DASHBOARD OVERVIEW ----------------
async function renderDashboardOverview(container) {
  const res = await apiClient("/reports/dashboard");
  const data = res.data || {};

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h1 style="font-size: 1.8rem; font-weight: 700; color: #0f172a;">Executive Overview</h1>
      <p style="color: #64748b; font-size: 0.95rem;">Real-time performance across your active tenant organization</p>
    </div>

    <div class="dashboard-metrics">
      <div class="metric-card">
        <div class="metric-card__title">Total Revenue</div>
        <div class="metric-card__value">$${(data.sales?.totalRevenue || 0).toLocaleString()}</div>
        <div class="metric-card__subtitle">From paid invoices</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__title">Net Profit</div>
        <div class="metric-card__value" style="color: ${(data.financials?.netProfit || 0) >= 0 ? '#10b981' : '#ef4444'};">
          $${(data.financials?.netProfit || 0).toLocaleString()}
        </div>
        <div class="metric-card__subtitle">Revenue minus expenses</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__title">Active Products</div>
        <div class="metric-card__value">${data.products?.total || 0}</div>
        <div class="metric-card__subtitle" style="color: #f59e0b;">${data.products?.lowStock || 0} low stock items</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__title">Sales Orders</div>
        <div class="metric-card__value">${data.sales?.totalOrders || 0}</div>
        <div class="metric-card__subtitle">${data.sales?.pendingInvoices || 0} pending invoices</div>
      </div>
    </div>

    <div class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Quick Actions</span>
      </div>
      <div style="padding: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="#inventory" class="btn btn-primary">+ Add Product</a>
        <a href="#purchasing" class="btn btn-secondary">+ New Purchase Order</a>
        <a href="#sales" class="btn btn-secondary">+ Create Sales Order</a>
        <a href="#expenses" class="btn btn-secondary">+ Record Expense</a>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
      <div class="data-card">
        <div class="data-card__header">
          <span class="data-card__title">Revenue Trend</span>
        </div>
        <div style="padding: 1.5rem; position: relative; height: 280px;">
          <canvas id="revenueChart" aria-label="Revenue trend chart"></canvas>
        </div>
      </div>
      <div class="data-card">
        <div class="data-card__header">
          <span class="data-card__title">Expense Breakdown</span>
        </div>
        <div style="padding: 1.5rem; position: relative; height: 280px;">
          <canvas id="expenseChart" aria-label="Expense breakdown chart"></canvas>
        </div>
      </div>
    </div>
  `;

  renderDashboardCharts(data);
}

function renderDashboardCharts(data) {
  if (typeof window.Chart === "undefined") {
    ui.showToast("Dashboard charts could not be loaded.", "error");
    return;
  }

  Object.values(dashboardCharts).forEach((chart) => chart.destroy());

  const revenueData = data.revenueData || [];
  const expenseCategories = data.expenseCategories || [];
  const revenueCanvas = document.getElementById("revenueChart");
  const expenseCanvas = document.getElementById("expenseChart");

  dashboardCharts.revenue = new window.Chart(revenueCanvas, {
    type: "line",
    data: {
      labels: revenueData.map((item) => item.date),
      datasets: [{
        label: "Revenue",
        data: revenueData.map((item) => item.amount),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });

  dashboardCharts.expense = new window.Chart(expenseCanvas, {
    type: "doughnut",
    data: {
      labels: expenseCategories.map((item) => item.name),
      datasets: [{
        data: expenseCategories.map((item) => item.total),
        backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#14b8a6", "#64748b"]
      }]
    },
    options: {
      maintainAspectRatio: false,
      responsive: true
    }
  });
}

// ---------------- INVENTORY VIEW ----------------
async function renderInventoryView(container) {
  const res = await apiClient("/inventory");
  const products = res.data || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">Inventory Catalog</h1>
        <p style="color: #64748b;">Manage products, SKU tracking, and real-time stock levels</p>
      </div>
      <button id="add-product-btn" class="btn btn-primary">+ New Product</button>
    </div>

    <div class="data-card">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No products in this organization yet.</td></tr>` : ''}
            ${products.map(p => `
              <tr>
                <td><strong>${p.sku || "N/A"}</strong></td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td><span style="font-weight: 600; color: ${p.stock <= 10 ? '#ef4444' : '#1e293b'}">${p.stock}</span></td>
                <td>
                  <span class="badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}">
                    ${p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary adjust-stock-btn" data-id="${p.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Adjust Stock</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("add-product-btn")?.addEventListener("click", async () => {
    const name = await ui.showPrompt("Product Name:");
    if (!name) return;
    const priceStr = await ui.showPrompt("Price (USD):", "19.99");
    const stockStr = await ui.showPrompt("Initial Stock:", "25");
    const sku = await ui.showPrompt("SKU code (optional):", "PRD-" + Math.floor(Math.random() * 9000 + 1000));

    try {
      await apiClient("/inventory", {
        method: "POST",
        body: JSON.stringify({
          name,
          price: parseFloat(priceStr) || 0,
          stock: parseInt(stockStr, 10) || 0,
          sku
        })
      });
      renderInventoryView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to create product", "error");
    }
  });

  container.querySelectorAll(".adjust-stock-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const changeStr = await ui.showPrompt("Enter stock change amount (e.g. +10 or -5):");
      if (!changeStr) return;
      const quantityChange = parseInt(changeStr, 10);
      if (isNaN(quantityChange) || quantityChange === 0) {
        ui.showToast("Invalid integer quantity change", "error");
        return;
      }
      try {
        await apiClient(`/inventory/${id}/stock`, {
          method: "PATCH",
          body: JSON.stringify({ quantityChange })
        });
        renderInventoryView(container);
      } catch (err) {
        ui.showToast(err.message || "Failed to adjust stock", "error");
      }
    });
  });
}

// ---------------- PURCHASING VIEW ----------------
async function renderPurchasingView(container) {
  const [poRes, supRes] = await Promise.all([
    apiClient("/purchasing/orders"),
    apiClient("/purchasing/suppliers")
  ]);

  const orders = poRes.data || [];
  const suppliers = supRes.data || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">Purchasing & Suppliers</h1>
        <p style="color: #64748b;">Manage procurement, purchase orders, and stock receipts</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button id="add-supplier-btn" class="btn btn-secondary">+ New Supplier</button>
        <button id="create-po-btn" class="btn btn-primary">+ New PO</button>
      </div>
    </div>

    <div class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Purchase Orders</span>
      </div>
      <div class="data-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No purchase orders recorded yet.</td></tr>` : ''}
            ${orders.map(o => `
              <tr>
                <td><strong>${o.orderNumber}</strong></td>
                <td>${o.supplier?.name || "N/A"}</td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>$${o.totalAmount.toFixed(2)}</td>
                <td>
                  <span class="badge ${o.status === 'RECEIVED' ? 'badge-success' : o.status === 'ISSUED' ? 'badge-info' : 'badge-warning'}">
                    ${o.status}
                  </span>
                </td>
                <td>
                  ${o.status === 'ISSUED' ? `
                    <button class="btn btn-primary receive-po-btn" data-id="${o.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Receive Stock</button>
                  ` : `<span style="color: #94a3b8; font-size: 0.8rem;">Completed</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("add-supplier-btn")?.addEventListener("click", async () => {
    const name = await ui.showPrompt("Supplier Name:");
    if (!name) return;
    const email = await ui.showPrompt("Supplier Email:");
    try {
      await apiClient("/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify({ name, email })
      });
      renderPurchasingView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to create supplier", "error");
    }
  });

  document.getElementById("create-po-btn")?.addEventListener("click", async () => {
    if (suppliers.length === 0) {
      ui.showToast("Please create at least one supplier first.", "error");
      return;
    }
    const productsRes = await apiClient("/inventory");
    const products = productsRes.data || [];
    if (products.length === 0) {
      ui.showToast("Please add products to inventory before issuing a purchase order.", "error");
      return;
    }

    const supplier = suppliers[0];
    const product = products[0];
    const quantityStr = await ui.showPrompt(`Order quantity for ${product.name} (Supplier: ${supplier.name}):`, "50");
    if (!quantityStr) return;

    try {
      await apiClient("/purchasing/orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: supplier.id,
          items: [{
            productId: product.id,
            quantity: parseInt(quantityStr, 10) || 10,
            unitPrice: product.price * 0.7
          }]
        })
      });
      renderPurchasingView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to create PO", "error");
    }
  });

  container.querySelectorAll(".receive-po-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (await ui.showConfirm("Receive this purchase order and increment stock levels?")) {
        try {
          await apiClient(`/purchasing/orders/${id}/receive`, {
            method: "POST",
            body: JSON.stringify({ notes: "Received full shipment at warehouse" })
          });
          renderPurchasingView(container);
        } catch (err) {
          ui.showToast(err.message || "Failed to receive PO", "error");
        }
      }
    });
  });
}

// ---------------- SALES VIEW ----------------
async function renderSalesView(container) {
  const [soRes, invRes] = await Promise.all([
    apiClient("/sales/orders"),
    apiClient("/sales/invoices")
  ]);

  const orders = soRes.data || [];
  const invoices = invRes.data || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">Sales & Invoicing</h1>
        <p style="color: #64748b;">Customer orders, inventory fulfillment, and automated invoice billing</p>
      </div>
      <button id="create-so-btn" class="btn btn-primary">+ New Sales Order</button>
    </div>

    <div class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Sales Orders</span>
      </div>
      <div class="data-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${orders.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No sales orders yet.</td></tr>` : ''}
            ${orders.map(o => `
              <tr>
                <td><strong>${o.orderNumber}</strong></td>
                <td>${o.customer?.name || "Walk-in"}</td>
                <td>${new Date(o.createdAt).toLocaleDateString()}</td>
                <td>$${o.totalAmount.toFixed(2)}</td>
                <td>
                  <span class="badge ${o.status === 'SHIPPED' ? 'badge-success' : 'badge-warning'}">
                    ${o.status}
                  </span>
                </td>
                <td>
                  ${o.status === 'PENDING' ? `
                    <button class="btn btn-primary fulfill-so-btn" data-id="${o.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Fulfill & Ship</button>
                  ` : `<span style="color: #94a3b8; font-size: 0.8rem;">Fulfilled</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Invoices & Payments</span>
      </div>
      <div class="data-table-wrapper" style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No invoices generated yet.</td></tr>` : ''}
            ${invoices.map(inv => `
              <tr>
                <td><strong>${inv.invoiceNumber}</strong></td>
                <td>${inv.customer?.name || "Customer"}</td>
                <td>$${inv.totalAmount.toFixed(2)}</td>
                <td>$${inv.paidAmount.toFixed(2)}</td>
                <td>
                  <span class="badge ${inv.status === 'PAID' ? 'badge-success' : 'badge-warning'}">
                    ${inv.status}
                  </span>
                </td>
                <td>
                  ${inv.status !== 'PAID' ? `
                    <button class="btn btn-secondary pay-inv-btn" data-id="${inv.id}" data-due="${inv.totalAmount - inv.paidAmount}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Record Payment</button>
                  ` : `<span style="color: #166534; font-size: 0.8rem;">Settled</span>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("create-so-btn")?.addEventListener("click", async () => {
    // Ensure customer and product exist
    let custRes = await apiClient("/sales/customers");
    let customers = custRes.data || [];
    if (customers.length === 0) {
      const cName = await ui.showPrompt("Enter customer name to create initial client:", "Acme Corp");
      if (!cName) return;
      const newCust = await apiClient("/sales/customers", {
        method: "POST",
        body: JSON.stringify({ name: cName, email: "contact@acme.test" })
      });
      customers = [newCust.data];
    }

    const prodRes = await apiClient("/inventory");
    const prods = prodRes.data || [];
    if (prods.length === 0) {
      ui.showToast("Please add products in Inventory first.", "error");
      return;
    }

    const prod = prods[0];
    const qtyStr = await ui.showPrompt(`Sell quantity for ${prod.name} (Stock: ${prod.stock}):`, "2");
    if (!qtyStr) return;

    try {
      await apiClient("/sales/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: customers[0].id,
          items: [{
            productId: prod.id,
            quantity: parseInt(qtyStr, 10) || 1,
            unitPrice: prod.price
          }]
        })
      });
      renderSalesView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to create sales order", "error");
    }
  });

  container.querySelectorAll(".fulfill-so-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (await ui.showConfirm("Fulfill sales order? This will deduct warehouse stock and generate an invoice.")) {
        try {
          await apiClient(`/sales/orders/${id}/fulfill`, {
            method: "POST",
            body: JSON.stringify({})
          });
          renderSalesView(container);
        } catch (err) {
          ui.showToast(err.message || "Failed to fulfill sales order", "error");
        }
      }
    });
  });

  container.querySelectorAll(".pay-inv-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const due = parseFloat(e.currentTarget.dataset.due);
      const amountStr = await ui.showPrompt(`Enter payment amount (Outstanding: $${due.toFixed(2)}):`, due.toString());
      if (!amountStr) return;
      try {
        await apiClient(`/sales/invoices/${id}/payments`, {
          method: "POST",
          body: JSON.stringify({
            amount: parseFloat(amountStr),
            paymentMethod: "CREDIT_CARD",
            reference: "PAY-" + Date.now()
          })
        });
        renderSalesView(container);
      } catch (err) {
        ui.showToast(err.message || "Failed to record payment", "error");
      }
    });
  });
}

// ---------------- EXPENSES VIEW ----------------
async function renderExpensesView(container) {
  const res = await apiClient("/expenses");
  const expenses = res.data || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">Expense Tracking</h1>
        <p style="color: #64748b;">Record organizational outlays, vendor payments, and operational costs</p>
      </div>
      <button id="record-expense-btn" class="btn btn-primary">+ Record Expense</button>
    </div>

    <div class="data-card">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payee</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No expenses recorded yet.</td></tr>` : ''}
            ${expenses.map(exp => `
              <tr>
                <td>${new Date(exp.expenseDate).toLocaleDateString()}</td>
                <td><strong>${exp.payee || "N/A"}</strong></td>
                <td>${exp.description || "General expense"}</td>
                <td>${exp.category?.name || "General"}</td>
                <td style="font-weight: 600; color: #b91c1c;">-$${exp.amount.toFixed(2)}</td>
                <td><span class="badge badge-info">${exp.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("record-expense-btn")?.addEventListener("click", async () => {
    const payee = await ui.showPrompt("Payee / Vendor name:", "AWS Cloud Services");
    if (!payee) return;
    const amountStr = await ui.showPrompt("Amount (USD):", "149.50");
    const desc = await ui.showPrompt("Description:", "Monthly infrastructure hosting");

    try {
      await apiClient("/expenses", {
        method: "POST",
        body: JSON.stringify({
          payee,
          amount: parseFloat(amountStr) || 0,
          description: desc,
          status: "APPROVED"
        })
      });
      renderExpensesView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to record expense", "error");
    }
  });
}

// ---------------- EMPLOYEES VIEW ----------------
async function renderEmployeesView(container) {
  const [empRes, deptRes] = await Promise.all([
    apiClient("/employees"),
    apiClient("/employees/departments")
  ]);

  const employees = empRes.data || [];
  const departments = deptRes.data || [];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">Human Resources</h1>
        <p style="color: #64748b;">Departmental staff, job titles, and personnel roster</p>
      </div>
      <button id="add-employee-btn" class="btn btn-primary">+ Add Employee</button>
    </div>

    <div class="data-card">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${employees.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #64748b;">No employees enrolled yet.</td></tr>` : ''}
            ${employees.map(e => `
              <tr>
                <td><strong>${e.firstName} ${e.lastName}</strong></td>
                <td>${e.email}</td>
                <td>${e.department?.name || "General"}</td>
                <td>${e.jobTitle || "Team Member"}</td>
                <td><span class="badge badge-success">${e.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("add-employee-btn")?.addEventListener("click", async () => {
    const firstName = await ui.showPrompt("First Name:");
    if (!firstName) return;
    const lastName = await ui.showPrompt("Last Name:");
    if (!lastName) return;
    const email = await ui.showPrompt("Email Address:", `${firstName.toLowerCase()}@enterprise.test`);
    const jobTitle = await ui.showPrompt("Job Title:", "Operations Specialist");

    try {
      await apiClient("/employees", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, jobTitle, status: "ACTIVE" })
      });
      renderEmployeesView(container);
    } catch (err) {
      ui.showToast(err.message || "Failed to add employee", "error");
    }
  });
}

// ---------------- REPORTS VIEW ----------------
async function renderReportsView(container) {
  const [salesRes, invRes, expRes] = await Promise.all([
    apiClient("/reports/sales"),
    apiClient("/reports/inventory"),
    apiClient("/reports/expenses")
  ]);

  const sales = salesRes.data || {};
  const inv = invRes.data || {};
  const exp = expRes.data || {};

  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700;">Financial & Operational Reports</h1>
      <p style="color: #64748b;">Tenant aggregated business metrics and valuation statistics</p>
    </div>

    <div class="dashboard-metrics">
      <div class="metric-card">
        <div class="metric-card__title">Total Inventory Valuation</div>
        <div class="metric-card__value">$${(inv.totalAssetValue || 0).toLocaleString()}</div>
        <div class="metric-card__subtitle">${inv.totalStock || 0} items in stock</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__title">Gross Sales Volume</div>
        <div class="metric-card__value">$${(sales.totalRevenue || 0).toLocaleString()}</div>
        <div class="metric-card__subtitle">${sales.totalOrders || 0} lifetime orders</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__title">Cumulative Expenses</div>
        <div class="metric-card__value" style="color: #ef4444;">$${(exp.totalExpenses || 0).toLocaleString()}</div>
        <div class="metric-card__subtitle">All recorded categories</div>
      </div>
    </div>
  `;
}

// ---------------- AUDIT VIEW ----------------
async function renderAuditView(container) {
  const res = await apiClient("/audit");
  const logs = res.data || [];

  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700;">Security & Audit Trail</h1>
      <p style="color: #64748b;">Immutable multi-tenant log of administrative and operational events</p>
    </div>

    <div class="data-card">
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>User</th>
              <th>Changes / Diff</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `<tr><td colspan="6" style="text-align: center; color: #64748b;">No audit events recorded yet.</td></tr>` : ''}
            ${logs.map(log => `
              <tr>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
                <td><span class="badge badge-info">${log.action}</span></td>
                <td><strong>${log.entityType}</strong></td>
                <td>${log.user?.email || "System"}</td>
                <td>
                  ${log.diff ? `
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; font-family: monospace;">
                      ${Object.entries(log.diff).map(([key, change]) => `
                        <span style="background: rgba(255,255,255,0.06); padding: 3px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);">
                          <span style="color: #94a3b8; font-weight: 600;">${key}:</span> 
                          <span style="color: #f87171; text-decoration: line-through;">${JSON.stringify(change.old ?? change.before ?? '-')}</span>
                          <span style="color: #64748b;">&rarr;</span> 
                          <span style="color: #34d399; font-weight: 700;">${JSON.stringify(change.new ?? change.after ?? '-')}</span>
                        </span>
                      `).join('')}
                    </div>
                  ` : '<span style="color: #64748b; font-size: 0.8rem;">-</span>'}
                </td>
                <td><pre style="font-size: 0.75rem; margin: 0; color: #94a3b8;">${JSON.stringify(log.details || {})}</pre></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------------- GENERAL LEDGER VIEW ----------------
async function renderLedgerView(container) {
  const formatCurrency = (amount) => new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 700;">General Ledger</h1>
        <p style="color: #64748b;">Review account balances and recent journal entries</p>
      </div>
      <button class="btn btn-primary" id="btn-new-entry">+ New Journal Entry</button>
    </div>

    <section class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Trial Balance</span>
        <span id="balance-status" class="badge badge-info">Loading balances...</span>
      </div>
      <div class="dashboard-metrics" style="padding: 1rem;">
        <div class="metric-card">
          <div class="metric-card__title">Total Debits</div>
          <div class="metric-card__value" id="total-debits">—</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__title">Total Credits</div>
          <div class="metric-card__value" id="total-credits">—</div>
        </div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Code</th><th>Account Name</th><th>Type</th><th>Debit</th><th>Credit</th></tr>
          </thead>
          <tbody id="trial-balance-body">
            <tr><td colspan="5">Loading accounts...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Recent Journal Entries</span>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Reference</th><th>Description</th><th>Impact</th></tr>
          </thead>
          <tbody id="journal-entries-body">
            <tr><td colspan="4">Loading entries...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  container.querySelector("#btn-new-entry").addEventListener("click", () => {
    ui.showToast("Journal entries are generated automatically from Purchasing and Sales. Contact your administrator.", "info");
  });

  const [balanceResult, entriesResult] = await Promise.all([
    apiClient("/accounting/trial-balance"),
    apiClient("/accounting/journal-entries?limit=10")
  ]);
  const balance = balanceResult.data || {};
  const accounts = balance.accounts || [];
  const entries = entriesResult.data || [];

  container.querySelector("#total-debits").textContent = formatCurrency(balance.totalDebits);
  container.querySelector("#total-credits").textContent = formatCurrency(balance.totalCredits);

  const status = container.querySelector("#balance-status");
  status.textContent = balance.isBalanced ? "Balanced" : "Unbalanced";
  status.className = `badge ${balance.isBalanced ? "badge-success" : "badge-danger"}`;

  const balanceBody = container.querySelector("#trial-balance-body");
  balanceBody.innerHTML = accounts.length
    ? accounts.map(account => `
      <tr>
        <td>${account.code}</td>
        <td>${account.name}</td>
        <td>${account.type}</td>
        <td>${account.debit > 0 ? formatCurrency(account.debit) : "—"}</td>
        <td>${account.credit > 0 ? formatCurrency(account.credit) : "—"}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="5">No accounts found.</td></tr>';

  const entriesBody = container.querySelector("#journal-entries-body");
  entriesBody.innerHTML = entries.length
    ? entries.map(entry => {
      const impact = (entry.lines || []).reduce((sum, line) => sum + Number(line.debit || 0), 0);
      return `
        <tr>
          <td>${new Date(entry.date).toLocaleDateString()}</td>
          <td>${entry.reference || "SYS-GEN"}</td>
          <td>${entry.description}</td>
          <td>${formatCurrency(impact)}</td>
        </tr>
      `;
    }).join("")
    : '<tr><td colspan="4">No recent journal entries.</td></tr>';
}

// ---------------- SETTINGS VIEW ----------------
async function renderSettingsView(container) {
  container.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700;">Organization Settings</h1>
      <p style="color: #64748b;">Manage organization defaults and subscription details</p>
    </div>

    <section class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Localization &amp; Defaults</span>
      </div>
      <form id="settings-form" style="padding: 1.5rem; max-width: 640px;">
        <div class="form-group">
          <label class="form-label" for="currency">Base Currency</label>
          <select class="form-select" id="currency" required>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="PKR">PKR - Pakistani Rupee</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="timezone">Timezone</label>
          <select class="form-select" id="timezone" required>
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (US)</option>
            <option value="Asia/Karachi">Pakistan Standard Time</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Save Settings</button>
        <p id="settings-feedback" role="status" aria-live="polite"></p>
      </form>
    </section>

    <section class="data-card">
      <div class="data-card__header">
        <span class="data-card__title">Subscription Plan</span>
      </div>
      <div style="padding: 1.5rem;">
        <p style="margin-bottom: 1rem;">Current Status: <strong id="current-status">Loading...</strong></p>
        <div class="dashboard-metrics">
          <article class="metric-card">
            <h2>Professional</h2>
            <p>$49 / month</p>
            <ul style="margin: 1rem 0 1rem 1.25rem;">
              <li>Up to 10 Users</li>
              <li>Standard Ledger</li>
              <li>Email Support</li>
            </ul>
            <button class="btn btn-primary subscribe-btn" data-plan-id="plan_pro_123">Subscribe to Pro</button>
          </article>
          <article class="metric-card">
            <h2>Enterprise</h2>
            <p>$199 / month</p>
            <ul style="margin: 1rem 0 1rem 1.25rem;">
              <li>Unlimited Users</li>
              <li>Advanced Idempotency API</li>
              <li>24/7 Priority Support</li>
            </ul>
            <button class="btn btn-primary subscribe-btn" data-plan-id="plan_ent_456">Subscribe to Enterprise</button>
          </article>
        </div>
      </div>
    </section>
  `;

  const feedback = container.querySelector("#settings-feedback");
  const form = container.querySelector("#settings-form");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    feedback.textContent = "";
    feedback.className = "";
    try {
      await apiClient("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({
          currency: container.querySelector("#currency").value,
          timezone: container.querySelector("#timezone").value
        })
      });
      feedback.textContent = "Settings updated successfully.";
      feedback.className = "alert-box alert-success";
    } catch (error) {
      feedback.textContent = `Unable to save settings: ${error.message}`;
      feedback.className = "alert-box alert-error";
      console.error("Failed to save organization settings:", error);
    }
    feedback.style.display = "block";
  });

  try {
    const [organizationResult, subscriptionResult] = await Promise.allSettled([
      apiClient("/organizations/current"),
      apiClient("/billing/subscription")
    ]);

    if (organizationResult.status === "fulfilled") {
      const organization = organizationResult.value.data;
      if (organization?.currency) container.querySelector("#currency").value = organization.currency;
      if (organization?.timezone) container.querySelector("#timezone").value = organization.timezone;
    } else {
      console.error("Failed to load organization settings:", organizationResult.reason);
      feedback.textContent = "Unable to load organization settings.";
      feedback.className = "alert-box alert-error";
      feedback.style.display = "block";
    }

    const currentStatus = container.querySelector("#current-status");
    if (subscriptionResult.status === "fulfilled") {
      const subscription = subscriptionResult.value.data;
      currentStatus.textContent = subscription?.plan?.name || subscription?.status || "Active Plan";
    } else {
      console.error("Failed to load subscription status:", subscriptionResult.reason);
      currentStatus.textContent = "Unavailable";
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }

  container.querySelectorAll(".subscribe-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const planId = button.dataset.planId;
      button.disabled = true;
      button.textContent = "Processing...";
      try {
        const checkout = await apiClient("/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            planId,
            successUrl: `${window.location.origin}/dashboard.html?checkout=success#settings`,
            cancelUrl: `${window.location.origin}/dashboard.html?checkout=canceled#settings`
          })
        });
        if (!checkout.data?.url) throw new Error("Checkout URL was not returned.");
        window.location.href = checkout.data.url;
      } catch (error) {
        ui.showToast(`Checkout failed: ${error.message}`, "error");
        button.disabled = false;
        button.textContent = planId === "plan_pro_123" ? "Subscribe to Pro" : "Subscribe to Enterprise";
        console.error("Failed to start subscription checkout:", error);
      }
    });
  });
}

export const initDashboard = async () => {
  const access = getAccess();
  
  // Set visual role badge
  const roleBadge = document.getElementById('role-badge');
  if (roleBadge) {
    roleBadge.innerText = `[ ACCESS LEVEL: ${access.roleName.toUpperCase()} ]`;
  }
  
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;
  
  grid.innerHTML = '';

  // 1. Admin/Owner Overview Widget
  if (hasPermission('manage:system')) {
    grid.innerHTML += `
      <div class="bg-black/40 border border-red-500/30 p-5 rounded backdrop-blur-md">
        <h3 class="text-red-400 font-mono text-sm mb-2">ORG OVERVIEW</h3>
        <div class="text-2xl text-white" id="metric-revenue">Loading...</div>
      </div>
    `;
    if (typeof fetchAdminMetrics === 'function') {
      fetchAdminMetrics();
    }
  }

  // 2. Inventory Staff Widget
  if (hasPermission('read:inventory')) {
    grid.innerHTML += `
      <div class="bg-black/40 border border-gray-700 p-5 rounded backdrop-blur-md">
        <h3 class="text-gray-400 font-mono text-sm mb-2">LOW STOCK ALERTS</h3>
        <ul id="widget-low-stock" class="space-y-2 text-sm text-gray-300"></ul>
      </div>
    `;
    if (typeof fetchLowStockWidget === 'function') {
      fetchLowStockWidget();
    }
  }

  // 3. Sales Staff Widget
  if (hasPermission('write:sales')) {
    grid.innerHTML += `
      <div class="bg-black/40 border border-gray-700 p-5 rounded backdrop-blur-md flex flex-col justify-center items-center">
        <button class="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/50 rounded hover:bg-red-600/40 transition-all font-mono">
          + NEW TRANSACTION
        </button>
      </div>
    `;
  }
};
