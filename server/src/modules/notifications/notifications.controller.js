const notificationsService = require('./notifications.service');
const { successResponse } = require('../../lib/response');

const getNotifications = async (req, res, next) => {
    try {
        const notifications = await notificationsService.getNotifications(req.tenantId, req.user.id);
        return successResponse(res, 200, 'Notifications retrieved', notifications);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        await notificationsService.markAsRead(req.tenantId, req.user.id, req.params.id);
        return successResponse(res, 200, 'Notification marked as read');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await notificationsService.markAllAsRead(req.tenantId, req.user.id);
        return successResponse(res, 200, 'All notifications marked as read');
    } catch (error) {
        next(error);
    }
};

const createNotification = async (req, res, next) => {
    try {
        const notification = await notificationsService.createNotification(req.tenantId, req.body);
        return successResponse(res, 201, 'Notification created successfully', notification);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};
