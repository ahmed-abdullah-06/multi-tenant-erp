const { v4: uuidv4 } = require('uuid');
const logger = require('../lib/logger');

const attachCorrelationId = (req, res, next) => {
    // Check for existing ID from a proxy/frontend, or generate a new one
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    
    // Attach to the request object for use in backend services
    req.correlationId = correlationId;
    
    // Return the ID in the response so the frontend can display it if an error occurs
    res.setHeader('X-Correlation-ID', correlationId);

    // Log the incoming request with its unique ID
    logger.info(`Incoming Request: ${req.method} ${req.url}`, {
        correlationId,
        ip: req.ip,
        tenantId: req.headers['x-organization-id'] || 'anonymous'
    });

    next();
};

module.exports = { attachCorrelationId };