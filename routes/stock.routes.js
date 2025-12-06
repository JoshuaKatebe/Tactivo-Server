/**
 * Stock Management Routes
 * @swagger
 * tags:
 *   - name: Stock
 *     description: Stock and inventory management
 */

const express = require('express');
const router = express.Router();
const stockService = require('../services/stock.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/stock/products:
 *   get:
 *     summary: Get products with stock levels
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: low_stock_threshold
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of products with stock levels
 */
router.get('/products', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            category: req.query.category,
            active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
            low_stock: req.query.low_stock === 'true',
            low_stock_threshold: parseInt(req.query.low_stock_threshold) || 10
        };
        
        const products = await stockService.getProducts(filters);
        res.json({
            error: false,
            data: products
        });
    } catch (error) {
        logger.error('Error getting stock products', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get stock products'
        });
    }
});

/**
 * @swagger
 * /api/stock/low-stock:
 *   get:
 *     summary: Get low stock items
 *     tags: [Stock]
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
 *         name: threshold
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of low stock items
 *       400:
 *         description: Station ID is required
 */
router.get('/low-stock', authenticate, async (req, res) => {
    try {
        const { station_id, threshold } = req.query;

        if (!station_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID is required'
            });
        }

        const items = await stockService.getLowStock(station_id, parseInt(threshold) || 10);
        res.json({
            error: false,
            data: items
        });
    } catch (error) {
        logger.error('Error getting low stock items', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get low stock items'
        });
    }
});

/**
 * @swagger
 * /api/stock/stock-in:
 *   post:
 *     summary: Record stock in (restock)
 *     tags: [Stock]
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
 *               - items
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: number
 *               supplier_id:
 *                 type: string
 *                 format: uuid
 *               receipt_number:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stock in recorded
 *       400:
 *         description: Missing required fields
 */
router.post('/stock-in', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            items,
            supplier_id,
            receipt_number,
            notes
        } = req.body;

        if (!station_id || !items || items.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'Station ID and items are required'
            });
        }

        const receipt = await stockService.stockIn({
            station_id,
            items,
            supplier_id,
            receipt_number,
            notes
        });

        res.status(201).json({
            error: false,
            data: receipt
        });
    } catch (error) {
        logger.error('Error recording stock in', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to record stock in'
        });
    }
});

/**
 * @swagger
 * /api/stock/movements:
 *   get:
 *     summary: Get stock movements
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         schema:
 *           type: string
 *           format: uuid
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [in, out, adjustment]
 *     responses:
 *       200:
 *         description: List of stock movements
 */
router.get('/movements', authenticate, async (req, res) => {
    try {
        const filters = {
            product_id: req.query.product_id,
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            type: req.query.type
        };
        
        const movements = await stockService.getMovements(filters);
        res.json({
            error: false,
            data: movements
        });
    } catch (error) {
        logger.error('Error getting stock movements', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get stock movements'
        });
    }
});

/**
 * @swagger
 * /api/stock/adjust:
 *   post:
 *     summary: Adjust stock (manual adjustment)
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: number
 *                 description: Positive for increase, negative for decrease
 *                 example: -5
 *               reason:
 *                 type: string
 *                 example: "Damaged items"
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/adjust', authenticate, async (req, res) => {
    try {
        const { product_id, quantity, reason } = req.body;

        if (!product_id || quantity === undefined) {
            return res.status(400).json({
                error: true,
                message: 'Product ID and quantity are required'
            });
        }

        const result = await stockService.adjustStock(product_id, quantity, reason);
        
        res.json({
            error: false,
            data: result.rows[0],
            message: 'Stock adjusted successfully'
        });
    } catch (error) {
        logger.error('Error adjusting stock', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to adjust stock'
        });
    }
});

module.exports = router;

