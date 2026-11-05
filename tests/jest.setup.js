// Registered via setupFilesAfterEnv in jest.config.js.
//
// The app creates an eager ioredis connection when the idempotency middleware is
// required. That socket keeps the worker's event loop alive, which forces Jest to
// kill workers with "A worker process has failed to exit gracefully". Disconnect
// the client after every test file so workers exit cleanly.

const idempotency = require('../server/src/middleware/idempotency');

afterAll(() => {
    try {
        const redis = idempotency && idempotency.redis;
        if (redis && typeof redis.disconnect === 'function') {
            // Synchronous and safe to call even if the client already quit.
            redis.disconnect();
        }
    } catch (err) {
        // Teardown only — never fail a suite because of cleanup
    }
});
