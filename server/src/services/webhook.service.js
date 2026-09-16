// services/webhook.service.js
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { webhookQueue } from '../jobs/index.js';

const prisma = new PrismaClient();

// 1. Function to queue the webhook
export const dispatchWebhook = async (organizationId, eventType, payload) => {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { organizationId, isActive: true, events: { has: eventType } }
  });

  for (const endpoint of endpoints) {
    await webhookQueue.add('deliver-webhook', {
      url: endpoint.url,
      secret: endpoint.secret,
      payload
    }, {
      attempts: 5, // Retry logic implementation
      backoff: { type: 'exponential', delay: 2000 } 
    });
  }
};

// 2. Function called by the Worker to actually send the data
export const processWebhook = async ({ url, secret, payload }) => {
  // In a production environment, you would use 'secret' to sign the payload header
  await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000 
  });
};