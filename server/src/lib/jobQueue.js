const { Queue, Worker } = require('bullmq');
const logger = require('../lib/logger');
const { getRedisClient } = require('../lib/redis');

let webhookQueue = null;
let notificationQueue = null;
let reportQueue = null;
let webhookWorker = null;
let notificationWorker = null;
let reportWorker = null;

const initializeQueues = async () => {
  const redisClient = getRedisClient();
  if (!redisClient) {
    logger.warn('[Job Queue] Redis not available. Background jobs disabled.');
    return;
  }

  try {
    // Webhook Delivery Queue
    webhookQueue = new Queue('webhook-deliveries', {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });

    // Notification Queue
    notificationQueue = new Queue('notifications', {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail: 20
      }
    });

    // Report Generation Queue
    reportQueue = new Queue('reports', {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 20,
        removeOnFail: 10
      }
    });

    // Initialize webhook worker
    webhookWorker = new Worker('webhook-deliveries', async (job) => {
      const { processWebhook } = require('../services/webhook.service');
      await processWebhook(job.data);
      logger.info(`[Worker] Webhook job ${job.id} completed`);
    }, {
      connection: redisClient,
      concurrency: 10,
      removeOnComplete: 100,
      removeOnFail: 50
    });

    // Initialize notification worker
    notificationWorker = new Worker('notifications', async (job) => {
      const { sendNotification } = require('../services/notification.service');
      await sendNotification(job.data);
      logger.info(`[Worker] Notification job ${job.id} completed`);
    }, {
      connection: redisClient,
      concurrency: 20,
      removeOnComplete: 50,
      removeOnFail: 20
    });

    // Initialize report worker
    reportWorker = new Worker('reports', async (job) => {
      const { generateReport } = require('../services/report.service');
      await generateReport(job.data);
      logger.info(`[Worker] Report job ${job.id} completed`);
    }, {
      connection: redisClient,
      concurrency: 5,
      removeOnComplete: 20,
      removeOnFail: 10
    });

    // Event listeners
    webhookWorker.on('completed', (job) => {
      logger.info(`[Worker] Webhook job ${job.id} completed`);
    });

    webhookWorker.on('failed', (job, err) => {
      logger.error(`[Worker] Webhook job ${job.id} failed: ${err.message}`);
    });

    notificationWorker.on('completed', (job) => {
      logger.info(`[Worker] Notification job ${job.id} completed`);
    });

    notificationWorker.on('failed', (job, err) => {
      logger.error(`[Worker] Notification job ${job.id} failed: ${err.message}`);
    });

    reportWorker.on('completed', (job) => {
      logger.info(`[Worker] Report job ${job.id} completed`);
    });

    reportWorker.on('failed', (job, err) => {
      logger.error(`[Worker] Report job ${job.id} failed: ${err.message}`);
    });

    logger.info('[Job Queue] All queues and workers initialized successfully');
  } catch (error) {
    logger.error('[Job Queue] Failed to initialize:', error.message);
    throw error;
  }
};

const dispatchWebhookJob = async (webhookData) => {
  if (!webhookQueue) {
    throw new Error('Webhook queue not available');
  }
  return await webhookQueue.add('deliver-webhook', webhookData);
};

const dispatchNotificationJob = async (notificationData) => {
  if (!notificationQueue) {
    throw new Error('Notification queue not available');
  }
  return await notificationQueue.add('send-notification', notificationData);
};

const dispatchReportJob = async (reportData) => {
  if (!reportQueue) {
    throw new Error('Report queue not available');
  }
  return await reportQueue.add('generate-report', reportData);
};

const getQueueStats = async () => {
  const stats = {};

  if (webhookQueue) {
    const webhooksCount = await webhookQueue.getWaiting().then(jobs => jobs.length);
    const webhooksActive = await webhookQueue.getActive().then(jobs => jobs.length);
    const webhooksCompleted = await webhookQueue.getCompleted().then(jobs => jobs.length);
    const webhooksFailed = await webhookQueue.getFailed().then(jobs => jobs.length);

    stats.webhooks = {
      waiting: webhooksCount,
      active: webhooksActive,
      completed: webhooksCompleted,
      failed: webhooksFailed
    };
  }

  if (notificationQueue) {
    const notificationsCount = await notificationQueue.getWaiting().then(jobs => jobs.length);
    const notificationsActive = await notificationQueue.getActive().then(jobs => jobs.length);

    stats.notifications = {
      waiting: notificationsCount,
      active: notificationsActive
    };
  }

  if (reportQueue) {
    const reportsCount = await reportQueue.getWaiting().then(jobs => jobs.length);
    const reportsActive = await reportQueue.getActive().then(jobs => jobs.length);

    stats.reports = {
      waiting: reportsCount,
      active: reportsActive
    };
  }

  return stats;
};

const closeQueues = async () => {
  try {
    if (webhookWorker) await webhookWorker.close();
    if (notificationWorker) await notificationWorker.close();
    if (reportWorker) await reportWorker.close();

    if (webhookQueue) await webhookQueue.close();
    if (notificationQueue) await notificationQueue.close();
    if (reportQueue) await reportQueue.close();

    logger.info('[Job Queue] All queues and workers closed');
  } catch (error) {
    logger.error('[Job Queue] Error closing queues:', error.message);
  }
};

module.exports = {
  initializeQueues,
  dispatchWebhookJob,
  dispatchNotificationJob,
  dispatchReportJob,
  getQueueStats,
  closeQueues,
  webhookQueue,
  notificationQueue,
  reportQueue,
  webhookWorker,
  notificationWorker,
  reportWorker
};