const express = require('express');
const router = express.Router();
const organizationsController = require('./organizations.controller');
const organizationsValidator = require('./organizations.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// All routes require authentication
router.use(requireAuth);

// User-level endpoints (no active organization context required yet)
router.get('/my', organizationsController.getMyOrganizations);
router.post('/', organizationsValidator.createOrganization, organizationsController.createOrganization);

// Tenant-scoped endpoints (require resolveTenant and permissions)
router.get('/current', resolveTenant, requirePermission('organizations:read'), organizationsController.getCurrentOrganization);
router.patch('/current', resolveTenant, requirePermission('organizations:write'), organizationsValidator.updateOrganization, organizationsController.updateCurrentOrganization);

module.exports = router;
