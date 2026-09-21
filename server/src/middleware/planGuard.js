const { verifyFeatureAccess } = require('../modules/billing/usage.service');

/**
 * Express middleware to enforce plan tier limits.
 * @param {string} featureKey - The feature or limit key to evaluate
 */
const requirePlanFeature = (featureKey) => {
    return async (req, res, next) => {
        const organizationId = req.tenantId || req.organizationId;

        if (!organizationId) {
            return res.status(400).json({ error: 'Tenant context required for plan verification.' });
        }

        try {
            const check = await verifyFeatureAccess(organizationId, featureKey);

            if (!check.allowed) {
                return res.status(403).json({
                    error: 'Plan Limit Exceeded',
                    details: check.reason,
                    limit: check.limit,
                    current: check.current
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    requirePlanFeature
};