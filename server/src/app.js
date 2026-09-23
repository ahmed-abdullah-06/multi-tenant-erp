const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const { apiLimiter } = require('./middleware/rateLimiter'); // <-- Import the general API limiter

const app = express();

// ==========================================
// SECURITY HARDENING
// ==========================================
// Strict Content Security Policy to mitigate XSS attacks
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for basic frontend JS
            styleSrc: ["'self'", "'unsafe-inline'"], 
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com"], // Allow Stripe connections
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Restrict CORS to specific trusted origins in production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-production-domain.com'] 
        : '*',
    credentials: true
};
app.use(cors(corsOptions));

// ==========================================
// STRIPE WEBHOOK MIDDLEWARE
// ==========================================
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Global body parsers
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload bloat attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static frontend assets
const clientPath = path.join(__dirname, '../../client');
app.use(express.static(clientPath));

// ==========================================
// SWAGGER API DOCUMENTATION
// ==========================================
const swaggerDocumentPath = path.join(__dirname, '../../docs/api/swagger.json');
if (fs.existsSync(swaggerDocumentPath)) {
    const swaggerDocument = require(swaggerDocumentPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customSiteTitle: "Enterprise ERP SaaS API Docs"
    }));
}

// ==========================================
// ROUTING & RATE LIMITING
// ==========================================
// Apply the baseline rate limiter to ALL API routes to prevent DDoS
app.use('/api/v1', apiLimiter, apiRoutes);

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use(errorHandler);

module.exports = app;