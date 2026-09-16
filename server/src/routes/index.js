const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const organizationsRoutes = require('../modules/organizations/organizations.routes');
const usersRoutes = require('../modules/users/users.routes');
const rbacRoutes = require('../modules/rbac/rbac.routes');
const employeesRoutes = require('../modules/employees/employees.routes');
const inventoryRoutes = require('../modules/inventory/inventory.routes');
const purchasingRoutes = require('../modules/purchasing/purchasing.routes');
const salesRoutes = require('../modules/sales/sales.routes');
const expensesRoutes = require('../modules/expenses/expenses.routes');
const reportsRoutes = require('../modules/reports/reports.routes');
const notificationsRoutes = require('../modules/notifications/notifications.routes');
const auditRoutes = require('../modules/audit/audit.routes');
const billingRoutes = require('../modules/billing/billing.routes');

// Mount routes under /api/v1 prefix
router.use('/auth', authRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/users', usersRoutes);
router.use('/rbac', rbacRoutes);
router.use('/employees', employeesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchasing', purchasingRoutes);
router.use('/sales', salesRoutes);
router.use('/expenses', expensesRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/audit', auditRoutes);
router.use('/billing', billingRoutes);

module.exports = router;
