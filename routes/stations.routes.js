/**
 * Stations Routes
 * @swagger
 * tags:
 *   - name: Stations
 *     description: Station management
 */

const express = require('express');
const router = express.Router();
const stationService = require('../services/station.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: Get all stations
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by company ID
 *     responses:
 *       200:
 *         description: List of stations
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
 *                     $ref: '#/components/schemas/Station'
 *   post:
 *     summary: Create a new station
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - code
 *               - name
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               code:
 *                 type: string
 *                 example: "ST001"
 *               name:
 *                 type: string
 *                 example: "Main Station"
 *               address:
 *                 type: string
 *               timezone:
 *                 type: string
 *                 example: "Africa/Nairobi"
 *               pts_hostname:
 *                 type: string
 *                 example: "192.168.1.117"
 *               pts_port:
 *                 type: integer
 *                 example: 443
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Station created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const companyId = req.query.company_id;
        const stations = await stationService.getAll(companyId);
        res.json({
            error: false,
            data: stations
        });
    } catch (error) {
        logger.error('Error getting stations', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get stations'
        });
    }
});

/**
 * @swagger
 * /api/stations/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Stations]
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
 *         description: Station details
 *       404:
 *         description: Station not found
 *   put:
 *     summary: Update station
 *     tags: [Stations]
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
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               timezone:
 *                 type: string
 *               pts_hostname:
 *                 type: string
 *               pts_port:
 *                 type: integer
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Station updated
 *       404:
 *         description: Station not found
 *   delete:
 *     summary: Delete station
 *     tags: [Stations]
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
 *         description: Station deleted
 *       404:
 *         description: Station not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const station = await stationService.getById(req.params.id);
        
        if (!station) {
            return res.status(404).json({
                error: true,
                message: 'Station not found'
            });
        }

        res.json({
            error: false,
            data: station
        });
    } catch (error) {
        logger.error('Error getting station', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get station'
        });
    }
});

/**
 * POST /api/stations
 * Create station
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { company_id, code, name, address, timezone, pts_hostname, pts_port, config } = req.body;

        if (!company_id || !code || !name) {
            return res.status(400).json({
                error: true,
                message: 'Company ID, code, and name are required'
            });
        }

        const station = await stationService.create({
            company_id, code, name, address, timezone, pts_hostname, pts_port, config
        });
        res.status(201).json({
            error: false,
            data: station
        });
    } catch (error) {
        logger.error('Error creating station', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create station'
        });
    }
});

/**
 * PUT /api/stations/:id
 * Update station
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const station = await stationService.update(req.params.id, req.body);
        
        if (!station) {
            return res.status(404).json({
                error: true,
                message: 'Station not found'
            });
        }

        res.json({
            error: false,
            data: station
        });
    } catch (error) {
        logger.error('Error updating station', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update station'
        });
    }
});

/**
 * DELETE /api/stations/:id
 * Delete station
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const station = await stationService.delete(req.params.id);
        
        if (!station) {
            return res.status(404).json({
                error: true,
                message: 'Station not found'
            });
        }

        res.json({
            error: false,
            message: 'Station deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting station', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete station'
        });
    }
});

module.exports = router;

