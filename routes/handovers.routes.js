/**
 * Handovers Routes - Cash clearance
 * @swagger
 * tags:
 *   - name: Handovers
 *     description: Cash handover management
 */

const express = require('express');
const router = express.Router();
const handoverService = require('../services/handover.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/handovers:
 *   get:
 *     summary: Get all handovers
 *     tags: [Handovers]
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
 *         name: shift_id
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of handovers
 *   post:
 *     summary: Create a new handover
 *     tags: [Handovers]
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
 *               - amount_expected
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               employee_id:
 *                 type: string
 *                 format: uuid
 *               cashier_employee_id:
 *                 type: string
 *                 format: uuid
 *               employee_shift_id:
 *                 type: string
 *                 format: uuid
 *               amount_expected:
 *                 type: number
 *                 example: 1000.00
 *               amount_cashed:
 *                 type: number
 *                 example: 995.50
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Handover created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            employee_id: req.query.employee_id,
            shift_id: req.query.shift_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100
        };

        const handovers = await handoverService.getAll(filters);
        res.json({
            error: false,
            data: handovers
        });
    } catch (error) {
        logger.error('Error getting handovers', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get handovers'
        });
    }
});

/**
 * @swagger
 * /api/handovers/pending:
 *   get:
 *     summary: Get all pending handovers
 *     description: Retrieve all pending handovers with optional filtering and sorting
 *     tags: [Handovers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee ID
 *       - in: query
 *         name: employee_name
 *         schema:
 *           type: string
 *         description: Search by employee name (partial match)
 *       - in: query
 *         name: pump_number
 *         schema:
 *           type: integer
 *         description: Filter by pump number
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [employee_name, employee_id, pump_number, transaction_count, handover_time]
 *         description: Sort results by field
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of pending handovers with transaction counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       employee_name:
 *                         type: string
 *                       station_name:
 *                         type: string
 *                       transaction_count:
 *                         type: integer
 *                       total_amount:
 *                         type: number
 *                       amount_expected:
 *                         type: number
 *                       status:
 *                         type: string
 *                       handover_time:
 *                         type: string
 *                         format: date-time
 */
router.get('/pending', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            employee_id: req.query.employee_id,
            employee_name: req.query.employee_name,
            pump_number: req.query.pump_number ? parseInt(req.query.pump_number) : null,
            sort_by: req.query.sort_by,
            limit: parseInt(req.query.limit) || 100
        };

        const handovers = await handoverService.getPendingHandovers(filters);
        res.json({
            error: false,
            data: handovers
        });
    } catch (error) {
        logger.error('Error getting pending handovers', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pending handovers'
        });
    }
});

/**
 * @swagger
 * /api/handovers/{id}:
 *   get:
 *     summary: Get handover by ID
 *     tags: [Handovers]
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
 *         description: Handover details
 *       404:
 *         description: Handover not found
 *   put:
 *     summary: Update handover
 *     tags: [Handovers]
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
 *               amount_cashed:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Handover updated
 *       404:
 *         description: Handover not found
 *   delete:
 *     summary: Delete handover
 *     tags: [Handovers]
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
 *         description: Handover deleted
 *       404:
 *         description: Handover not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const handover = await handoverService.getById(req.params.id);

        if (!handover) {
            return res.status(404).json({
                error: true,
                message: 'Handover not found'
            });
        }

        res.json({
            error: false,
            data: handover
        });
    } catch (error) {
        logger.error('Error getting handover', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get handover'
        });
    }
});

/**
 * POST /api/handovers
 * Create handover
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            employee_id,
            cashier_employee_id,
            employee_shift_id,
            amount_expected,
            amount_cashed,
            notes
        } = req.body;

        if (!station_id || !employee_id || amount_expected === undefined) {
            return res.status(400).json({
                error: true,
                message: 'Station ID, employee ID, and expected amount are required'
            });
        }

        const handover = await handoverService.create({
            station_id,
            employee_id,
            cashier_employee_id,
            employee_shift_id,
            amount_expected,
            amount_cashed,
            notes
        });

        res.status(201).json({
            error: false,
            data: handover
        });
    } catch (error) {
        logger.error('Error creating handover', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create handover'
        });
    }
});

/**
 * PUT /api/handovers/:id
 * Update handover
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const handover = await handoverService.update(req.params.id, req.body);

        if (!handover) {
            return res.status(404).json({
                error: true,
                message: 'Handover not found'
            });
        }

        res.json({
            error: false,
            data: handover
        });
    } catch (error) {
        logger.error('Error updating handover', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update handover'
        });
    }
});

/**
 * DELETE /api/handovers/:id
 * Delete handover
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const handover = await handoverService.delete(req.params.id);

        if (!handover) {
            return res.status(404).json({
                error: true,
                message: 'Handover not found'
            });
        }

        res.json({
            error: false,
            message: 'Handover deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting handover', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete handover'
        });
    }
});

/**
 * @swagger
 * /api/handovers/{id}/transactions:
 *   get:
 *     summary: Get transactions for a handover
 *     description: Retrieve all fuel transactions linked to a specific handover
 *     tags: [Handovers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Handover ID
 *     responses:
 *       200:
 *         description: Handover with transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     employee_name:
 *                       type: string
 *                     transaction_count:
 *                       type: integer
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           pump_number:
 *                             type: integer
 *                           nozzle:
 *                             type: integer
 *                           volume:
 *                             type: number
 *                           amount:
 *                             type: number
 *                           transaction_datetime:
 *                             type: string
 *                             format: date-time
 *                           linked_at:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Handover not found
 */
router.get('/:id/transactions', authenticate, async (req, res) => {
    try {
        const handover = await handoverService.getHandoverWithTransactions(req.params.id);

        if (!handover) {
            return res.status(404).json({
                error: true,
                message: 'Handover not found'
            });
        }

        res.json({
            error: false,
            data: handover
        });
    } catch (error) {
        logger.error('Error getting handover transactions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get handover transactions'
        });
    }
});

/**
 * @swagger
 * /api/handovers/{id}/clear:
 *   post:
 *     summary: Clear a handover
 *     description: Cashier clears a pending handover by recording payment methods and amount received
 *     tags: [Handovers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Handover ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cashier_employee_id
 *               - payment_methods
 *               - amount_cashed
 *             properties:
 *               cashier_employee_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of cashier clearing the handover
 *               payment_methods:
 *                 type: object
 *                 description: Breakdown of payment methods received
 *                 example:
 *                   cash: 450.00
 *                   card: 50.00
 *                   mobile_money: 0.00
 *               amount_cashed:
 *                 type: number
 *                 description: Total amount received from attendant
 *                 example: 500.00
 *               notes:
 *                 type: string
 *                 description: Optional notes about the handover
 *     responses:
 *       200:
 *         description: Handover cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: cleared
 *                     amount_expected:
 *                       type: number
 *                     amount_cashed:
 *                       type: number
 *                     difference:
 *                       type: number
 *                     payment_methods:
 *                       type: object
 *                     cleared_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Handover not found
 *       500:
 *         description: Handover already cleared or other error
 */
router.post('/:id/clear', authenticate, async (req, res) => {
    try {
        const {
            cashier_employee_id,
            payment_methods,
            amount_cashed,
            notes
        } = req.body;

        if (!cashier_employee_id || !payment_methods || amount_cashed === undefined) {
            return res.status(400).json({
                error: true,
                message: 'Cashier employee ID, payment methods, and amount cashed are required'
            });
        }

        const handover = await handoverService.clearHandover(
            req.params.id,
            cashier_employee_id,
            payment_methods,
            amount_cashed,
            notes
        );

        res.json({
            error: false,
            message: 'Handover cleared successfully',
            data: handover
        });
    } catch (error) {
        logger.error('Error clearing handover', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to clear handover'
        });
    }
});

module.exports = router;

