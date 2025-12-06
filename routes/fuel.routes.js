/**
 * Fuel Routes - REST API endpoints for fuel operations
 * @swagger
 * tags:
 *   - name: Fuel
 *     description: PTS pump control and monitoring
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/fuel/pumps:
 *   get:
 *     summary: Get status of all pumps
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pump statuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/PumpStatus'
 */
router.get('/pumps', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        
        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const statuses = fuelService.getPumpStatuses();
        res.json({
            error: false,
            data: statuses
        });
    } catch (error) {
        logger.error('Error getting pump statuses', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump statuses'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}:
 *   get:
 *     summary: Get status of a specific pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *     responses:
 *       200:
 *         description: Pump status
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const status = await fuelService.getPumpStatus(pumpNumber);
        
        if (!status) {
            return res.status(404).json({
                error: true,
                message: 'Pump not found or not responding'
            });
        }

        res.json({
            error: false,
            data: status
        });
    } catch (error) {
        logger.error('Error getting pump status', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump status'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/authorize:
 *   post:
 *     summary: Authorize a pump for fueling
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nozzleNumber
 *             properties:
 *               nozzleNumber:
 *                 type: integer
 *                 example: 1
 *               presetType:
 *                 type: string
 *                 enum: [Volume, Amount]
 *               presetDose:
 *                 type: number
 *                 example: 20.0
 *               price:
 *                 type: number
 *                 example: 1.65
 *     responses:
 *       200:
 *         description: Pump authorized successfully
 *       400:
 *         description: Invalid request
 */
router.post('/pumps/:pumpNumber/authorize', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const { nozzleNumber, presetType, presetDose, price } = req.body;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        if (!nozzleNumber || isNaN(parseInt(nozzleNumber, 10))) {
            return res.status(400).json({
                error: true,
                message: 'Nozzle number is required'
            });
        }

        const result = await fuelService.authorizePump(
            pumpNumber,
            parseInt(nozzleNumber, 10),
            presetType || null,
            presetDose || null,
            price || null
        );

        res.json({
            error: false,
            message: 'Pump authorized successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error authorizing pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to authorize pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/stop:
 *   post:
 *     summary: Stop a pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump stopped successfully
 *       400:
 *         description: Invalid pump number
 */
router.post('/pumps/:pumpNumber/stop', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const result = await fuelService.stopPump(pumpNumber);

        res.json({
            error: false,
            message: 'Pump stopped successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error stopping pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to stop pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/emergency-stop:
 *   post:
 *     summary: Emergency stop a pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump emergency stopped
 *       400:
 *         description: Invalid pump number
 */
router.post('/pumps/:pumpNumber/emergency-stop', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const result = await fuelService.emergencyStopPump(pumpNumber);

        res.json({
            error: false,
            message: 'Pump emergency stopped successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error emergency stopping pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to emergency stop pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/totals:
 *   get:
 *     summary: Get pump totals (shift totals)
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: nozzle
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Pump totals
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber/totals', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const nozzleNumber = parseInt(req.query.nozzle || '1', 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const totals = await fuelService.getPumpTotals(pumpNumber, nozzleNumber);

        if (!totals) {
            return res.status(404).json({
                error: true,
                message: 'Totals not found'
            });
        }

        res.json({
            error: false,
            data: totals
        });
    } catch (error) {
        logger.error('Error getting pump totals', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump totals'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/prices:
 *   get:
 *     summary: Get pump prices
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump prices
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber/prices', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const prices = await fuelService.getPumpPrices(pumpNumber);

        if (!prices) {
            return res.status(404).json({
                error: true,
                message: 'Prices not found'
            });
        }

        res.json({
            error: false,
            data: prices
        });
    } catch (error) {
        logger.error('Error getting pump prices', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump prices'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/prices:
 *   post:
 *     summary: Update pump prices
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prices
 *             properties:
 *               prices:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [1.65, 1.70, 1.75]
 *     responses:
 *       200:
 *         description: Prices updated successfully
 *       400:
 *         description: Invalid request
 */
router.post('/pumps/:pumpNumber/prices', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const { prices } = req.body;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        if (!prices || !Array.isArray(prices)) {
            return res.status(400).json({
                error: true,
                message: 'Prices array is required'
            });
        }

        const result = await fuelService.setPumpPrices(pumpNumber, prices);

        res.json({
            error: false,
            message: 'Pump prices updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error setting pump prices', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to set pump prices'
        });
    }
});

/**
 * @swagger
 * /api/fuel/tanks:
 *   get:
 *     summary: Get tank levels
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tank levels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       Tank:
 *                         type: integer
 *                       Level:
 *                         type: number
 *                       Volume:
 *                         type: number
 *                       Temperature:
 *                         type: number
 */
router.get('/tanks', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const statuses = fuelService.getTankStatuses();
        res.json({
            error: false,
            data: statuses
        });
    } catch (error) {
        logger.error('Error getting tank statuses', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get tank statuses'
        });
    }
});

module.exports = router;

