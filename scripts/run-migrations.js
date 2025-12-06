/**
 * Run database migrations
 * Usage: node scripts/run-migrations.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/config');
const logger = require('../utils/logger');

async function runMigrations() {
    const pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        logger.info('Running database migrations...');
        
        // Execute migration
        await pool.query(migrationSQL);
        
        logger.info('✅ Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();

