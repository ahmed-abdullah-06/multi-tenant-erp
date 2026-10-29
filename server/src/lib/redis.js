const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const connectRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          if (times > 3) {
            logger.error('[Redis] Max retry attempts reached');
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false
      });

      await redisClient.ping();
      logger.info('[Redis] Connected successfully');
      return redisClient;
    } catch (error) {
      logger.error('[Redis] Failed to connect:', error.message);
      redisClient = null;
      throw error;
    }
  } else {
    logger.warn('[Redis] REDIS_URL not configured. Redis client disabled.');
    return null;
  }
};

const getRedisClient = () => redisClient;

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Disconnected');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  disconnectRedis
};