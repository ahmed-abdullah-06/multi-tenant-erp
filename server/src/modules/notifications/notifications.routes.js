const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const notificationsValidator = require('./notifications.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

router.get('/', requirePermission('notifications:read'), notificationsController.getNotifications);
router.patch('/:id/read', requirePermission('notifications:read'), notificationsController.markAsRead);
router.patch('/read-all', requirePermission('notifications:read'), notificationsController.markAllAsRead);
router.post('/', requirePermission('notifications:write'), notificationsValidator.createNotification, notificationsController.createNotification);

module.exports = router;
