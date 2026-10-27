const Stripe = require('stripe');
const prisma = require('../../lib/prisma');
const emailService = require('../../services/email.service');

const stripe = process.env.STRIPE_SECRET_KEY 
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const getOrgBillingContact = async (orgId) => {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                memberships: {
                    include: { user: true, role: true }
                }
            }
        });
        const ownerMember = org?.memberships?.find(m => m.role?.name?.toLowerCase() === 'owner') || org?.memberships?.[0];
        return {
            orgName: org?.name || 'Your Organization',
            email: ownerMember?.user?.email
        };
    } catch {
        return { orgName: 'Your Organization', email: null };
    }
};

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
                const { organizationId, planId } = session.metadata || {};

                if (organizationId && planId) {
                    // Create or update the active subscription record
                    await prisma.subscription.upsert({
                        where: { organizationId },
                        update: {
                            planId,
                            status: 'ACTIVE',
                            currentPeriodStart: new Date(),
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

                    // Send email notification
                    const { orgName, email } = await getOrgBillingContact(organizationId);
                    if (email) {
                        await emailService.sendBillingAlertEmail({
                            email,
                            organizationName: orgName,
                            alertType: 'PLAN_UPGRADED',
                            details: `Your payment was processed and your plan is now active. Thank you for choosing Nexus ERP!`,
                            actionUrl: `${process.env.APP_URL || 'http://localhost:3000'}/settings.html`
                        });
                    }
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                console.log(`Payment failed for customer: ${customerId}`);
                
                // Lookup subscription by customer or metadata
                const orgId = invoice.subscription_details?.metadata?.organizationId;
                if (orgId) {
                    await prisma.subscription.updateMany({
                        where: { organizationId: orgId },
                        data: { status: 'PAST_DUE' }
                    });
                    const { orgName, email } = await getOrgBillingContact(orgId);
                    if (email) {
                        await emailService.sendBillingAlertEmail({
                            email,
                            organizationName: orgName,
                            alertType: 'PAYMENT_FAILED',
                            details: `A recent subscription invoice payment has failed. Please update your payment method to maintain uninterrupted service.`,
                            actionUrl: `${process.env.APP_URL || 'http://localhost:3000'}/settings.html`
                        });
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const orgId = subscription.metadata?.organizationId;
                if (orgId) {
                    await prisma.subscription.updateMany({
                        where: { organizationId: orgId },
                        data: { status: 'CANCELED' }
                    });
                    const { orgName, email } = await getOrgBillingContact(orgId);
                    if (email) {
                        await emailService.sendBillingAlertEmail({
                            email,
                            organizationName: orgName,
                            alertType: 'SUBSCRIPTION_CANCELED',
                            details: `Your subscription has been canceled. Your features will revert to the default plan at period end.`,
                            actionUrl: `${process.env.APP_URL || 'http://localhost:3000'}/settings.html`
                        });
                    }
                }
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