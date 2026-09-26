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
// CSP is disabled only outside production so local/dev client assets and
// inline scripts still work. In production, helmet's default CSP applies.
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// Lock CORS to the actual frontend origin. Falls back to localhost for dev.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5000'
}));

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
// Stripe needs the raw, unparsed request body to verify the webhook
// signature. This route reads the stream fully via express.raw().
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// express.json()/urlencoded() must NOT run on the webhook route, or they
// will try to re-read a request stream that express.raw() already
// consumed above -- silently breaking Stripe signature verification.
app.use((req, res, next) => {
    if (req.originalUrl === '/api/v1/billing/webhook') {
        return next();
    }
    express.json({ limit: '10kb' })(req, res, next);
});
app.use((req, res, next) => {
    if (req.originalUrl === '/api/v1/billing/webhook') {
        return next();
    }
    express.urlencoded({ extended: true, limit: '10kb' })(req, res, next);
});

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