/**
 * Logger Utility
 * Simple logging utility for the application
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure logs directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const currentLevel = logLevels[config.logging.level] || logLevels.info;

function formatTimestamp() {
    return new Date().toISOString();
}

function formatMessage(level, message, meta = {}) {
    const timestamp = formatTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
}

function writeLog(level, message, meta) {
    if (logLevels[level] <= currentLevel) {
        const logMessage = formatMessage(level, message, meta);
        
        // Console output
        if (level === 'error') {
            console.error(logMessage.trim());
        } else if (level === 'warn') {
            console.warn(logMessage.trim());
        } else {
            console.log(logMessage.trim());
        }
        
        // File output
        try {
            fs.appendFileSync(config.logging.file, logMessage);
        } catch (error) {
            console.error('Failed to write to log file', error);
        }
    }
}

const logger = {
    error: (message, meta) => writeLog('error', message, meta),
    warn: (message, meta) => writeLog('warn', message, meta),
    info: (message, meta) => writeLog('info', message, meta),
    debug: (message, meta) => writeLog('debug', message, meta)
};

module.exports = logger;

