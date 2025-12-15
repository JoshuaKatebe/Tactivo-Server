/**
 * PTS Debug listener to capture raw payloads from controller
 * Usage: POST /api/pts/debug-raw
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Log received requests to a file for debugging
router.post('/debug-raw', async (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logEntry = {
        timestamp,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
        method: req.method,
        path: req.path
    };

    console.log('=== RAW PTS DEBUG REQUEST ===');
    console.log(JSON.stringify(logEntry, null, 2));
    console.log('=== END RAW PTS DEBUG ===');

    // For now, just log to console
    logger.info('DEBUG RAW PTS', logEntry);

    // Return a standardized jsonPTS response
    const responsePackets = [];
    if (req.body.Packets && Array.isArray(req.body.Packets)) {
        for (const packet of req.body.Packets) {
            responsePackets.push({
                Id: packet.Id || 0,
                Type: packet.Type || 'Acknowledgment',
                Data: {},
                Error: false
            });
        }
    }

    res.json({
        Protocol: req.body.Protocol || 'jsonPTS',
        Packets: responsePackets.length > 0 ? responsePackets : [{ Id: 0, Type: 'Acknowledgment', Data: {}, Error: false }]
    });
});

module.exports = router;
