const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const { apiLimiter } = require('./middleware/rateLimiter');
const { attachCorrelationId } = require('./middleware/correlationId');

const app = express();

// ==========================================
// SENTRY INITIALIZATION (OPTIONAL)
// ==========================================
let Sentry = null;
if (process.env.SENTRY_DSN) {
    try {
        Sentry = require('@sentry/node');
        const { nodeProfilingIntegration } = require('@sentry/profiling-node');

        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express({ app }),
                nodeProfilingIntegration(),
            ],
            tracesSampleRate: 1.0, 
            profilesSampleRate: 1.0,
        });

        // The request handler must be the first middleware on the app
        app.use(Sentry.Handlers.requestHandler());
        // TracingHandler creates a trace for every incoming request
        app.use(Sentry.Handlers.tracingHandler());
        
        console.log('[Sentry] Initialized successfully');
    } catch (error) {
        console.warn('[Sentry] Not installed or failed to initialize:', error.message);
        Sentry = null;
    }
} else {
    console.log('[Sentry] Skipped - no SENTRY_DSN configured');
}

// ==========================================
// SECURITY HARDENING & TRACING
// ==========================================
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts and client assets for development
}));
app.use(cors());

app.use(attachCorrelationId);

// Bind the Correlation ID to Sentry so cloud logs match local logs
app.use((req, res, next) => {
    if (req.correlationId && Sentry) {
        Sentry.setTag("correlation_id", req.correlationId);
    }
    next();
});

// ==========================================
// ROUTES & PARSERS
// ==========================================
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const clientPath = path.join(__dirname, '../../client');
app.use(express.static(clientPath));

// Swagger
const swaggerDocumentPath = path.join(__dirname, '../../docs/api/swagger.json');
if (fs.existsSync(swaggerDocumentPath)) {
    const swaggerDocument = require(swaggerDocumentPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use('/api/v1', apiLimiter, apiRoutes);

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));

// ==========================================
// ERROR HANDLING
// ==========================================
// The Sentry error handler must be before any other error middleware
if (Sentry) {
    app.use(Sentry.Handlers.errorHandler());
}

// Your custom centralized error handler
app.use(errorHandler);

module.exports = app;