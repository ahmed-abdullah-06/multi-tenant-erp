const Stripe = require('stripe');
const prisma = require('../../lib/prisma');

const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const handleStripeWebhook = async (req, res) => {
    if (!stripe) {
        return res.status(503).json({ error: 'Stripe is not configured on this server' });
    }

    const signature = req.headers['stripe-signature'];
    let event;

    try {
        // req.body MUST be a raw buffer here, not a parsed JSON object
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                
                // Retrieve the custom metadata we attached during checkout creation
                const { organizationId, planId } = session.metadata;

                // Create or update the active subscription record
                await prisma.subscription.upsert({
                    where: { organizationId },
                    update: {
                        planId,
                        status: 'ACTIVE',
                        currentPeriodStart: new Date(),
                        // A rough initial end date; actual syncing comes from invoice events
                        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)) 
                    },
                    create: {
                        organizationId,
                        planId,
                        status: 'ACTIVE',
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
                    }
                });
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                
                // In a full implementation, you would look up the organization by the Stripe Customer ID
                // and mark their subscription status as 'PAST_DUE' to gate system access.
                console.log(`Payment failed for customer: ${customerId}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                // Handle cancellation logic
                break;
            }
        }

        // Always return a 200 immediately so Stripe knows you received the event
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Failed to process Stripe webhook:', error);
        res.status(500).json({ error: 'Webhook processing failure' });
    }
};

module.exports = {
    handleStripeWebhook
};