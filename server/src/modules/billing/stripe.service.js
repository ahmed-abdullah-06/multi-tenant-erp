const Stripe = require('stripe');
const prisma = require('../../lib/prisma');

// Initialize Stripe with your secret key from the environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' // Pin the API version for stability
});

/**
 * Generates a Stripe Checkout URL for an organization subscribing to a specific plan.
 */
const createCheckoutSession = async (organizationId, planId, successUrl, cancelUrl) => {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    const plan = await prisma.plan.findUnique({ where: { id: planId } });

    if (!organization || !plan) {
        throw new Error('Organization or Plan not found');
    }

    // Determine the recurring interval for the Stripe subscription
    const interval = plan.billingCycle === 'YEARLY' ? 'year' : 'month';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
            {
                price_data: {
                    currency: organization.currency.toLowerCase(),
                    product_data: {
                        name: `ERP SaaS - ${plan.name} Plan`,
                        description: plan.description || `Subscription for ${organization.name}`
                    },
                    unit_amount: Math.round(plan.price * 100), // Stripe expects amounts in cents
                    recurring: {
                        interval: interval,
                    },
                },
                quantity: 1,
            },
        ],
        client_reference_id: organizationId,
        metadata: {
            organizationId: organizationId,
            planId: planId
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return session.url;
};

module.exports = {
    createCheckoutSession
};