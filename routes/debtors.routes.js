/**
 * Debtors Routes - Credit customers
 * Note: Debtors table not in schema yet - placeholder implementation
 * @swagger
 * tags:
 *   - name: Debtors
 *     description: Credit customer management (placeholders)
 */

const express = require('express');
const router = express.Router();
const debtorService = require('../services/debtor.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/debtors:
 *   get:
 *     summary: Get all debtors (placeholder)
 *     tags: [Debtors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of debtors (placeholder)
 *   post:
 *     summary: Create debtor (placeholder)
 *     tags: [Debtors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Debtor created (placeholder)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            company_id: req.query.company_id,
            active: req.query.active,
            search: req.query.search
        };
        
        const debtors = await debtorService.getAll(filters);
        res.json({
            error: false,
            data: debtors,
            note: 'Debtors table not yet in schema - placeholder implementation'
        });
    } catch (error) {
        logger.error('Error getting debtors', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get debtors'
        });
    }
});

/**
 * @swagger
 * /api/debtors/{id}:
 *   get:
 *     summary: Get debtor by ID
 *     tags: [Debtors]
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
 *         description: Debtor details
 *       404:
 *         description: Debtor not found
 *   put:
 *     summary: Update debtor
 *     tags: [Debtors]
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
 *         description: Debtor updated
 *       404:
 *         description: Debtor not found
 *   delete:
 *     summary: Delete debtor
 *     tags: [Debtors]
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
 *         description: Debtor deleted
 *       404:
 *         description: Debtor not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const debtor = await debtorService.getById(req.params.id);
        
        if (!debtor) {
            return res.status(404).json({
                error: true,
                message: 'Debtor not found'
            });
        }

        res.json({
            error: false,
            data: debtor
        });
    } catch (error) {
        logger.error('Error getting debtor', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get debtor'
        });
    }
});

/**
 * @swagger
 * /api/debtors/{id}/balance:
 *   get:
 *     summary: Get debtor balance
 *     tags: [Debtors]
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
 *         description: Debtor balance
 */
router.get('/:id/balance', authenticate, async (req, res) => {
    try {
        const balance = await debtorService.getBalance(req.params.id);
        res.json({
            error: false,
            data: balance
        });
    } catch (error) {
        logger.error('Error getting debtor balance', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get debtor balance'
        });
    }
});

/**
 * @swagger
 * /api/debtors/{id}/transactions:
 *   get:
 *     summary: Get debtor transactions
 *     tags: [Debtors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Debtor transactions
 */
router.get('/:id/transactions', authenticate, async (req, res) => {
    try {
        const filters = {
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };
        
        const transactions = await debtorService.getTransactions(req.params.id, filters);
        res.json({
            error: false,
            data: transactions
        });
    } catch (error) {
        logger.error('Error getting debtor transactions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get debtor transactions'
        });
    }
});

/**
 * POST /api/debtors
 * Create debtor
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const debtor = await debtorService.create(req.body);
        res.status(201).json({
            error: false,
            data: debtor,
            note: 'Debtors table not yet in schema - placeholder implementation'
        });
    } catch (error) {
        logger.error('Error creating debtor', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create debtor'
        });
    }
});

/**
 * PUT /api/debtors/:id
 * Update debtor
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const debtor = await debtorService.update(req.params.id, req.body);
        
        if (!debtor) {
            return res.status(404).json({
                error: true,
                message: 'Debtor not found'
            });
        }

        res.json({
            error: false,
            data: debtor
        });
    } catch (error) {
        logger.error('Error updating debtor', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update debtor'
        });
    }
});

/**
 * DELETE /api/debtors/:id
 * Delete debtor
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const debtor = await debtorService.delete(req.params.id);
        
        if (!debtor) {
            return res.status(404).json({
                error: true,
                message: 'Debtor not found'
            });
        }

        res.json({
            error: false,
            message: 'Debtor deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting debtor', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete debtor'
        });
    }
});

/**
 * @swagger
 * /api/debtors/{id}/payments:
 *   post:
 *     summary: Record payment against debtor
 *     tags: [Debtors]
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
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment recorded
 *       400:
 *         description: Failed to record payment
 */
router.post('/:id/payments', authenticate, async (req, res) => {
    try {
        const payment = await debtorService.recordPayment(req.params.id, req.body);
        
        if (!payment) {
            return res.status(400).json({
                error: true,
                message: 'Failed to record payment'
            });
        }

        res.json({
            error: false,
            data: payment
        });
    } catch (error) {
        logger.error('Error recording payment', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to record payment'
        });
    }
});

module.exports = router;

