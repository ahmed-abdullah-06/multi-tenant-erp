const updateSubscription = (req, res, next) => {
    const { planId } = req.body;
    if (!planId || typeof planId !== 'string') {
        return res.status(400).json({ error: 'planId is required and must be a string' });
    }
    next();
};

const createSubscriptionCheckout = (req, res, next) => {
    const { planId, successUrl, cancelUrl } = req.body;
    
    if (!planId || typeof planId !== 'string') {
        return res.status(400).json({ error: 'planId is required' });
    }
    if (!successUrl || typeof successUrl !== 'string' || !successUrl.startsWith('http')) {
        return res.status(400).json({ error: 'A valid successUrl is required' });
    }
    if (!cancelUrl || typeof cancelUrl !== 'string' || !cancelUrl.startsWith('http')) {
        return res.status(400).json({ error: 'A valid cancelUrl is required' });
    }
    
    next();
};

module.exports = { updateSubscription, createSubscriptionCheckout };