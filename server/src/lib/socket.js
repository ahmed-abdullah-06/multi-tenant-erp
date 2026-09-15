const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET;

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Update this to your frontend URL in production
            methods: ['GET', 'POST']
        }
    });

    // Authentication & Tenant Isolation Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        const tenantId = socket.handshake.auth.tenantId;

        if (!token || !tenantId) {
            return next(new Error('Authentication and tenantId are required'));
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            socket.tenantId = tenantId;
            next();
        } catch (err) {
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`User ${socket.user.id} connected via WebSocket.`);
        
        // Join the tenant-specific room to ensure strict data isolation
        socket.join(socket.tenantId);
        logger.info(`User ${socket.user.id} joined room: ${socket.tenantId}`);

        socket.on('disconnect', () => {
            logger.info(`User ${socket.user.id} disconnected.`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized!');
    }
    return io;
};

module.exports = { initSocket, getIo };