const stripeService = require('./stripe.service');
const billingService = require('./billing.service');
const { successResponse } = require('../../lib/response');

const getPlans = async (req, res, next) => {
    try {
        const plans = await billingService.getPlans();
        return successResponse(res, 200, 'Plans retrieved', plans);
    } catch (error) {
        next(error);
    }
};

const getSubscription = async (req, res, next) => {
    try {
        const subscription = await billingService.getSubscription(req.tenantId);
        return successResponse(res, 200, 'Current subscription retrieved', subscription);
    } catch (error) {
        next(error);
    }
};

const updateSubscription = async (req, res, next) => {
    try {
        const { planId } = req.body;
        const subscription = await billingService.updateSubscription(req.tenantId, { planId });
        return successResponse(res, 200, 'Subscription updated successfully', subscription);
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const createSubscriptionCheckout = async (req, res, next) => {
    try {
        const { planId, successUrl, cancelUrl } = req.body;
        const organizationId = req.organizationId; // Provided by your auth middleware

        if (!planId || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: 'Missing required checkout parameters' });
        }

        const checkoutUrl = await stripeService.createCheckoutSession(
            organizationId, 
            planId, 
            successUrl, 
            cancelUrl
        );

        return successResponse(res, 200, 'Checkout session created', { url: checkoutUrl });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPlans,
    getSubscription,
    updateSubscription,
    createSubscriptionCheckout
};
