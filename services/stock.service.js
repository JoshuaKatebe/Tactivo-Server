/**
 * Stock Service - Inventory management
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class StockService {
    /**
     * Get products with stock levels
     */
    async getProducts(filters = {}) {
        let query = `
            SELECT sp.*, s.name as station_name
            FROM shop_products sp
            LEFT JOIN stations s ON sp.station_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND sp.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.category) {
            // Would need category field in products table
            query += ` AND sp.category = $${paramIndex++}`;
            params.push(filters.category);
        }
        if (filters.active !== undefined) {
            query += ` AND sp.active = $${paramIndex++}`;
            params.push(filters.active);
        }
        if (filters.low_stock) {
            query += ` AND sp.stock_qty < $${paramIndex++}`;
            params.push(filters.low_stock_threshold || 10);
        }

        query += ' ORDER BY sp.name';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get low stock items
     */
    async getLowStock(stationId, threshold = 10) {
        const result = await db.query(
            'SELECT * FROM shop_products WHERE station_id = $1 AND stock_qty < $2 AND active = true ORDER BY stock_qty ASC',
            [stationId, threshold]
        );
        return result.rows;
    }

    /**
     * Record stock in (restock)
     */
    async stockIn(data) {
        const {
            station_id,
            items,
            supplier_id,
            receipt_number,
            notes
        } = data;

        return await db.transaction(async (client) => {
            // Create stock receipt record (would need stock_receipts table)
            // For now, just update product stock levels
            
            for (const item of items) {
                await client.query(
                    'UPDATE shop_products SET stock_qty = stock_qty + $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }

            return {
                receipt_number: receipt_number || `REC-${Date.now()}`,
                items: items,
                created_at: new Date()
            };
        });
    }

    /**
     * Get stock movements
     */
    async getMovements(filters = {}) {
        // Placeholder - would need stock_movements table
        // For now, use sales as proxy for stock out
        const { product_id, station_id, start_date, end_date, type } = filters;

        if (type === 'out' || !type) {
            // Get stock out from sales
            let query = `
                SELECT 
                    ssi.product_id,
                    sp.name as product_name,
                    SUM(ssi.qty) as quantity,
                    'out' as movement_type,
                    ss.sale_time as movement_date
                FROM shop_sale_items ssi
                INNER JOIN shop_sales ss ON ssi.sale_id = ss.id
                INNER JOIN shop_products sp ON ssi.product_id = sp.id
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (product_id) {
                query += ` AND ssi.product_id = $${paramIndex++}`;
                params.push(product_id);
            }
            if (station_id) {
                query += ` AND ss.station_id = $${paramIndex++}`;
                params.push(station_id);
            }
            if (start_date) {
                query += ` AND ss.sale_time >= $${paramIndex++}`;
                params.push(start_date);
            }
            if (end_date) {
                query += ` AND ss.sale_time <= $${paramIndex++}`;
                params.push(end_date);
            }

            query += ' GROUP BY ssi.product_id, sp.name, ss.sale_time ORDER BY ss.sale_time DESC';
            const result = await db.query(query, params);
            return result.rows;
        }

        return [];
    }

    /**
     * Adjust stock (manual adjustment)
     */
    async adjustStock(productId, quantity, reason) {
        return await db.query(
            'UPDATE shop_products SET stock_qty = stock_qty + $1 WHERE id = $2 RETURNING *',
            [quantity, productId]
        );
    }
}

module.exports = new StockService();

