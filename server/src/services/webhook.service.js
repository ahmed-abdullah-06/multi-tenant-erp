// services/webhook.service.js
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const logger = require('../lib/logger');

const prisma = new PrismaClient();

// 1. Function to queue the webhook
const dispatchWebhook = async (organizationId, eventType, payload) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, isActive: true, events: { has: eventType } }
  });

  // Import webhookQueue dynamically to avoid circular dependencies
  const { webhookQueue } = require('../jobs/index.js');

  for (const endpoint of endpoints) {
    if (webhookQueue) {
      // Use BullMQ if available
      try {
        await webhookQueue.add('deliver-webhook', {
          url: endpoint.url,
          secret: endpoint.secret,
          payload
        }, {
          attempts: 5, // Retry logic implementation
          backoff: { type: 'exponential', delay: 2000 } 
        });
      } catch (error) {
        logger.warn('[Webhook] Failed to queue webhook, falling back to direct delivery:', error.message);
        // Fallback to direct delivery
        await processWebhook({ url: endpoint.url, secret: endpoint.secret, payload });
      }
    } else {
      // Fallback: deliver webhook directly without queue
      logger.info('[Webhook] Queue not available, delivering webhook directly');
      await processWebhook({ url: endpoint.url, secret: endpoint.secret, payload });
    }
  }
};

// 2. Function called by the Worker to actually send the data
const processWebhook = async ({ url, secret, payload }) => {
  try {
    // In a production environment, you would use 'secret' to sign the payload header
    await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000 
    });
    logger.info('[Webhook] Successfully delivered to:', url);
  } catch (error) {
    logger.error('[Webhook] Failed to deliver to:', url, error.message);
    throw error;
  }
};

module.exports = {
  dispatchWebhook,
  processWebhook
};