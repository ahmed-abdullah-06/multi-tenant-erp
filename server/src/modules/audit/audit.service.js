const prisma = require('../../lib/prisma');

const getAuditLogs = async (tenantId, { limit = 50, entityType, action }) => {
    return await prisma.auditLog.findMany({
        where: {
            organizationId: tenantId,
            ...(entityType && { entityType }),
            ...(action && { action })
        },
        include: {
            user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10)
    });
};

const logAction = async (tenantId, userId, { action, entityType, entityId, details, ipAddress, userAgent }) => {
    return await prisma.auditLog.create({
        data: {
            organizationId: tenantId,
            userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress,
            userAgent
        }
    });
};

module.exports = {
    getAuditLogs,
    logAction
};
