const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);

    const statusCode = err.statusCode || 500;
    const response = {
        error: {
            message: err.message || 'Internal Server Error',
            // Only leak stack traces in development
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
        }
    };

    res.status(statusCode).json(response);
};

module.exports = { errorHandler };