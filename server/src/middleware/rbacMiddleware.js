const prisma = require('../lib/prisma');

const requirePermission = (requiredAction) => {
    return async (req, res, next) => {
        if (!req.membership || !req.membership.roleId) {
            return res.status(403).json({ error: 'No active role found' });
        }

        try {
            const hasPermission = await prisma.rolePermission.findFirst({
                where: {
                    roleId: req.membership.roleId,
                    permission: {
                        action: requiredAction
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