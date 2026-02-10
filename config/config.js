/**
 * Application Configuration
 */

require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    pts: {
        enabled: process.env.PTS_ENABLED !== 'false', // Default to true if not specified
        pollingEnabled: process.env.PTS_POLLING_ENABLED !== 'false', // Default to true
        url: process.env.PTS_URL || 'https://192.168.1.117/jsonPTS',
        username: process.env.PTS_USERNAME || 'admin',
        password: process.env.PTS_PASSWORD || 'admin',
        timeout: parseInt(process.env.PTS_TIMEOUT) || 30000,
        pollingInterval: parseInt(process.env.PTS_POLLING_INTERVAL) || 1000, // 1 second
        retryAttempts: parseInt(process.env.PTS_RETRY_ATTEMPTS) || 3,
        retryDelay: parseInt(process.env.PTS_RETRY_DELAY) || 1000
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'tactivo',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true',
        poolSize: parseInt(process.env.DB_POOL_SIZE) || 20
    },
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        file: process.env.LOG_FILE || './logs/tactivo.log'
    },
    ptsRemote: {
        username: process.env.PTS_REMOTE_USERNAME || 'admin',
        password: process.env.PTS_REMOTE_PASSWORD || 'admin',
        secretKey: process.env.PTS_SECRET_KEY || '',
        verifySignature: process.env.PTS_VERIFY_SIGNATURE === 'true'
    }
};

