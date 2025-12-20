/**
 * PTS Remote Server Routes
 * Handles incoming data pushed from PTS-2 controller (Remote Server mode)
 * 
 * These endpoints receive HTTP POST requests from the PTS-2 controller
 * when configured in "Upload to Remote Server" mode.
 * 
 * @swagger
 * tags:
 *   - name: PTS Remote
 *     description: Listener endpoints for PTS-2 Controller push data
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Get the appropriate service for handling PTS packets
 * Uses fuelService if available (local mode), otherwise uses ptsRemoteService (cloud mode)
 */
function getPacketHandler(req) {
    const fuelService = req.app.locals.fuelService;
    const ptsRemoteService = req.app.locals.ptsRemoteService;

    // Prefer fuelService if available (local mode with PTS connection)
    if (fuelService) {
        return {
            service: fuelService,
            isLocal: true
        };
    }

    // Use ptsRemoteService for cloud mode
    if (ptsRemoteService) {
        return {
            service: ptsRemoteService,
            isLocal: false
        };
    }

    return null;
}

/**
 * Middleware to log incoming PTS requests
 */
router.use((req, res, next) => {
    if (req.method === 'POST') {
        logger.info('📡 Received PTS Remote Request', {
            path: req.path,
            ip: req.ip,
            contentType: req.get('content-type'),
            contentLength: req.get('content-length'),
            userAgent: req.get('user-agent')
        });
    }
    next();
});

/**
 * Basic Authentication middleware for PTS-2 controller
 * PTS-2 uses HTTP Basic Auth with credentials configured in its settings
 */
function authenticatePTS(req, res, next) {
    // Skip auth in development or if not configured
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_PTS_AUTH === 'true') {
        return next();
    }

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
        // PTS-2 might not send auth on first request - allow through with warning
        logger.warn('PTS request without authentication', { ip: req.ip });
        return next(); // Allow through for compatibility
    }

    try {
        const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
        const [username, password] = credentials.split(':');

        const validUser = config.ptsRemote?.username || 'admin';
        const validPass = config.ptsRemote?.password || 'admin';

        if (username === validUser && password === validPass) {
            next();
        } else {
            logger.warn('Invalid PTS credentials', { username, ip: req.ip });
            res.status(401).json({
                Protocol: 'jsonPTS',
                Packets: [{ Id: 0, Error: true, Message: 'Invalid credentials' }]
            });
        }
    } catch (error) {
        logger.error('Error parsing auth header', { error: error.message });
        next(); // Allow through on parse error
    }
}

/**
 * Handle Packet Processing
 * Shared logic for processing jsonPTS packets
 */
async function processPtsPackets(req, res, type) {
    try {
        const handler = getPacketHandler(req);
        const { Packets, Protocol } = req.body;

        // Log the raw body for debugging
        logger.debug('PTS Request Body', {
            type,
            protocol: Protocol,
            packetCount: Packets?.length,
            hasHandler: !!handler
        });

        if (!Packets || !Array.isArray(Packets)) {
            logger.warn('Invalid PTS format received', { body: JSON.stringify(req.body).substring(0, 500) });
            return res.status(400).json({
                Protocol: 'jsonPTS',
                Packets: [{ Id: 0, Error: true, Message: 'Invalid PTS format: Missing Packets array' }]
            });
        }

        logger.info(`Processing ${Packets.length} PTS packets`, { type });

        let results = [];

        if (handler) {
            if (handler.isLocal) {
                // Use fuelService.handleRemotePacket for each packet
                for (const packet of Packets) {
                    try {
                        await handler.service.handleRemotePacket(packet);
                        results.push({ Id: packet.Id, Error: false, Code: 0 });
                    } catch (err) {
                        logger.error('Error processing packet via fuelService', { id: packet.Id, error: err.message });
                        results.push({ Id: packet.Id, Error: true, Message: err.message });
                    }
                }
            } else {
                // Use ptsRemoteService.processPackets
                results = await handler.service.processPackets(Packets);
            }
        } else {
            // No handler available - just acknowledge
            logger.warn('No packet handler available - data not processed');
            results = Packets.map(p => ({ Id: p.Id, Error: false, Code: 0, Warning: 'No handler' }));
        }

        // Return response in jsonPTS format
        res.json({
            Protocol: Protocol || 'jsonPTS',
            Packets: results
        });

    } catch (error) {
        logger.error(`Error processing ${type} request`, { error: error.message, stack: error.stack });
        res.status(500).json({
            Protocol: 'jsonPTS',
            Packets: [{ Id: 0, Error: true, Message: 'Internal Server Error' }]
        });
    }
}

// Apply authentication to all routes
router.use(authenticatePTS);

/**
 * @swagger
 * /api/pts/transactions:
 *   post:
 *     summary: Receive pump transaction records
 *     description: Endpoint for PTS controller to upload completed pump transactions
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Protocol:
 *                 type: string
 *                 example: jsonPTS
 *               Packets:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                     Type:
 *                       type: string
 *                       example: PumpTransaction
 *                     Data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Acknowledgment with processing results
 */
router.post('/transactions', async (req, res) => {
    await processPtsPackets(req, res, 'transactions');
});

/**
 * @swagger
 * /api/pts/tanks:
 *   post:
 *     summary: Receive tank measurements
 *     description: Endpoint for PTS controller to upload tank/probe measurements
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/tanks', async (req, res) => {
    await processPtsPackets(req, res, 'tanks');
});

/**
 * @swagger
 * /api/pts/status:
 *   post:
 *     summary: Receive real-time status updates
 *     description: Endpoint for PTS controller to upload real-time pump and device status
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/status', async (req, res) => {
    await processPtsPackets(req, res, 'status');
});

/**
 * @swagger
 * /api/pts/deliveries:
 *   post:
 *     summary: Receive in-tank delivery records
 *     description: Endpoint for PTS controller to upload in-tank delivery data
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/deliveries', async (req, res) => {
    await processPtsPackets(req, res, 'deliveries');
});

/**
 * @swagger
 * /api/pts/alerts:
 *   post:
 *     summary: Receive alert records
 *     description: Endpoint for PTS controller to upload alert/alarm records
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/alerts', async (req, res) => {
    await processPtsPackets(req, res, 'alerts');
});

/**
 * @swagger
 * /api/pts/gps:
 *   post:
 *     summary: Receive GPS records
 *     description: Endpoint for PTS controller to upload GPS tracking data (fuel trucks)
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/gps', async (req, res) => {
    await processPtsPackets(req, res, 'gps');
});

/**
 * @swagger
 * /api/pts/configuration:
 *   post:
 *     summary: Receive configuration updates
 *     description: Endpoint for PTS controller to upload its configuration
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/configuration', async (req, res) => {
    await processPtsPackets(req, res, 'configuration');
});

/**
 * @swagger
 * /api/pts/payments:
 *   post:
 *     summary: Receive payment records
 *     description: Endpoint for PTS controller to upload payment records
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/payments', async (req, res) => {
    await processPtsPackets(req, res, 'payments');
});

/**
 * @swagger
 * /api/pts/shifts:
 *   post:
 *     summary: Receive working shift records
 *     description: Endpoint for PTS controller to upload working shift data
 *     tags: [PTS Remote]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/shifts', async (req, res) => {
    await processPtsPackets(req, res, 'shifts');
});

/**
 * @swagger
 * /api/pts/debug:
 *   post:
 *     summary: Debug endpoint for any PTS push
 *     description: Catches any PTS push and logs it for debugging
 *     tags: [PTS Remote]
 *     responses:
 *       200:
 *         description: Acknowledgment
 */
router.post('/debug', async (req, res) => {
    logger.info('🔧 Debug PTS push received', {
        body: JSON.stringify(req.body, null, 2).substring(0, 2000)
    });
    await processPtsPackets(req, res, 'debug');
});

/**
 * @swagger
 * /api/pts/health:
 *   get:
 *     summary: Health check for PTS remote endpoint
 *     tags: [PTS Remote]
 *     responses:
 *       200:
 *         description: Service status
 */
router.get('/health', (req, res) => {
    const handler = getPacketHandler(req);
    res.json({
        status: 'ok',
        mode: handler?.isLocal ? 'local' : 'cloud',
        hasHandler: !!handler,
        timestamp: new Date().toISOString()
    });
});

/**
 * @swagger
 * /api/pts/devices:
 *   get:
 *     summary: Get connected PTS devices status
 *     tags: [PTS Remote]
 *     responses:
 *       200:
 *         description: List of known devices and their status
 */
router.get('/devices', (req, res) => {
    const ptsRemoteService = req.app.locals.ptsRemoteService;

    if (!ptsRemoteService) {
        return res.json({
            mode: 'local',
            message: 'Running in local mode - use /api/fuel/* endpoints'
        });
    }

    res.json({
        mode: 'cloud',
        pumps: ptsRemoteService.getPumpStatuses(),
        tanks: ptsRemoteService.getTankStatuses()
    });
});

/**
 * Catch-all for any other PTS paths - useful for discovering what the controller sends
 */
router.all('*', (req, res) => {
    logger.info('📦 Unknown PTS endpoint accessed', {
        method: req.method,
        path: req.path,
        body: req.body ? JSON.stringify(req.body).substring(0, 500) : 'none'
    });

    if (req.method === 'POST') {
        // Try to process as generic jsonPTS
        processPtsPackets(req, res, 'unknown');
    } else {
        res.json({
            Protocol: 'jsonPTS',
            Packets: [{
                Id: 0,
                Type: 'Info',
                Data: {
                    Message: 'Tactivo PTS Remote Server',
                    Endpoints: [
                        '/api/pts/transactions',
                        '/api/pts/tanks',
                        '/api/pts/status',
                        '/api/pts/deliveries',
                        '/api/pts/alerts',
                        '/api/pts/configuration'
                    ]
                }
            }]
        });
    }
});

module.exports = router;
