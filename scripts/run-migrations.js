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
    console.log('🔌 Connecting to database:', {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        ssl: config.database.ssl
    });

    const pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });

    try {
        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (files.length === 0) {
            logger.warn('⚠️ No migration files found');
            return;
        }

        logger.info(`Found ${files.length} migration files: ${files.join(', ')}`);

        // Execute each migration
        for (const file of files) {
            const migrationPath = path.join(migrationsDir, file);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            logger.info(`🚀 Executing migration: ${file}`);
            await pool.query(migrationSQL);
            logger.info(`✅ Completed: ${file}`);
        }

        logger.info('🎉 All migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();

