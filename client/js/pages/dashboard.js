import { requireAuthGuard } from "../auth/authGuard.js";
import apiClient from "../api/apiClient.js";
import { renderSidebar } from "../components/sidebar.js";
import { renderNavbar } from "../components/navbar.js";
import { getOrganizationId } from "../state/store.js";

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
});

async function renderView(viewName) {
  const container = document.getElementById("view-container");
  container.innerHTML = `<div style="text-align: center; padding: 3rem;"><h3>Loading ${viewName}...</h3></div>`;

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
  `;
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
    const name = prompt("Product Name:");
    if (!name) return;
    const priceStr = prompt("Price (USD):", "19.99");
    const stockStr = prompt("Initial Stock:", "25");
    const sku = prompt("SKU code (optional):", "PRD-" + Math.floor(Math.random() * 9000 + 1000));

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
      alert(err.message || "Failed to create product");
    }
  });

  container.querySelectorAll(".adjust-stock-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const changeStr = prompt("Enter stock change amount (e.g. +10 or -5):");
      if (!changeStr) return;
      const quantityChange = parseInt(changeStr, 10);
      if (isNaN(quantityChange) || quantityChange === 0) {
        alert("Invalid integer quantity change");
        return;
      }
      try {
        await apiClient(`/inventory/${id}/stock`, {
          method: "PATCH",
          body: JSON.stringify({ quantityChange })
        });
        renderInventoryView(container);
      } catch (err) {
        alert(err.message || "Failed to adjust stock");
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
      <div class="data-table-wrapper">
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
    const name = prompt("Supplier Name:");
    if (!name) return;
    const email = prompt("Supplier Email:");
    try {
      await apiClient("/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify({ name, email })
      });
      renderPurchasingView(container);
    } catch (err) {
      alert(err.message || "Failed to create supplier");
    }
  });

  document.getElementById("create-po-btn")?.addEventListener("click", async () => {
    if (suppliers.length === 0) {
      alert("Please create at least one supplier first.");
      return;
    }
    const productsRes = await apiClient("/inventory");
    const products = productsRes.data || [];
    if (products.length === 0) {
      alert("Please add products to inventory before issuing a purchase order.");
      return;
    }

    const supplier = suppliers[0];
    const product = products[0];
    const quantityStr = prompt(`Order quantity for ${product.name} (Supplier: ${supplier.name}):`, "50");
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
      alert(err.message || "Failed to create PO");
    }
  });

  container.querySelectorAll(".receive-po-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm("Receive this purchase order and increment stock levels?")) {
        try {
          await apiClient(`/purchasing/orders/${id}/receive`, {
            method: "POST",
            body: JSON.stringify({ notes: "Received full shipment at warehouse" })
          });
          renderPurchasingView(container);
        } catch (err) {
          alert(err.message || "Failed to receive PO");
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
      <div class="data-table-wrapper">
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
      <div class="data-table-wrapper">
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
      const cName = prompt("Enter customer name to create initial client:", "Acme Corp");
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
      alert("Please add products in Inventory first.");
      return;
    }

    const prod = prods[0];
    const qtyStr = prompt(`Sell quantity for ${prod.name} (Stock: ${prod.stock}):`, "2");
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
      alert(err.message || "Failed to create sales order");
    }
  });

  container.querySelectorAll(".fulfill-so-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm("Fulfill sales order? This will deduct warehouse stock and generate an invoice.")) {
        try {
          await apiClient(`/sales/orders/${id}/fulfill`, {
            method: "POST",
            body: JSON.stringify({})
          });
          renderSalesView(container);
        } catch (err) {
          alert(err.message || "Failed to fulfill sales order");
        }
      }
    });
  });

  container.querySelectorAll(".pay-inv-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      const due = parseFloat(e.currentTarget.dataset.due);
      const amountStr = prompt(`Enter payment amount (Outstanding: $${due.toFixed(2)}):`, due.toString());
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
        alert(err.message || "Failed to record payment");
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
    const payee = prompt("Payee / Vendor name:", "AWS Cloud Services");
    if (!payee) return;
    const amountStr = prompt("Amount (USD):", "149.50");
    const desc = prompt("Description:", "Monthly infrastructure hosting");

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
      alert(err.message || "Failed to record expense");
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
    const firstName = prompt("First Name:");
    if (!firstName) return;
    const lastName = prompt("Last Name:");
    if (!lastName) return;
    const email = prompt("Email Address:", `${firstName.toLowerCase()}@enterprise.test`);
    const jobTitle = prompt("Job Title:", "Operations Specialist");

    try {
      await apiClient("/employees", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, email, jobTitle, status: "ACTIVE" })
      });
      renderEmployeesView(container);
    } catch (err) {
      alert(err.message || "Failed to add employee");
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
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `<tr><td colspan="5" style="text-align: center; color: #64748b;">No audit events recorded yet.</td></tr>` : ''}
            ${logs.map(log => `
              <tr>
                <td>${new Date(log.createdAt).toLocaleString()}</td>
                <td><span class="badge badge-info">${log.action}</span></td>
                <td><strong>${log.entityType}</strong></td>
                <td>${log.user?.email || "System"}</td>
                <td><pre style="font-size: 0.75rem; margin: 0;">${JSON.stringify(log.details || {})}</pre></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
