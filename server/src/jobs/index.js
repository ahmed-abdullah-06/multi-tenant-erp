// jobs/index.js
import { Queue, Worker } from 'bullmq';
import { processWebhook } from '../services/webhook.service.js';
const logger = require('../lib/logger');

/**
 * Background job dispatcher stub for asynchronous tasks
 * (e.g., low-stock notification alerts, webhook delivery, report compilation)
 */
const jobs = {
    dispatch: async (jobName, payload) => {
        logger.info(`[Background Job] Dispatched: ${jobName}`, payload);
        // Execute or queue job asynchronously
        setImmediate(async () => {
            try {
                if (jobName === 'NOTIFICATION_DISPATCH') {
                    // background notification delivery
                } else if (jobName === 'WEBHOOK_DELIVERY') {
                    // background webhook delivery attempt
                }
            } catch (err) {
                logger.error(`[Background Job Error] ${jobName}:`, err.message);
            }
        });
    }
};

// Connection to Redis (Ensure REDIS_URL is in your .env)
const connection = {
  url: process.env.REDIS_URL
};

// Initialize the Queue
export const webhookQueue = new Queue('webhook-deliveries', { connection });

// Initialize the Worker to process jobs
const worker = new Worker('webhook-deliveries', async (job) => {
  if (job.name === 'deliver-webhook') {
    await processWebhook(job.data);
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});

module.exports = jobs;
