/**
 * PTS Controllers Routes
 * @swagger
 * tags:
 *   - name: PTS Controllers
 *     description: PTS controller registry
 */

const express = require('express');
const router = express.Router();
const ptsControllerService = require('../services/pts-controller.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/pts-controllers:
 *   get:
 *     summary: Get all PTS controllers
 *     tags: [PTS Controllers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of PTS controllers
 *   post:
 *     summary: Create a new PTS controller
 *     tags: [PTS Controllers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - station_id
 *               - hostname
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               identifier:
 *                 type: string
 *                 example: "PTS-001"
 *               hostname:
 *                 type: string
 *                 example: "192.168.1.117"
 *               port:
 *                 type: integer
 *                 example: 443
 *               http_auth:
 *                 type: object
 *     responses:
 *       201:
 *         description: PTS controller created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id
        };
        
        const controllers = await ptsControllerService.getAll(filters);
        res.json({
            error: false,
            data: controllers
        });
    } catch (error) {
        logger.error('Error getting PTS controllers', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get PTS controllers'
        });
    }
});

/**
 * @swagger
 * /api/pts-controllers/{id}:
 *   get:
 *     summary: Get PTS controller by ID
 *     tags: [PTS Controllers]
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
 *         description: PTS controller details
 *       404:
 *         description: PTS controller not found
 *   put:
 *     summary: Update PTS controller
 *     tags: [PTS Controllers]
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
 *               identifier:
 *                 type: string
 *               hostname:
 *                 type: string
 *               port:
 *                 type: integer
 *               http_auth:
 *                 type: object
 *     responses:
 *       200:
 *         description: PTS controller updated
 *       404:
 *         description: PTS controller not found
 *   delete:
 *     summary: Delete PTS controller
 *     tags: [PTS Controllers]
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
 *         description: PTS controller deleted
 *       404:
 *         description: PTS controller not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const controller = await ptsControllerService.getById(req.params.id);
        
        if (!controller) {
            return res.status(404).json({
                error: true,
                message: 'PTS controller not found'
            });
        }

        res.json({
            error: false,
            data: controller
        });
    } catch (error) {
        logger.error('Error getting PTS controller', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get PTS controller'
        });
    }
});

/**
 * POST /api/pts-controllers
 * Create PTS controller
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            identifier,
            hostname,
            port,
            http_auth
        } = req.body;

        if (!station_id || !hostname) {
            return res.status(400).json({
                error: true,
                message: 'Station ID and hostname are required'
            });
        }

        const controller = await ptsControllerService.create({
            station_id, identifier, hostname, port, http_auth
        });
        
        res.status(201).json({
            error: false,
            data: controller
        });
    } catch (error) {
        logger.error('Error creating PTS controller', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create PTS controller'
        });
    }
});

/**
 * PUT /api/pts-controllers/:id
 * Update PTS controller
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const controller = await ptsControllerService.update(req.params.id, req.body);
        
        if (!controller) {
            return res.status(404).json({
                error: true,
                message: 'PTS controller not found'
            });
        }

        res.json({
            error: false,
            data: controller
        });
    } catch (error) {
        logger.error('Error updating PTS controller', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update PTS controller'
        });
    }
});

/**
 * DELETE /api/pts-controllers/:id
 * Delete PTS controller
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const controller = await ptsControllerService.delete(req.params.id);
        
        if (!controller) {
            return res.status(404).json({
                error: true,
                message: 'PTS controller not found'
            });
        }

        res.json({
            error: false,
            message: 'PTS controller deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting PTS controller', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete PTS controller'
        });
    }
});

module.exports = router;

