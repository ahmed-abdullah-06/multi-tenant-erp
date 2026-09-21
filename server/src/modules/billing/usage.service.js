const prisma = require('../../lib/prisma');

/**
 * Checks if an organization can perform an action based on feature limits or current resource counts.
 * @param {string} organizationId - The tenant ID
 * @param {string} featureKey - The feature or limit key (e.g. 'MAX_PRODUCTS', 'WEBHOOKS')
 * @returns {Promise<{ allowed: boolean, limit: number, current: number, reason?: string }>}
 */
const verifyFeatureAccess = async (organizationId, featureKey) => {
    // 1. Fetch active subscription and associated plan
    const subscription = await prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true }
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
        return { allowed: false, reason: 'Active subscription required.' };
    }

    const planFeatures = subscription.plan.features || {};

    // 2. Check for explicit boolean feature toggles (e.g., customReports: true/false)
    if (typeof planFeatures[featureKey] === 'boolean') {
        if (!planFeatures[featureKey]) {
            return {
                allowed: false,
                reason: `Feature '${featureKey}' is not available on the ${subscription.plan.name} plan.`
            };
        }
        return { allowed: true };
    }

    // 3. Check numeric resource limits (e.g. MAX_PRODUCTS, MAX_USERS)
    const customLimit = await prisma.featureLimit.findUnique({
        where: {
            organizationId_featureKey: { organizationId, featureKey }
        }
    });

    // Custom limit overrides plan default if specified; -1 denotes unlimited
    const limit = customLimit ? customLimit.limitValue : (planFeatures[featureKey] ?? -1);

    if (limit === -1) {
        return { allowed: true, limit: -1 };
    }

    // 4. Calculate current resource count based on feature key
    let currentCount = 0;
    if (featureKey === 'MAX_PRODUCTS') {
        currentCount = await prisma.product.count({
            where: { organizationId, deletedAt: null }
        });
    } else if (featureKey === 'MAX_USERS') {
        currentCount = await prisma.membership.count({
            where: { organizationId, status: 'ACTIVE' }
        });
    }

    if (currentCount >= limit) {
        return {
            allowed: false,
            limit,
            current: currentCount,
            reason: `Limit reached (${currentCount}/${limit} ${featureKey}). Please upgrade your plan.`
        };
    }

    return { allowed: true, limit, current: currentCount };
};

module.exports = {
    verifyFeatureAccess
};