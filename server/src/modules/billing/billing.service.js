const prisma = require('../../lib/prisma');

const getPlans = async () => {
    let plans = await prisma.plan.findMany();
    if (plans.length === 0) {
        // Seed default plans if none exist
        await prisma.plan.createMany({
            data: [
                {
                    name: 'FREE',
                    description: 'For individuals and small tests',
                    price: 0.0,
                    billingCycle: 'MONTHLY',
                    features: { maxUsers: 2, maxProducts: 50, customReports: false }
                },
                {
                    name: 'STARTER',
                    description: 'Growing small businesses',
                    price: 29.0,
                    billingCycle: 'MONTHLY',
                    features: { maxUsers: 10, maxProducts: 500, customReports: true }
                },
                {
                    name: 'ENTERPRISE',
                    description: 'Full-scale organizations with unlimited scale',
                    price: 99.0,
                    billingCycle: 'MONTHLY',
                    features: { maxUsers: -1, maxProducts: -1, customReports: true }
                }
            ]
        });
        plans = await prisma.plan.findMany();
    }
    return plans;
};

const getSubscription = async (tenantId) => {
    let sub = await prisma.subscription.findUnique({
        where: { organizationId: tenantId },
        include: { plan: true }
    });

    if (!sub) {
        // Default to FREE plan
        const plans = await getPlans();
        const freePlan = plans.find(p => p.name === 'FREE') || plans[0];

        sub = await prisma.subscription.create({
            data: {
                organizationId: tenantId,
                planId: freePlan.id,
                status: 'ACTIVE',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            include: { plan: true }
        });
    }

    return sub;
};

const updateSubscription = async (tenantId, { planId }) => {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    return await prisma.subscription.upsert({
        where: { organizationId: tenantId },
        update: {
            planId,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        create: {
            organizationId: tenantId,
            planId,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        include: { plan: true }
    });
};

module.exports = {
    getPlans,
    getSubscription,
    updateSubscription
};
