/**
 * Report Service - Generate various reports
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class ReportService {
    /**
     * Get sales report
     */
    async getSalesReport(filters = {}) {
        const { station_id, start_date, end_date, group_by = 'day' } = filters;

        let query = `
            SELECT 
                DATE(ss.sale_time) as date,
                COUNT(DISTINCT ss.id) as total_sales,
                SUM(ss.total_amount) as total_amount,
                COUNT(DISTINCT ssi.product_id) as unique_products,
                SUM(ssi.qty) as total_items_sold
            FROM shop_sales ss
            LEFT JOIN shop_sale_items ssi ON ss.id = ssi.sale_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

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

        if (group_by === 'day') {
            query += ` GROUP BY DATE(ss.sale_time) ORDER BY date DESC`;
        } else if (group_by === 'shift') {
            query = query.replace('DATE(ss.sale_time) as date', 'es.id as shift_id, es.start_time as shift_start');
            query += ` LEFT JOIN employee_shifts es ON ss.employee_id = es.employee_id 
                      AND ss.sale_time >= es.start_time 
                      AND (es.end_time IS NULL OR ss.sale_time <= es.end_time)`;
            query += ` GROUP BY es.id, es.start_time ORDER BY es.start_time DESC`;
        } else if (group_by === 'employee') {
            query = query.replace('DATE(ss.sale_time) as date', 'e.id as employee_id, e.first_name || \' \' || e.last_name as employee_name');
            query += ` LEFT JOIN employees e ON ss.employee_id = e.id`;
            query += ` GROUP BY e.id, e.first_name, e.last_name ORDER BY total_amount DESC`;
        }

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get sales by product
     */
    async getSalesByProduct(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        let query = `
            SELECT 
                sp.id as product_id,
                sp.name as product_name,
                sp.sku,
                SUM(ssi.qty) as total_qty_sold,
                SUM(ssi.line_total) as total_revenue,
                AVG(ssi.unit_price) as avg_price
            FROM shop_sale_items ssi
            INNER JOIN shop_sales ss ON ssi.sale_id = ss.id
            INNER JOIN shop_products sp ON ssi.product_id = sp.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

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

        query += ' GROUP BY sp.id, sp.name, sp.sku ORDER BY total_revenue DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get fuel report
     */
    async getFuelReport(filters = {}) {
        const { station_id, start_date, end_date, grade } = filters;

        let query = `
            SELECT 
                ft.pump_number,
                ft.nozzle,
                COUNT(*) as transaction_count,
                SUM(ft.volume) as total_volume,
                SUM(ft.amount) as total_amount,
                AVG(ft.price) as avg_price,
                MIN(ft.transaction_datetime) as first_transaction,
                MAX(ft.transaction_datetime) as last_transaction
            FROM fuel_transactions ft
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (station_id) {
            query += ` AND ft.station_id = $${paramIndex++}`;
            params.push(station_id);
        }
        if (start_date) {
            query += ` AND ft.transaction_datetime >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND ft.transaction_datetime <= $${paramIndex++}`;
            params.push(end_date);
        }
        if (grade) {
            // This would need to join with nozzles/fuel_grades - simplified for now
            query += ` AND ft.nozzle = $${paramIndex++}`;
            params.push(grade);
        }

        query += ` GROUP BY ft.pump_number, ft.nozzle ORDER BY total_volume DESC`;
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get fuel sales by grade
     */
    async getFuelByGrade(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        let query = `
            SELECT 
                n.fuel_grade_id,
                COUNT(*) as transaction_count,
                SUM(ft.volume) as total_volume,
                SUM(ft.amount) as total_amount,
                AVG(ft.price) as avg_price
            FROM fuel_transactions ft
            LEFT JOIN nozzles n ON ft.pump_number = (SELECT pump_number FROM pumps WHERE id = n.pump_id LIMIT 1)
                AND ft.nozzle = n.nozzle_number
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (station_id) {
            query += ` AND ft.station_id = $${paramIndex++}`;
            params.push(station_id);
        }
        if (start_date) {
            query += ` AND ft.transaction_datetime >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND ft.transaction_datetime <= $${paramIndex++}`;
            params.push(end_date);
        }

        query += ' GROUP BY n.fuel_grade_id ORDER BY total_volume DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get inventory report
     */
    async getInventoryReport(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        // Current stock levels
        const stockQuery = `
            SELECT 
                sp.id,
                sp.name,
                sp.sku,
                sp.stock_qty as current_stock,
                sp.price,
                (sp.stock_qty * sp.cost) as stock_value
            FROM shop_products sp
            WHERE 1=1
                ${station_id ? 'AND sp.station_id = $1' : ''}
            ORDER BY sp.name
        `;

        const stockParams = station_id ? [station_id] : [];
        const stockResult = await db.query(stockQuery, stockParams);

        // Stock movements (if dates provided)
        let movements = [];
        if (start_date && end_date) {
            // This would need a stock_movements table - simplified for now
            // Using sales as proxy for stock out
            const movementsQuery = `
                SELECT 
                    ssi.product_id,
                    SUM(ssi.qty) as qty_out
                FROM shop_sale_items ssi
                INNER JOIN shop_sales ss ON ssi.sale_id = ss.id
                WHERE ss.sale_time >= $1 AND ss.sale_time <= $2
                    ${station_id ? 'AND ss.station_id = $3' : ''}
                GROUP BY ssi.product_id
            `;
            const movementsParams = station_id 
                ? [start_date, end_date, station_id]
                : [start_date, end_date];
            const movementsResult = await db.query(movementsQuery, movementsParams);
            movements = movementsResult.rows;
        }

        return {
            stock: stockResult.rows,
            movements: movements,
            summary: {
                total_products: stockResult.rows.length,
                total_stock_value: stockResult.rows.reduce((sum, p) => sum + (parseFloat(p.stock_value) || 0), 0),
                low_stock_items: stockResult.rows.filter(p => parseFloat(p.current_stock) < 10).length
            }
        };
    }

    /**
     * Get financial report
     */
    async getFinancialReport(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        // Get fuel revenue by date
        let fuelQuery = `
            SELECT 
                DATE(transaction_datetime) as date,
                SUM(amount) as fuel_revenue
            FROM fuel_transactions
            WHERE 1=1
        `;
        const fuelParams = [];
        let fuelParamIndex = 1;

        if (station_id) {
            fuelQuery += ` AND station_id = $${fuelParamIndex++}`;
            fuelParams.push(station_id);
        }
        if (start_date) {
            fuelQuery += ` AND transaction_datetime >= $${fuelParamIndex++}`;
            fuelParams.push(start_date);
        }
        if (end_date) {
            fuelQuery += ` AND transaction_datetime <= $${fuelParamIndex++}`;
            fuelParams.push(end_date);
        }
        fuelQuery += ' GROUP BY DATE(transaction_datetime)';

        // Get shop revenue by date
        let shopQuery = `
            SELECT 
                DATE(sale_time) as date,
                SUM(total_amount) as shop_revenue
            FROM shop_sales
            WHERE 1=1
        `;
        const shopParams = [];
        let shopParamIndex = 1;

        if (station_id) {
            shopQuery += ` AND station_id = $${shopParamIndex++}`;
            shopParams.push(station_id);
        }
        if (start_date) {
            shopQuery += ` AND sale_time >= $${shopParamIndex++}`;
            shopParams.push(start_date);
        }
        if (end_date) {
            shopQuery += ` AND sale_time <= $${shopParamIndex++}`;
            shopParams.push(end_date);
        }
        shopQuery += ' GROUP BY DATE(sale_time)';

        const fuelResult = await db.query(fuelQuery, fuelParams);
        const shopResult = await db.query(shopQuery, shopParams);

        // Combine results
        const dateMap = new Map();
        fuelResult.rows.forEach(row => {
            dateMap.set(row.date, { date: row.date, fuel_revenue: parseFloat(row.fuel_revenue) || 0, shop_revenue: 0 });
        });
        shopResult.rows.forEach(row => {
            if (dateMap.has(row.date)) {
                dateMap.get(row.date).shop_revenue = parseFloat(row.shop_revenue) || 0;
            } else {
                dateMap.set(row.date, { date: row.date, fuel_revenue: 0, shop_revenue: parseFloat(row.shop_revenue) || 0 });
            }
        });

        const dailyCollections = Array.from(dateMap.values()).map(row => ({
            ...row,
            total_revenue: row.fuel_revenue + row.shop_revenue
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
            daily_collections: dailyCollections,
            summary: {
                total_fuel_revenue: dailyCollections.reduce((sum, r) => sum + r.fuel_revenue, 0),
                total_shop_revenue: dailyCollections.reduce((sum, r) => sum + r.shop_revenue, 0),
                total_revenue: dailyCollections.reduce((sum, r) => sum + r.total_revenue, 0)
            }
        };
    }

    /**
     * Get employee performance report
     */
    async getEmployeeReport(filters = {}) {
        const { employee_id, station_id, start_date, end_date } = filters;

        let query = `
            SELECT 
                e.id as employee_id,
                e.first_name || ' ' || e.last_name as employee_name,
                e.employee_code,
                COUNT(DISTINCT ss.id) as shop_sales_count,
                COALESCE(SUM(ss.total_amount), 0) as shop_revenue,
                COUNT(DISTINCT ft.id) as fuel_transactions_count,
                COALESCE(SUM(ft.amount), 0) as fuel_revenue,
                COUNT(DISTINCT es.id) as shifts_worked
            FROM employees e
            LEFT JOIN shop_sales ss ON e.id = ss.employee_id
            LEFT JOIN fuel_transactions ft ON e.id = ft.authorized_by_employee_id
            LEFT JOIN employee_shifts es ON e.id = es.employee_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (employee_id) {
            query += ` AND e.id = $${paramIndex++}`;
            params.push(employee_id);
        }
        if (station_id) {
            query += ` AND e.station_id = $${paramIndex++}`;
            params.push(station_id);
        }
        if (start_date) {
            query += ` AND (ss.sale_time >= $${paramIndex} OR ss.sale_time IS NULL)`;
            query += ` AND (ft.transaction_datetime >= $${paramIndex} OR ft.transaction_datetime IS NULL)`;
            query += ` AND (es.start_time >= $${paramIndex} OR es.start_time IS NULL)`;
            params.push(start_date);
            paramIndex++;
        }
        if (end_date) {
            query += ` AND (ss.sale_time <= $${paramIndex} OR ss.sale_time IS NULL)`;
            query += ` AND (ft.transaction_datetime <= $${paramIndex} OR ft.transaction_datetime IS NULL)`;
            params.push(end_date);
            paramIndex++;
        }

        query += ` GROUP BY e.id, e.first_name, e.last_name, e.employee_code ORDER BY shop_revenue + fuel_revenue DESC`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get pump readings report
     */
    async getPumpReadingsReport(filters = {}) {
        const { station_id, pump_id, start_date, end_date } = filters;

        let query = `
            SELECT 
                ft.pump_number,
                ft.nozzle,
                COUNT(*) as transactions,
                SUM(ft.volume) as total_dispensed,
                SUM(ft.amount) as total_amount,
                MIN(ft.transaction_datetime) as first_reading,
                MAX(ft.transaction_datetime) as last_reading
            FROM fuel_transactions ft
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (station_id) {
            query += ` AND ft.station_id = $${paramIndex++}`;
            params.push(station_id);
        }
        if (pump_id) {
            query += ` AND ft.pump_number = $${paramIndex++}`;
            params.push(pump_id);
        }
        if (start_date) {
            query += ` AND ft.transaction_datetime >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND ft.transaction_datetime <= $${paramIndex++}`;
            params.push(end_date);
        }

        query += ` GROUP BY ft.pump_number, ft.nozzle ORDER BY ft.pump_number, ft.nozzle`;
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get credit sales report
     */
    async getCreditSalesReport(filters = {}) {
        // Placeholder - would need debtors table
        const { station_id, debtor_id, start_date, end_date, status } = filters;

        // This would join with debtors and payments tables
        // For now, return empty structure
        return {
            credit_sales: [],
            outstanding_balances: [],
            summary: {
                total_credit_sales: 0,
                total_outstanding: 0,
                total_collected: 0
            }
        };
    }
}

module.exports = new ReportService();

