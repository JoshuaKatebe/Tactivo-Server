/**
 * Pumps Routes
 * @swagger
 * tags:
 *   - name: Pumps
 *     description: Pump configuration
 */

const express = require('express');
const router = express.Router();
const pumpService = require('../services/pump.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/pumps:
 *   get:
 *     summary: Get all pumps (with nozzles)
 *     tags: [Pumps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of pumps
 *   post:
 *     summary: Create a new pump (with optional nozzles)
 *     tags: [Pumps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pts_id
 *               - pump_number
 *             properties:
 *               pts_id:
 *                 type: string
 *                 format: uuid
 *               pump_number:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "Pump 1"
 *               active:
 *                 type: boolean
 *                 default: true
 *               nozzles:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Pump created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            active: req.query.active !== undefined ? req.query.active === 'true' : undefined
        };
        
        const pumps = await pumpService.getAll(filters);
        res.json({
            error: false,
            data: pumps
        });
    } catch (error) {
        logger.error('Error getting pumps', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pumps'
        });
    }
});

/**
 * @swagger
 * /api/pumps/{id}:
 *   get:
 *     summary: Get pump by ID (with nozzles)
 *     tags: [Pumps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pump details
 *       404:
 *         description: Pump not found
 *   put:
 *     summary: Update pump
 *     tags: [Pumps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Pump updated
 *       404:
 *         description: Pump not found
 *   delete:
 *     summary: Delete pump
 *     tags: [Pumps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pump deleted
 *       404:
 *         description: Pump not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const pump = await pumpService.getById(req.params.id);
        
        if (!pump) {
            return res.status(404).json({
                error: true,
                message: 'Pump not found'
            });
        }

        res.json({
            error: false,
            data: pump
        });
    } catch (error) {
        logger.error('Error getting pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump'
        });
    }
});

/**
 * POST /api/pumps
 * Create pump (with optional nozzles)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            pts_id,
            pump_number,
            name,
            active,
            nozzles
        } = req.body;

        if (!pts_id || !pump_number) {
            return res.status(400).json({
                error: true,
                message: 'PTS ID and pump number are required'
            });
        }

        const pump = await pumpService.create({
            pts_id, pump_number, name, active, nozzles
        });
        
        res.status(201).json({
            error: false,
            data: pump
        });
    } catch (error) {
        logger.error('Error creating pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create pump'
        });
    }
});

/**
 * PUT /api/pumps/:id
 * Update pump
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const pump = await pumpService.update(req.params.id, req.body);
        
        if (!pump) {
            return res.status(404).json({
                error: true,
                message: 'Pump not found'
            });
        }

        res.json({
            error: false,
            data: pump
        });
    } catch (error) {
        logger.error('Error updating pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update pump'
        });
    }
});

/**
 * DELETE /api/pumps/:id
 * Delete pump
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const pump = await pumpService.delete(req.params.id);
        
        if (!pump) {
            return res.status(404).json({
                error: true,
                message: 'Pump not found'
            });
        }

        res.json({
            error: false,
            message: 'Pump deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete pump'
        });
    }
});

module.exports = router;

