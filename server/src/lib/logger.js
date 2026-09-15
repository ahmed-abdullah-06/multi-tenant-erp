const logger = {
    info: (msg, ...args) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`, ...args),
    warn: (msg, ...args) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`, ...args),
    error: (msg, ...args) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, ...args),
    debug: (msg, ...args) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${new Date().toISOString()}: ${msg}`, ...args);
        }
    }
};

module.exports = logger;
