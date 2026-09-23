const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }), // Automatically captures error stack traces
        winston.format.json()                   // Outputs structured JSON
    ),
    defaultMeta: { service: 'erp-api' },
    transports: [
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? winston.format.json()
                : winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
        })
    ]
});

module.exports = logger;
