const express = require('express');
const router = express.Router();
const usersController = require('./users.controller');
const usersValidator = require('./users.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// All endpoints require auth and resolved tenant
router.use(requireAuth);
router.use(resolveTenant);

// Members
router.get('/', requirePermission('users:read'), usersController.getMembers);
router.get('/:id', requirePermission('users:read'), usersController.getMemberById);
router.patch('/:id/role', requirePermission('users:write'), usersValidator.updateMemberRole, usersController.updateMemberRole);
router.delete('/:id', requirePermission('users:write'), usersController.removeMember);

// Invitations
router.get('/invitations/list', requirePermission('users:read'), usersController.getInvitations);
router.post('/invitations', requirePermission('users:write'), usersValidator.createInvitation, usersController.createInvitation);
router.delete('/invitations/:id', requirePermission('users:write'), usersController.cancelInvitation);

module.exports = router;
