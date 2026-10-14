const express = require('express');
const router = express.Router();
const invitationController = require('./invitation.controller');
const invitationValidator = require('./invitation.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

// Accepting an invite only requires the user to be logged in, no tenant context yet
router.post('/accept', requireAuth, invitationValidator.acceptInvite, invitationController.acceptInvite);

// The following routes require tenant context and admin/settings permissions
router.use(requireAuth);
router.use(resolveTenant);

router.post('/', requirePermission('settings:write'), invitationValidator.sendInvite, invitationController.sendInvite);
router.get('/', requirePermission('settings:read'), invitationController.listInvitations);
router.delete('/:id', requirePermission('settings:write'), invitationController.revokeInvitation);

module.exports = router;