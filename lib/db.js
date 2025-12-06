/**
 * PostgreSQL Database Connection
 */

const { Pool } = require('pg');
const config = require('../config/config');
const logger = require('../utils/logger');

let pool = null;

/**
 * Initialize database connection pool
 */
function initDatabase() {
    if (pool) {
        return pool;
    }

    const dbConfig = {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: config.database.poolSize || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };

    pool = new Pool(dbConfig);

    pool.on('error', (err) => {
        logger.error('Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
        logger.debug('Database client connected');
    });

    // Test connection
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            logger.error('Database connection test failed', err);
        } else {
            logger.info('Database connected successfully');
        }
    });

    return pool;
}

/**
 * Get database pool
 */
function getPool() {
    if (!pool) {
        return initDatabase();
    }
    return pool;
}

/**
 * Execute a query
 */
async function query(text, params) {
    const pool = getPool();
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        logger.error('Query error', { text, error: error.message });
        throw error;
    }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Close database connection
 */
async function close() {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('Database connection closed');
    }
}

module.exports = {
    initDatabase,
    getPool,
    query,
    transaction,
    close
};

