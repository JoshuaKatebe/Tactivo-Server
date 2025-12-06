/**
 * Nozzles Routes
 * @swagger
 * tags:
 *   - name: Nozzles
 *     description: Nozzle configuration
 */

const express = require('express');
const router = express.Router();
const nozzleService = require('../services/nozzle.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/nozzles:
 *   get:
 *     summary: Get all nozzles
 *     tags: [Nozzles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pump_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of nozzles
 *   post:
 *     summary: Create a new nozzle
 *     tags: [Nozzles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pump_id
 *               - nozzle_number
 *             properties:
 *               pump_id:
 *                 type: string
 *                 format: uuid
 *               nozzle_number:
 *                 type: integer
 *                 example: 1
 *               fuel_grade_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Nozzle created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            pump_id: req.query.pump_id,
            station_id: req.query.station_id
        };
        
        const nozzles = await nozzleService.getAll(filters);
        res.json({
            error: false,
            data: nozzles
        });
    } catch (error) {
        logger.error('Error getting nozzles', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get nozzles'
        });
    }
});

/**
 * @swagger
 * /api/nozzles/{id}:
 *   get:
 *     summary: Get nozzle by ID
 *     tags: [Nozzles]
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
 *         description: Nozzle details
 *       404:
 *         description: Nozzle not found
 *   put:
 *     summary: Update nozzle
 *     tags: [Nozzles]
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
 *               fuel_grade_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Nozzle updated
 *       404:
 *         description: Nozzle not found
 *   delete:
 *     summary: Delete nozzle
 *     tags: [Nozzles]
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
 *         description: Nozzle deleted
 *       404:
 *         description: Nozzle not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const nozzle = await nozzleService.getById(req.params.id);
        
        if (!nozzle) {
            return res.status(404).json({
                error: true,
                message: 'Nozzle not found'
            });
        }

        res.json({
            error: false,
            data: nozzle
        });
    } catch (error) {
        logger.error('Error getting nozzle', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get nozzle'
        });
    }
});

/**
 * POST /api/nozzles
 * Create nozzle
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            pump_id,
            nozzle_number,
            fuel_grade_id
        } = req.body;

        if (!pump_id || !nozzle_number) {
            return res.status(400).json({
                error: true,
                message: 'Pump ID and nozzle number are required'
            });
        }

        const nozzle = await nozzleService.create({
            pump_id, nozzle_number, fuel_grade_id
        });
        
        res.status(201).json({
            error: false,
            data: nozzle
        });
    } catch (error) {
        logger.error('Error creating nozzle', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create nozzle'
        });
    }
});

/**
 * PUT /api/nozzles/:id
 * Update nozzle
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const nozzle = await nozzleService.update(req.params.id, req.body);
        
        if (!nozzle) {
            return res.status(404).json({
                error: true,
                message: 'Nozzle not found'
            });
        }

        res.json({
            error: false,
            data: nozzle
        });
    } catch (error) {
        logger.error('Error updating nozzle', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update nozzle'
        });
    }
});

/**
 * DELETE /api/nozzles/:id
 * Delete nozzle
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const nozzle = await nozzleService.delete(req.params.id);
        
        if (!nozzle) {
            return res.status(404).json({
                error: true,
                message: 'Nozzle not found'
            });
        }

        res.json({
            error: false,
            message: 'Nozzle deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting nozzle', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete nozzle'
        });
    }
});

module.exports = router;

