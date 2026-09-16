const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

router.get('/dashboard', requirePermission('reports:read'), reportsController.getDashboardSummary);
router.get('/sales', requirePermission('reports:read'), reportsController.getSalesReport);
router.get('/inventory', requirePermission('reports:read'), reportsController.getInventoryReport);
router.get('/expenses', requirePermission('reports:read'), reportsController.getExpenseReport);

module.exports = router;
