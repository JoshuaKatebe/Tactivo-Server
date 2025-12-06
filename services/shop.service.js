/**
 * Shop Service - Products and Sales
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class ShopService {
    // ============================================================================
    // Products
    // ============================================================================

    /**
     * Get all products (optionally filtered by station)
     */
    async getProducts(filters = {}) {
        let query = 'SELECT * FROM shop_products WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.active !== undefined) {
            query += ` AND active = $${paramIndex++}`;
            params.push(filters.active);
        }

        query += ' ORDER BY name';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get product by ID
     */
    async getProductById(id) {
        const result = await db.query('SELECT * FROM shop_products WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Get product by SKU
     */
    async getProductBySku(stationId, sku) {
        const result = await db.query(
            'SELECT * FROM shop_products WHERE station_id = $1 AND sku = $2',
            [stationId, sku]
        );
        return result.rows[0] || null;
    }

    /**
     * Create product
     */
    async createProduct(data) {
        const {
            station_id,
            sku,
            name,
            price,
            cost,
            unit,
            stock_qty,
            active
        } = data;

        const result = await db.query(
            `INSERT INTO shop_products 
             (station_id, sku, name, price, cost, unit, stock_qty, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                station_id || null, sku || null, name, price, cost || null,
                unit || null, stock_qty || 0, active !== undefined ? active : true
            ]
        );
        return result.rows[0];
    }

    /**
     * Update product
     */
    async updateProduct(id, data) {
        const {
            sku,
            name,
            price,
            cost,
            unit,
            stock_qty,
            active
        } = data;

        const result = await db.query(
            `UPDATE shop_products 
             SET sku = $1, name = $2, price = $3, cost = $4, unit = $5, 
                 stock_qty = $6, active = $7, updated_at = now()
             WHERE id = $8 RETURNING *`,
            [
                sku || null, name, price, cost || null, unit || null,
                stock_qty || 0, active !== undefined ? active : true, id
            ]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete product
     */
    async deleteProduct(id) {
        const result = await db.query('DELETE FROM shop_products WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }

    // ============================================================================
    // Sales
    // ============================================================================

    /**
     * Get all sales (with filters)
     */
    async getSales(filters = {}) {
        let query = `
            SELECT ss.*, 
                   s.name as station_name,
                   e.first_name || ' ' || e.last_name as employee_name
            FROM shop_sales ss
            LEFT JOIN stations s ON ss.station_id = s.id
            LEFT JOIN employees e ON ss.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND ss.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND ss.employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.start_date) {
            query += ` AND ss.sale_time >= $${paramIndex++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND ss.sale_time <= $${paramIndex++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY ss.sale_time DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get sale by ID (with items)
     */
    async getSaleById(id) {
        const saleResult = await db.query('SELECT * FROM shop_sales WHERE id = $1', [id]);
        if (!saleResult.rows[0]) {
            return null;
        }

        const itemsResult = await db.query(
            `SELECT ssi.*, sp.name as product_name, sp.sku
             FROM shop_sale_items ssi
             LEFT JOIN shop_products sp ON ssi.product_id = sp.id
             WHERE ssi.sale_id = $1`,
            [id]
        );

        return {
            ...saleResult.rows[0],
            items: itemsResult.rows
        };
    }

    /**
     * Create sale with items
     */
    async createSale(data) {
        const {
            station_id,
            employee_id,
            terminal_id,
            sale_time,
            total_amount,
            payments,
            items
        } = data;

        return await db.transaction(async (client) => {
            // Create sale
            const saleResult = await client.query(
                `INSERT INTO shop_sales 
                 (station_id, employee_id, terminal_id, sale_time, total_amount, payments)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [
                    station_id, employee_id || null, terminal_id || null,
                    sale_time || new Date(), total_amount, payments || null
                ]
            );

            const sale = saleResult.rows[0];

            // Create sale items and update stock
            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO shop_sale_items 
                         (sale_id, product_id, qty, unit_price, line_total)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [sale.id, item.product_id, item.qty, item.unit_price, item.line_total]
                    );

                    // Update stock
                    await client.query(
                        'UPDATE shop_products SET stock_qty = stock_qty - $1 WHERE id = $2',
                        [item.qty, item.product_id]
                    );
                }
            }

            return sale;
        });
    }

    /**
     * Mark sale as synced
     */
    async markSaleSynced(id) {
        const result = await db.query(
            'UPDATE shop_sales SET synced = true WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0] || null;
    }
}

module.exports = new ShopService();


