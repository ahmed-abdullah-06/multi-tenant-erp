// services/webhook.service.js
const prisma = require('../lib/prisma');
const axios = require('axios');
const logger = require('../lib/logger');
const { dispatchWebhookJob } = require('../lib/jobQueue');

// 1. Function to queue the webhook
const dispatchWebhook = async (organizationId, eventType, payload) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, isActive: true, events: { has: eventType } }
  });

  for (const endpoint of endpoints) {
    try {
      // Queue for async delivery
      await dispatchWebhookJob({
        url: endpoint.url,
        secret: endpoint.secret,
        payload,
        eventType,
        endpointId: endpoint.id,
        organizationId
      });
      logger.info(`[Webhook] Queued webhook delivery to ${endpoint.url} for event ${eventType}`);
    } catch (error) {
      logger.error(`[Webhook] Failed to queue webhook to ${endpoint.url}: ${error.message}`);
      // Fallback to direct delivery
      await processWebhook({ url: endpoint.url, secret: endpoint.secret, payload });
    }
  }
};

// 2. Function called by the Worker to actually send the data
const processWebhook = async ({ url, secret, payload, eventType, endpointId, organizationId }) => {
  const startTime = Date.now();

  try {
    // In a production environment, you would use 'secret' to sign the payload header
    // Add webhook signature verification here for enhanced security
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Nexus-ERP-Webhook/1.0'
    };

    if (secret) {
      const crypto = require('crypto');
      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    await axios.post(url, payload, {
      headers,
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 300
    });

    const duration = Date.now() - startTime;
    logger.info(`[Webhook] Successfully delivered to ${url} in ${duration}ms (${eventType})`);

    // Log successful webhook delivery
    await logWebhookDelivery(endpointId, organizationId, url, 'SUCCESS', null, duration);

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    
    logger.error(`[Webhook] Failed to deliver to ${url} (${eventType}): ${errorMessage} (${duration}ms)`);

    // Log failed webhook delivery
    await logWebhookDelivery(endpointId, organizationId, url, 'FAILED', errorMessage, duration);
    
    throw error;
  }
};

// 3. Log webhook delivery results
const logWebhookDelivery = async (endpointId, organizationId, url, status, error, duration) => {
  try {
    await prisma.webhookDelivery.create({
      data: {
        webhookEndpointId: endpointId,
        event: 'WEBHOOK_DELIVERY', // Can be more specific based on eventType
        payload: { url, status, error, duration }, // Store relevant metadata
        statusCode: status === 'SUCCESS' ? 200 : 500,
        responseBody: null,
        attempts: 1,
        success: status === 'SUCCESS'
      }
    });
  } catch (logError) {
    logger.error(`[Webhook] Failed to log delivery: ${logError.message}`);
  }
};

module.exports = {
  dispatchWebhook,
  processWebhook,
  logWebhookDelivery
};