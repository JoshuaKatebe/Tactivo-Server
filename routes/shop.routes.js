/**
 * Shop Routes - Products and Sales
 * @swagger
 * tags:
 *   - name: Shop
 *     description: Shop POS operations
 */

const express = require('express');
const router = express.Router();
const shopService = require('../services/shop.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// ============================================================================
// Products
// ============================================================================

/**
 * @swagger
 * /api/shop/products:
 *   get:
 *     summary: Get all products
 *     tags: [Shop]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/products', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            active: req.query.active !== undefined ? req.query.active === 'true' : undefined
        };
        
        const products = await shopService.getProducts(filters);
        res.json({
            error: false,
            data: products
        });
    } catch (error) {
        logger.error('Error getting products', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get products'
        });
    }
});

/**
 * GET /api/shop/products/:id
 * Get product by ID
 */
router.get('/products/:id', authenticate, async (req, res) => {
    try {
        const product = await shopService.getProductById(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'Product not found'
            });
        }

        res.json({
            error: false,
            data: product
        });
    } catch (error) {
        logger.error('Error getting product', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get product'
        });
    }
});

/**
 * POST /api/shop/products
 * Create product
 */
router.post('/products', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            sku,
            name,
            price,
            cost,
            unit,
            stock_qty,
            active
        } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({
                error: true,
                message: 'Name and price are required'
            });
        }

        const product = await shopService.createProduct({
            station_id, sku, name, price, cost, unit, stock_qty, active
        });
        
        res.status(201).json({
            error: false,
            data: product
        });
    } catch (error) {
        logger.error('Error creating product', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create product'
        });
    }
});

/**
 * PUT /api/shop/products/:id
 * Update product
 */
router.put('/products/:id', authenticate, async (req, res) => {
    try {
        const product = await shopService.updateProduct(req.params.id, req.body);
        
        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'Product not found'
            });
        }

        res.json({
            error: false,
            data: product
        });
    } catch (error) {
        logger.error('Error updating product', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update product'
        });
    }
});

/**
 * DELETE /api/shop/products/:id
 * Delete product
 */
router.delete('/products/:id', authenticate, async (req, res) => {
    try {
        const product = await shopService.deleteProduct(req.params.id);
        
        if (!product) {
            return res.status(404).json({
                error: true,
                message: 'Product not found'
            });
        }

        res.json({
            error: false,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting product', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete product'
        });
    }
});

// ============================================================================
// Sales
// ============================================================================

/**
 * GET /api/shop/sales
 * Get all sales
 */
router.get('/sales', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            employee_id: req.query.employee_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100
        };
        
        const sales = await shopService.getSales(filters);
        res.json({
            error: false,
            data: sales
        });
    } catch (error) {
        logger.error('Error getting sales', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get sales'
        });
    }
});

/**
 * GET /api/shop/sales/:id
 * Get sale by ID (with items)
 */
router.get('/sales/:id', authenticate, async (req, res) => {
    try {
        const sale = await shopService.getSaleById(req.params.id);
        
        if (!sale) {
            return res.status(404).json({
                error: true,
                message: 'Sale not found'
            });
        }

        res.json({
            error: false,
            data: sale
        });
    } catch (error) {
        logger.error('Error getting sale', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get sale'
        });
    }
});

/**
 * POST /api/shop/sales
 * Create sale
 */
router.post('/sales', authenticate, async (req, res) => {
    try {
        const {
            station_id,
            employee_id,
            terminal_id,
            sale_time,
            total_amount,
            payments,
            items
        } = req.body;

        if (!station_id || !total_amount || !items || items.length === 0) {
            return res.status(400).json({
                error: true,
                message: 'Station ID, total amount, and items are required'
            });
        }

        const sale = await shopService.createSale({
            station_id,
            employee_id,
            terminal_id,
            sale_time,
            total_amount,
            payments,
            items
        });

        res.status(201).json({
            error: false,
            data: sale
        });
    } catch (error) {
        logger.error('Error creating sale', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create sale'
        });
    }
});

/**
 * POST /api/shop/sales/:id/sync
 * Mark sale as synced
 */
router.post('/sales/:id/sync', authenticate, async (req, res) => {
    try {
        const sale = await shopService.markSaleSynced(req.params.id);
        
        if (!sale) {
            return res.status(404).json({
                error: true,
                message: 'Sale not found'
            });
        }

        res.json({
            error: false,
            data: sale
        });
    } catch (error) {
        logger.error('Error syncing sale', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to sync sale'
        });
    }
});

module.exports = router;


