require('dotenv').config();

const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT, 10) || 5000,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

if (!env.JWT_EXPIRES_IN) {
    throw new Error('JWT_EXPIRES_IN environment variable is required');
}

module.exports = env;
