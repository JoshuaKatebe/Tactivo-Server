/**
 * PTS Remote Server Routes
 * Handles incoming data pushed from PTS-2 controller (Remote Server mode)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../lib/db');

/**
 * Middleware to log incoming PTS requests
 */
router.use((req, res, next) => {
    // Only log if it's a PTS request (check typical headers or body structure if possible)
    if (req.method === 'POST') {
        logger.debug('Received PTS Remote Request', {
            path: req.path,
            ip: req.ip,
            contentLength: req.get('content-length')
        });
    }
    next();
});

/**
 * Handle Packet Processing
 * Shared logic for processing jsonPTS packets
 */
async function processPtsPackets(req, res, type) {
    try {
        const fuelService = req.app.locals.fuelService;

        // If fuel service isn't running (e.g. cloud mode), we might still need to process data
        // For now, we'll assume we need to pass it to the service or save it directly

        const { Packets, Protocol } = req.body;

        if (!Packets || !Array.isArray(Packets)) {
            return res.status(400).json({ error: true, message: 'Invalid PTS format: Missing Packets array' });
        }

        logger.info(`Processing ${Packets.length} PTS packets`, { type });

        const results = [];

        for (const packet of Packets) {
            try {
                // If we have a fuelService instance, let it handle the state update
                if (fuelService) {
                    await fuelService.handleRemotePacket(packet);
                }
                // TODO: If no fuelService (cloud only), we should implement direct DB saving here

                results.push({ Id: packet.Id, Error: false, Code: 0 });
            } catch (err) {
                logger.error('Error processing packet', { id: packet.Id, error: err.message });
                results.push({ Id: packet.Id, Error: true, Message: err.message });
            }
        }

        // Return response in jsonPTS format
        res.json({
            Protocol: Protocol || 'jsonPTS',
            Packets: results
        });

    } catch (error) {
        logger.error(`Error processing ${type} request`, error);
        res.status(500).json({
            Protocol: 'jsonPTS',
            Packets: [{ Id: 0, Error: true, Message: 'Internal Server Error' }]
        });
    }
}

// Transaction Upload Endpoint
router.post('/transactions', async (req, res) => {
    await processPtsPackets(req, res, 'transactions');
});

// Tank Measurements Upload Endpoint
router.post('/tanks', async (req, res) => {
    await processPtsPackets(req, res, 'tanks');
});

// Status Upload Endpoint
router.post('/status', async (req, res) => {
    await processPtsPackets(req, res, 'status');
});

// Generic/Debug Endpoint (for testing or misconfigured URIs)
router.post('/debug', async (req, res) => {
    logger.info('Received generic PTS debug push', { body: JSON.stringify(req.body, null, 2) });
    await processPtsPackets(req, res, 'debug');
});

module.exports = router;
