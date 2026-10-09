const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');
const reportsValidator = require('./reports.validator');

router.use(requireAuth);
router.use(resolveTenant);

router.get('/dashboard', requirePermission('reports:read'),reportsValidator.getReports, reportsController.getDashboardSummary);
router.get('/sales', requirePermission('reports:read'),reportsValidator.getReports, reportsController.getSalesReport);
router.get('/inventory', requirePermission('reports:read'),reportsValidator.getReports, reportsController.getInventoryReport);
router.get('/expenses', requirePermission('reports:read'),reportsValidator.getReports, reportsController.getExpenseReport);

module.exports = router;
