const prisma = require('../lib/prisma');

const resolveTenant = async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const requestedOrgId = Array.isArray(req.headers['x-organization-id'])
    ? req.headers['x-organization-id'][0]
    : req.headers['x-organization-id'];
    if (!requestedOrgId) {
        return res.status(400).json({ error: 'Missing x-organization-id header' });
    }

    try {
        // Enforce organizationId and userId via the composite index
        const membership = await prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId: req.user.id,
                    organizationId: requestedOrgId
                }
            },
            include: { organization: true }
        });

        if (!membership || membership.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Access denied to this organization' });
        }

        // Attach safely verified tenant data to the request
        req.tenantId = membership.organizationId;
        req.membership = membership; 
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { resolveTenant };