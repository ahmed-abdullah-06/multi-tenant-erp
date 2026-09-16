const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/index');
const { errorHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');

const app = express();

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts and client assets for development
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
} else {
    console.warn("Swagger documentation file not found at docs/api/swagger.json");
}

// API routes prefix
app.use('/api/v1', apiRoutes);

// Favicon 204 handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Central error handler
app.use(errorHandler);

module.exports = app;
