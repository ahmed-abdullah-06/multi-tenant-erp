const logger = require('../lib/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    
    // Log the full error natively through Winston with the correlation ID attached
    logger.error(`[Error] ${err.message}`, {
        correlationId: req.correlationId,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    const response = {
        error: {
            message: err.message || 'Internal Server Error',
            correlationId: req.correlationId, // Send back to the user
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
        }
    };

    res.status(statusCode).json(response);
};

module.exports = { errorHandler };