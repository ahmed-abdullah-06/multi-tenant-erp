const prisma = require('../lib/prisma');

const requirePermission = (requiredAction) => {
    return async (req, res, next) => {
        if (!req.membership || !req.membership.roleId) {
            return res.status(403).json({ error: 'No active role found' });
        }

        try {
            if (req.membership.role && (req.membership.role.name === 'Owner' || req.membership.role.name === 'Admin')) {
                return next();
            }

            const parts = requiredAction.split(':');
            const invertedAction = parts.length === 2 ? `${parts[1]}:${parts[0]}` : requiredAction;

            const hasPermission = await prisma.rolePermission.findFirst({
                where: {
                    roleId: req.membership.roleId,
                    permission: {
                        action: { in: [requiredAction, invertedAction, '*'] }
                    }
                }
            });

            if (!hasPermission) {
                return res.status(403).json({ error: `Forbidden: requires '${requiredAction}' permission` });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requirePermission };