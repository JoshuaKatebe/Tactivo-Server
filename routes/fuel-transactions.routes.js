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

module.exports = router;


