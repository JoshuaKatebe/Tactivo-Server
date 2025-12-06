/**
 * Employee Shifts Routes
 * @swagger
 * tags:
 *   - name: Shifts
 *     description: Employee shift management
 */

const express = require('express');
const router = express.Router();
const employeeShiftService = require('../services/employee-shift.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: Get all shifts
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, closed]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of shifts
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            employee_id: req.query.employee_id,
            status: req.query.status,
            limit: parseInt(req.query.limit) || 100
        };
        
        const shifts = await employeeShiftService.getAll(filters);
        res.json({
            error: false,
            data: shifts
        });
    } catch (error) {
        logger.error('Error getting shifts', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get shifts'
        });
    }
});

/**
 * @swagger
 * /api/shifts/open:
 *   get:
 *     summary: Get open shift for employee
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employee_id
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
        const { station_id, employee_id } = req.query;

        if (!station_id || !employee_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID and employee ID are required'
            });
        }

        const shift = await employeeShiftService.getOpenShift(employee_id, station_id);
        
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
 * /api/shifts/{id}:
 *   get:
 *     summary: Get shift by ID
 *     tags: [Shifts]
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
 *         description: Shift details
 *       404:
 *         description: Shift not found
 *   put:
 *     summary: Update shift
 *     tags: [Shifts]
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
 *         description: Shift updated
 *       404:
 *         description: Shift not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const shift = await employeeShiftService.getById(req.params.id);
        
        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error getting shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get shift'
        });
    }
});

/**
 * @swagger
 * /api/shifts/start:
 *   post:
 *     summary: Start a new shift
 *     tags: [Shifts]
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
 *               - employee_id
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               employee_id:
 *                 type: string
 *                 format: uuid
 *               station_shift_id:
 *                 type: string
 *                 format: uuid
 *               opening_totals:
 *                 type: object
 *               opening_cash:
 *                 type: number
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
            employee_id,
            station_shift_id,
            opening_totals,
            opening_cash
        } = req.body;

        if (!station_id || !employee_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID and employee ID are required'
            });
        }

        // Check if there's already an open shift
        const existingShift = await employeeShiftService.getOpenShift(employee_id, station_id);
        if (existingShift) {
            return res.status(400).json({
                error: true,
                message: 'Employee already has an open shift',
                data: existingShift
            });
        }

        const shift = await employeeShiftService.startShift({
            station_id,
            employee_id,
            station_shift_id,
            opening_totals,
            opening_cash
        });

        res.status(201).json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error starting shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to start shift'
        });
    }
});

/**
 * @swagger
 * /api/shifts/{id}/end:
 *   post:
 *     summary: End a shift
 *     tags: [Shifts]
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
 *               closing_totals:
 *                 type: object
 *               closing_cash:
 *                 type: number
 *               cleared:
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
            closing_totals,
            closing_cash,
            cleared
        } = req.body;

        const shift = await employeeShiftService.endShift(req.params.id, {
            closing_totals,
            closing_cash,
            cleared
        });

        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error ending shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to end shift'
        });
    }
});

/**
 * PUT /api/shifts/:id
 * Update shift
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const shift = await employeeShiftService.update(req.params.id, req.body);
        
        if (!shift) {
            return res.status(404).json({
                error: true,
                message: 'Shift not found'
            });
        }

        res.json({
            error: false,
            data: shift
        });
    } catch (error) {
        logger.error('Error updating shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update shift'
        });
    }
});

module.exports = router;


