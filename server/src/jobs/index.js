// jobs/index.js
const logger = require('../lib/logger');

/**
 * Background job dispatcher stub for asynchronous tasks
 * (e.g., low-stock notification alerts, webhook delivery, report compilation)
 */
const jobs = {
    dispatch: async (jobName, payload) => {
        logger.info(`[Background Job] Dispatched: ${jobName}`, payload);
        // Execute or queue asynchronously
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

// BullMQ integration - only initialize if Redis is configured
let webhookQueue = null;
let worker = null;

if (process.env.REDIS_URL) {
    try {
        const { Queue, Worker } = require('bullmq');
        
        // Connection to Redis
        const connection = {
            url: process.env.REDIS_URL,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.warn('[BullMQ] Max retry attempts reached. Queue disabled.');
                    return null;
                }
                return Math.min(times * 50, 2000);
            },
            maxRetriesPerRequest: 3,
            enableOfflineQueue: false
        };

        // Initialize the Queue
        webhookQueue = new Queue('webhook-deliveries', { connection });

        // Initialize the Worker to process jobs
        worker = new Worker('webhook-deliveries', async (job) => {
            if (job.name === 'deliver-webhook') {
                const { processWebhook } = require('../services/webhook.service');
                await processWebhook(job.data);
            }
        }, { connection });

        worker.on('completed', (job) => {
            console.log(`[BullMQ] Job ${job.id} completed`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[BullMQ] Job ${job.id} failed: ${err.message}`);
        });

        worker.on('error', (err) => {
            console.warn('[BullMQ] Worker error:', err.message);
        });

        console.log('[BullMQ] Queue and worker initialized successfully');
    } catch (error) {
        console.warn('[BullMQ] Failed to initialize:', error.message);
    }
} else {
    console.warn('[BullMQ] REDIS_URL not configured. Background job queue disabled.');
}

module.exports = jobs;
module.exports.webhookQueue = webhookQueue;
