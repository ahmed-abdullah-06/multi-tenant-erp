const prisma = require('../../lib/prisma');
const { getIo } = require('../../lib/socket');

const getNotifications = async (tenantId, userId) => {
    return await prisma.notification.findMany({
        where: { organizationId: tenantId, userId },
        orderBy: { createdAt: 'desc' },
        take: 30
    });
};

const markAsRead = async (tenantId, userId, notificationId) => {
    const result = await prisma.notification.updateMany({
        where: { id: notificationId, organizationId: tenantId, userId },
        data: { isRead: true }
    });
    if (result.count === 0) throw new Error('Notification not found or access denied');
    return result;
};

const markAllAsRead = async (tenantId, userId) => {
    return await prisma.notification.updateMany({
        where: { organizationId: tenantId, userId, isRead: false },
        data: { isRead: true }
    });
};

const createNotification = async (tenantId, data) => {
    // 1. Save to database
    const notification = await prisma.notification.create({
        data: {
            organizationId: tenantId,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || 'INFO',
            link: data.link
        }
    });

    // 2. Push real-time alert strictly to the tenant's isolated room
    try {
        const io = getIo();
        // Emitting to the specific user room (tenantId + userId) or tenant-wide
        // Here we broadcast to the whole tenant, but the client filters by userId if needed.
        io.to(tenantId).emit('new-notification', notification);
    } catch (error) {
        console.error('Failed to emit WebSocket event:', error.message);
    }

    return notification;
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
};