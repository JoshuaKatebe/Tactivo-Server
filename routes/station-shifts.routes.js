/**
 * Station Shifts Routes - PTS hardware shifts
 * @swagger
 * tags:
 *   - name: Station Shifts
 *     description: PTS hardware shift management
 */

const express = require('express');
const router = express.Router();
const stationShiftService = require('../services/station-shift.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/station-shifts:
 *   get:
 *     summary: Get all station shifts
 *     tags: [Station Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of station shifts
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            status: req.query.status,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100
        };
        
        const shifts = await stationShiftService.getAll(filters);
        res.json({
            error: false,
            data: shifts
        });
    } catch (error) {
        logger.error('Error getting station shifts', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get station shifts'
        });
    }
});

/**
 * @swagger
 * /api/station-shifts/open:
 *   get:
 *     summary: Get open shift for station
 *     tags: [Station Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Open shift details
 *       404:
 *         description: No open shift found
 */
router.get('/open', authenticate, async (req, res) => {
    try {
        const { station_id } = req.query;

        if (!station_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID is required'
            });
        }

        const shift = await stationShiftService.getOpenShift(station_id);
        
        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'No open shift found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error getting open shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get open shift'
        });
    }
});

/**
 * @swagger
 * /api/station-shifts/{id}:
 *   get:
 *     summary: Get station shift by ID
 *     tags: [Station Shifts]
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
 *         description: Station shift details
 *       404:
 *         description: Station shift not found
 *   put:
 *     summary: Update station shift
 *     tags: [Station Shifts]
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
 *     responses:
 *       200:
 *         description: Station shift updated
 *       404:
 *         description: Station shift not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const shift = await stationShiftService.getById(req.params.id);
        
        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Station shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error getting station shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get station shift'
        });
    }
});

/**
 * @swagger
 * /api/station-shifts/start:
 *   post:
 *     summary: Start new PTS shift
 *     tags: [Station Shifts]
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
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               pts_shift_number:
 *                 type: integer
 *               opened_by_employee_id:
 *                 type: string
 *                 format: uuid
 *               configuration_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Shift started
 *       400:
 *         description: Missing required fields or shift already open
 */
router.post('/start', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            pts_shift_number,
            opened_by_employee_id,
            configuration_id
        } = req.body;

        if (!station_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID is required'
            });
        }

        // Check if there's already an open shift
        const existingShift = await stationShiftService.getOpenShift(station_id);
        if (existingShift) {
            return res.status(400).json({
                error: true,
                message: 'Station already has an open shift',
                data: existingShift
            });
        }

        const shift = await stationShiftService.startShift({
            station_id,
            pts_shift_number,
            opened_by_employee_id,
            configuration_id
        });

        res.status(201).json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error starting station shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to start station shift'
        });
    }
});

/**
 * @swagger
 * /api/station-shifts/{id}/end:
 *   post:
 *     summary: End PTS shift
 *     tags: [Station Shifts]
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
 *               uploaded:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Shift ended
 *       404:
 *         description: Shift not found
 */
router.post('/:id/end', authenticate, async (req, res) => {
    try {
        const {
            uploaded
        } = req.body;

        const shift = await stationShiftService.endShift(req.params.id, {
            uploaded
        });

        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Station shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error ending station shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to end station shift'
        });
    }
});

/**
 * PUT /api/station-shifts/:id
 * Update station shift
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const shift = await stationShiftService.update(req.params.id, req.body);
        
        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Station shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error updating station shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update station shift'
        });
    }
});

module.exports = router;

