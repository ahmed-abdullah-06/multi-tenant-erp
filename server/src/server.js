require('dotenv').config();
const http = require('http');
const app = require('./app');
const logger = require('./lib/logger');
const { initSocket } = require('./lib/socket');
const prisma = require('./lib/prisma');

const PORT = process.env.PORT || 5000;

async function startServer() {
    // 1. Verify database connection before accepting traffic
    await prisma.$connect();
    logger.info('Database connected successfully.');

    // 2. Create HTTP server and attach Socket.io
    const server = http.createServer(app);
    initSocket(server);
    logger.info('WebSocket server initialized and listening.');

    // 3. Start listening
    server.listen(PORT, () => {
        logger.info(`Multi-Tenant ERP SaaS Server running on port ${PORT}`);
        logger.info(`API base URL at http://localhost:${PORT}/api/v1`);
        logger.info(`Swagger API docs at http://localhost:${PORT}/api-docs`);
        logger.info(`Access frontend at http://localhost:${PORT}`);
    });
}

startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
