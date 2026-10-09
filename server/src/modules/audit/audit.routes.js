const express = require('express');
const router = express.Router();
const auditController = require('./audit.controller');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');
const auditValidator = require('./audit.validator');

router.use(requireAuth);
router.use(resolveTenant);

router.get('/', requirePermission('audit:read'),auditValidator.getAuditLogs, auditController.getAuditLogs);

module.exports = router;
