/**
 * Fuel Transactions Routes
 * @swagger
 * tags:
 *   - name: Fuel Transactions
 *     description: Fuel transaction tracking
 */

const express = require('express');
const router = express.Router();
const fuelTransactionService = require('../services/fuel-transaction.service');
const handoverService = require('../services/handover.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/fuel-transactions:
 *   get:
 *     summary: Get all fuel transactions
 *     tags: [Fuel Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
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
 *         name: synced
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of fuel transactions
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            synced: req.query.synced !== undefined ? req.query.synced === 'true' : undefined,
            limit: parseInt(req.query.limit) || 100
        };

        const transactions = await fuelTransactionService.getAll(filters);
        res.json({
            error: false,
            data: transactions
        });
    } catch (error) {
        logger.error('Error getting fuel transactions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get fuel transactions'
        });
    }
});

/**
 * GET /api/fuel-transactions/summary
 * Get transaction summary for a date range
 */
router.get('/summary', authenticate, async (req, res) => {
    try {
        const { station_id, start_date, end_date } = req.query;

        if (!station_id || !start_date || !end_date) {
            return res.status(400).json({
                error: true,
                message: 'Station ID, start date, and end date are required'
            });
        }

        const summary = await fuelTransactionService.getSummary(station_id, start_date, end_date);
        res.json({
            error: false,
            data: summary
        });
    } catch (error) {
        logger.error('Error getting transaction summary', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get transaction summary'
        });
    }
});

/**
 * @swagger
 * /api/fuel-transactions/pending:
 *   get:
 *     summary: Get pending (uncleared) transactions for Quick Clear
 *     description: Returns all uncleared fuel transactions for cashier Quick Clear UI
 *     tags: [Fuel Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station
 *       - in: query
 *         name: employee_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee
 *       - in: query
 *         name: pump_number
 *         schema:
 *           type: integer
 *         description: Filter by pump number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: List of pending transactions with aggregated totals per employee
 */
router.get('/pending', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            employee_id: req.query.employee_id,
            pump_number: req.query.pump_number ? parseInt(req.query.pump_number) : null,
            limit: parseInt(req.query.limit) || 100
        };

        const transactions = await handoverService.getPendingTransactions(filters);
        res.json({
            error: false,
            data: transactions
        });
    } catch (error) {
        logger.error('Error getting pending transactions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pending transactions'
        });
    }
});

/**
 * GET /api/fuel-transactions/:id
 * Get transaction by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const transaction = await fuelTransactionService.getById(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                error: true,
                message: 'Transaction not found'
            });
        }

        res.json({
            error: false,
            data: transaction
        });
    } catch (error) {
        logger.error('Error getting transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get transaction'
        });
    }
});

/**
 * POST /api/fuel-transactions
 * Create fuel transaction
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const transaction = await fuelTransactionService.create(req.body);
        res.status(201).json({
            error: false,
            data: transaction
        });
    } catch (error) {
        logger.error('Error creating fuel transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create fuel transaction'
        });
    }
});

/**
 * POST /api/fuel-transactions/:id/sync
 * Mark transaction as synced
 */
router.post('/:id/sync', authenticate, async (req, res) => {
    try {
        const transaction = await fuelTransactionService.markSynced(req.params.id);

        if (!transaction) {
            return res.status(404).json({
                error: true,
                message: 'Transaction not found'
            });
        }

        res.json({
            error: false,
            data: transaction
        });
    } catch (error) {
        logger.error('Error syncing transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to sync transaction'
        });
    }
});

/**
 * @swagger
 * /api/fuel-transactions/by-shift/{shiftId}:
 *   get:
 *     summary: Get transactions for a specific shift
 *     tags: [Fuel Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Transactions for the shift
 */
router.get('/by-shift/:shiftId', authenticate, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const transactions = await fuelTransactionService.getByShift(req.params.shiftId, limit);

        res.json({
            error: false,
            data: transactions
        });
    } catch (error) {
        logger.error('Error getting transactions by shift', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get transactions by shift'
        });
    }
});

/**
 * @swagger
 * /api/fuel-transactions/by-employee/{employeeId}:
 *   get:
 *     summary: Get transactions for a specific employee
 *     tags: [Fuel Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
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
 *         description: Transactions for the employee
 */
router.get('/by-employee/:employeeId', authenticate, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const limit = parseInt(req.query.limit) || 100;

        const transactions = await fuelTransactionService.getByEmployee(
            req.params.employeeId,
            start_date || null,
            end_date || null,
            limit
        );

        res.json({
            error: false,
            data: transactions
        });
    } catch (error) {
        logger.error('Error getting transactions by employee', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get transactions by employee'
        });
    }
});

/**
 * @swagger
 * /api/fuel-transactions/register:
 *   post:
 *     summary: Register a fuel transaction (manual recording)
 *     tags: [Fuel Transactions]
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
 *               - pump_number
 *               - volume
 *               - amount
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               pts_controller_id:
 *                 type: string
 *                 format: uuid
 *               pts_transaction_id:
 *                 type: integer
 *               pump_number:
 *                 type: integer
 *               nozzle:
 *                 type: integer
 *               volume:
 *                 type: number
 *               amount:
 *                 type: number
 *               price:
 *                 type: number
 *               authorized_by_employee_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Transaction registered
 */
router.post('/register', authenticate, async (req, res) => {
    try {
        const transaction = await fuelTransactionService.create(req.body);
        res.status(201).json({
            error: false,
            data: transaction
        });
    } catch (error) {
        logger.error('Error registering transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to register transaction'
        });
    }
});

/**
 * @swagger
 * /api/fuel-transactions/{id}/quick-clear:
 *   post:
 *     summary: Quick clear a single transaction
 *     description: Cashier marks a single fuel transaction as cleared
 *     tags: [Fuel Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cashier_employee_id
 *             properties:
 *               cashier_employee_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of cashier clearing the transaction
 *     responses:
 *       200:
 *         description: Transaction cleared successfully
 *       404:
 *         description: Transaction not found or already cleared
 */
router.post('/:id/quick-clear', authenticate, async (req, res) => {
    try {
        const { cashier_employee_id } = req.body;

        if (!cashier_employee_id) {
            return res.status(400).json({
                error: true,
                message: 'Cashier employee ID is required'
            });
        }

        const transaction = await handoverService.quickClearTransaction(
            req.params.id,
            cashier_employee_id
        );

        res.json({
            error: false,
            message: 'Transaction cleared successfully',
            data: transaction
        });
    } catch (error) {
        logger.error('Error clearing transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to clear transaction'
        });
    }
});

module.exports = router;


