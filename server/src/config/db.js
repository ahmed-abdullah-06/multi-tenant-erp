const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('Database connection established successfully');
    } catch (error) {
        logger.error('Database connection failed:', error.message);
    }
};

module.exports = {
    prisma,
    connectDB
};
