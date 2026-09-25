const express = require('express');
const router = express.Router();
const accountingController = require('./accounting.controller');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// 1. Enforce Authentication
router.use(requireAuth);

// 2. Enforce Tenant Isolation (Attaches req.tenantId securely)
router.use(resolveTenant);

// 3. Reports & Read-Only Endpoints
router.get(
    '/trial-balance', 
    requirePermission('reports:read'), 
    accountingController.getTrialBalance
);

router.get(
    '/journal-entries', 
    requirePermission('reports:read'), 
    accountingController.getJournalEntries
);

// 4. Mutating Financial Endpoints
router.post(
    '/journal-entries', 
    requirePermission('billing:write'), // Or create a specific 'accounting:write' permission
    accountingController.createManualEntry
);

module.exports = router;