const rateLimit = require('express-rate-limit');

// Strict limiter for authentication routes (login, register, password resets)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 5 requests per windowMs
    message: { 
        error: 'Too many authentication attempts from this IP, please try again after 15 minutes.' 
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// General API limiter (optional, but good practice for later)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { 
        error: 'Too many requests from this IP, please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { 
    authLimiter, 
    apiLimiter 
};