const express = require('express');
const router = express.Router();
const rbacController = require('./rbac.controller');
const rbacValidator = require('./rbac.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

router.get('/roles', requirePermission('rbac:read'), rbacController.getRoles);
router.get('/roles/:id', requirePermission('rbac:read'), rbacController.getRoleById);
router.post('/roles', requirePermission('rbac:write'), rbacValidator.createRole, rbacController.createRole);
router.put('/roles/:id', requirePermission('rbac:write'), rbacValidator.updateRole, rbacController.updateRole);
router.delete('/roles/:id', requirePermission('rbac:write'), rbacController.deleteRole);

router.get('/permissions', requirePermission('rbac:read'), rbacController.getPermissions);

module.exports = router;
