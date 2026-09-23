// We will use a simple Redis client since you already need Redis for the BullMQ background jobs.
const Redis = require('ioredis');

// Initialize Redis client with error handling
let redis = null;

if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
            // Stop retrying after 3 attempts
            if (times > 3) {
                console.warn('[Redis] Max retry attempts reached. Idempotency middleware will be disabled.');
                return null;
            }
            return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false
    });

    redis.on('error', (err) => {
        console.warn('[Redis] Connection error:', err.message);
    });

    redis.on('connect', () => {
        console.log('[Redis] Connected successfully for idempotency middleware');
    });
} else {
    console.warn('[Redis] REDIS_URL not configured. Idempotency middleware will be disabled.');
}

const requireIdempotency = async (req, res, next) => {
    // If Redis is not available, skip idempotency checks
    if (!redis || redis.status !== 'ready') {
        console.warn('[Idempotency] Redis unavailable, skipping idempotency check');
        return next();
    }

    const idempotencyKey = req.headers['idempotency-key'];

    // If no key is provided, either reject or bypass (standard is to bypass for non-strict routes)
    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key header is required for this endpoint.' });
    }

    const cacheKey = `idempotency:${req.tenantId || 'global'}:${idempotencyKey}`;

    try {
        const cachedResponse = await redis.get(cacheKey);

        if (cachedResponse) {
            // The request was already processed. Return the exact same response.
            const parsed = JSON.parse(cachedResponse);
            return res.status(parsed.statusCode).json(parsed.body);
        }

        // We haven't seen this key. We must hijack the res.json method to cache the response 
        // right before it gets sent to the user.
        const originalJson = res.json;
        res.json = function (body) {
            const responseToCache = {
                statusCode: res.statusCode,
                body: body
            };
            
            // Cache the response for 24 hours
            redis.set(cacheKey, JSON.stringify(responseToCache), 'EX', 86400);
            
            // Call the original res.json to actually send the data
            return originalJson.call(this, body);
        };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireIdempotency };