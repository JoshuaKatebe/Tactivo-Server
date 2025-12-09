/**
 * Report Service - Generate various reports
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class ReportService {
    /**
     * Get comprehensive sales summary (fuel + shop combined)
     */
    async getSalesSummary(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        // Get fuel sales summary
        let fuelQuery = `
            SELECT 
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as total_amount
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

        // Get shop sales summary
        let shopQuery = `
            SELECT 
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as total_amount
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

        const fuelResult = await db.query(fuelQuery, fuelParams);
        const shopResult = await db.query(shopQuery, shopParams);

        const fuelData = fuelResult.rows[0] || { transaction_count: 0, total_amount: 0 };
        const shopData = shopResult.rows[0] || { transaction_count: 0, total_amount: 0 };

        const totalSales = parseFloat(fuelData.total_amount) + parseFloat(shopData.total_amount);
        const totalTransactions = parseInt(fuelData.transaction_count) + parseInt(shopData.transaction_count);
        const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        return {
            total_sales: totalSales,
            fuel_sales: parseFloat(fuelData.total_amount),
            store_sales: parseFloat(shopData.total_amount),
            transactions: totalTransactions,
            avg_transaction: avgTransaction
        };
    }

    /**
     * Get payment methods breakdown
     */
    async getPaymentMethodsBreakdown(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        // Get fuel payment methods
        let fuelQuery = `
            SELECT 
                payment_methods,
                amount
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

        // Get shop payment methods
        let shopQuery = `
            SELECT 
                payments,
                total_amount
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

        const fuelResult = await db.query(fuelQuery, fuelParams);
        const shopResult = await db.query(shopQuery, shopParams);

        let cashTotal = 0;
        let cardTotal = 0;

        // Process fuel transactions
        fuelResult.rows.forEach(row => {
            if (row.payment_methods) {
                // payment_methods is JSONB, could be array or object
                const methods = Array.isArray(row.payment_methods)
                    ? row.payment_methods
                    : [row.payment_methods];

                methods.forEach(method => {
                    const methodType = method?.type || method?.method || 'cash';
                    const amount = parseFloat(method?.amount || row.amount || 0);

                    if (methodType.toLowerCase().includes('cash')) {
                        cashTotal += amount;
                    } else if (methodType.toLowerCase().includes('card')) {
                        cardTotal += amount;
                    } else {
                        // Default to cash if unknown
                        cashTotal += amount;
                    }
                });
            } else {
                // Default to cash if no payment method specified
                cashTotal += parseFloat(row.amount || 0);
            }
        });

        // Process shop sales
        shopResult.rows.forEach(row => {
            if (row.payments) {
                const payments = Array.isArray(row.payments)
                    ? row.payments
                    : [row.payments];

                payments.forEach(payment => {
                    const methodType = payment?.type || payment?.method || 'cash';
                    const amount = parseFloat(payment?.amount || row.total_amount || 0);

                    if (methodType.toLowerCase().includes('cash')) {
                        cashTotal += amount;
                    } else if (methodType.toLowerCase().includes('card')) {
                        cardTotal += amount;
                    } else {
                        cashTotal += amount;
                    }
                });
            } else {
                cashTotal += parseFloat(row.total_amount || 0);
            }
        });

        const total = cashTotal + cardTotal;
        return {
            cash: {
                amount: cashTotal,
                percentage: total > 0 ? (cashTotal / total) * 100 : 0
            },
            card: {
                amount: cardTotal,
                percentage: total > 0 ? (cardTotal / total) * 100 : 0
            }
        };
    }

    /**
     * Get daily sales breakdown (fuel + shop combined)
     */
    async getDailySalesBreakdown(filters = {}) {
        const { station_id, start_date, end_date } = filters;

        // Get fuel sales by date
        let fuelQuery = `
            SELECT 
                DATE(transaction_datetime) as date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(amount), 0) as fuel_sales
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

        // Get shop sales by date
        let shopQuery = `
            SELECT 
                DATE(sale_time) as date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total_amount), 0) as store_sales
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
            dateMap.set(row.date.toISOString().split('T')[0], {
                date: row.date,
                fuel_sales: parseFloat(row.fuel_sales) || 0,
                store_sales: 0,
                transactions: parseInt(row.transaction_count) || 0
            });
        });

        shopResult.rows.forEach(row => {
            const dateKey = row.date.toISOString().split('T')[0];
            if (dateMap.has(dateKey)) {
                const existing = dateMap.get(dateKey);
                existing.store_sales = parseFloat(row.store_sales) || 0;
                existing.transactions += parseInt(row.transaction_count) || 0;
            } else {
                dateMap.set(dateKey, {
                    date: row.date,
                    fuel_sales: 0,
                    store_sales: parseFloat(row.store_sales) || 0,
                    transactions: parseInt(row.transaction_count) || 0
                });
            }
        });

        return Array.from(dateMap.values())
            .map(row => ({
                ...row,
                total_sales: row.fuel_sales + row.store_sales
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get sales report (legacy - for backward compatibility)
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
                COALESCE(SUM(ft.volume), 0) as total_volume,
                COALESCE(SUM(ft.amount), 0) as total_amount,
                COALESCE(AVG(ft.price), 0) as avg_price
            FROM fuel_transactions ft
            INNER JOIN pts_controllers pc ON ft.pts_controller_id = pc.id
            INNER JOIN pumps p ON pc.id = p.pts_id 
                AND ft.pump_number = p.pump_number
            INNER JOIN nozzles n ON p.id = n.pump_id 
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

        query += ' GROUP BY n.fuel_grade_id ORDER BY total_amount DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get itemized fuel transactions
     */
    async getItemizedFuelTransactions(filters = {}) {
        const { station_id, start_date, end_date, limit = 100, offset = 0 } = filters;

        let query = `
            SELECT 
                ft.*,
                p.name as pump_name,
                n.fuel_grade_id,
                e.first_name || ' ' || e.last_name as authorized_by_name
            FROM fuel_transactions ft
            LEFT JOIN pts_controllers pc ON ft.pts_controller_id = pc.id
            LEFT JOIN pumps p ON pc.id = p.pts_id AND ft.pump_number = p.pump_number
            LEFT JOIN nozzles n ON p.id = n.pump_id AND ft.nozzle = n.nozzle_number
            LEFT JOIN employees e ON ft.authorized_by_employee_id = e.id
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

        query += ` ORDER BY ft.transaction_datetime DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM fuel_transactions ft
            WHERE 1=1
        `;
        const countParams = [];
        let countParamIndex = 1;

        if (station_id) {
            countQuery += ` AND ft.station_id = $${countParamIndex++}`;
            countParams.push(station_id);
        }
        if (start_date) {
            countQuery += ` AND ft.transaction_datetime >= $${countParamIndex++}`;
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ` AND ft.transaction_datetime <= $${countParamIndex++}`;
            countParams.push(end_date);
        }

        const [result, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, countParams)
        ]);

        return {
            transactions: result.rows,
            total: parseInt(countResult.rows[0]?.total || 0),
            limit,
            offset
        };
    }

    /**
     * Get itemized shop sales
     */
    async getItemizedShopSales(filters = {}) {
        const { station_id, start_date, end_date, limit = 100, offset = 0 } = filters;

        let query = `
            SELECT 
                ss.*,
                e.first_name || ' ' || e.last_name as employee_name,
                json_agg(
                    json_build_object(
                        'id', ssi.id,
                        'product_id', ssi.product_id,
                        'product_name', sp.name,
                        'qty', ssi.qty,
                        'unit_price', ssi.unit_price,
                        'line_total', ssi.line_total
                    )
                ) as items
            FROM shop_sales ss
            LEFT JOIN employees e ON ss.employee_id = e.id
            LEFT JOIN shop_sale_items ssi ON ss.id = ssi.sale_id
            LEFT JOIN shop_products sp ON ssi.product_id = sp.id
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

        query += ` GROUP BY ss.id, e.first_name, e.last_name 
                  ORDER BY ss.sale_time DESC 
                  LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM shop_sales ss
            WHERE 1=1
        `;
        const countParams = [];
        let countParamIndex = 1;

        if (station_id) {
            countQuery += ` AND ss.station_id = $${countParamIndex++}`;
            countParams.push(station_id);
        }
        if (start_date) {
            countQuery += ` AND ss.sale_time >= $${countParamIndex++}`;
            countParams.push(start_date);
        }
        if (end_date) {
            countQuery += ` AND ss.sale_time <= $${countParamIndex++}`;
            countParams.push(end_date);
        }

        const [result, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, countParams)
        ]);

        return {
            sales: result.rows,
            total: parseInt(countResult.rows[0]?.total || 0),
            limit,
            offset
        };
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

    /**
     * Get detailed shift report with all transactions
     * @param {string} shiftId - Shift ID
     * @returns {Promise<Object>} Detailed shift report
     */
    async getShiftReport(shiftId) {
        try {
            // Get shift details
            const shiftResult = await db.query(
                `SELECT es.*, 
                        e.first_name || ' ' || e.last_name as employee_name,
                        e.employee_code,
                        s.name as station_name
                 FROM employee_shifts es
                 LEFT JOIN employees e ON es.employee_id = e.id
                 LEFT JOIN stations s ON es.station_id = s.id
                 WHERE es.id = $1`,
                [shiftId]
            );

            if (shiftResult.rows.length === 0) {
                return null;
            }

            const shift = shiftResult.rows[0];

            // Get all transactions for this shift
            const transactionsResult = await db.query(
                `SELECT ft.*
                 FROM fuel_transactions ft
                 WHERE ft.authorized_by_employee_id = $1
                   AND ft.station_id = $2
                   AND ft.transaction_datetime >= $3
                   AND ($4::timestamptz IS NULL OR ft.transaction_datetime <= $4)
                 ORDER BY ft.transaction_datetime ASC`,
                [shift.employee_id, shift.station_id, shift.start_time, shift.end_time]
            );

            // Calculate summary statistics
            const summaryResult = await db.query(
                `SELECT 
                    COUNT(*) as transaction_count,
                    COALESCE(SUM(volume), 0) as total_volume,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COALESCE(AVG(price), 0) as average_price,
                    COALESCE(MIN(amount), 0) as min_transaction,
                    COALESCE(MAX(amount), 0) as max_transaction
                 FROM fuel_transactions
                 WHERE authorized_by_employee_id = $1
                   AND station_id = $2
                   AND transaction_datetime >= $3
                   AND ($4::timestamptz IS NULL OR transaction_datetime <= $4)`,
                [shift.employee_id, shift.station_id, shift.start_time, shift.end_time]
            );

            return {
                shift: {
                    ...shift,
                    duration_hours: shift.end_time
                        ? (new Date(shift.end_time) - new Date(shift.start_time)) / 1000 / 60 / 60
                        : null
                },
                transactions: transactionsResult.rows,
                summary: summaryResult.rows[0]
            };
        } catch (error) {
            logger.error('Error getting shift report', error);
            throw error;
        }
    }

    /**
     * Get attendant performance report
     * @param {string} employeeId - Employee ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} Attendant performance report
     */
    async getAttendantPerformanceReport(employeeId, startDate, endDate) {
        try {
            // Get employee details
            const employeeResult = await db.query(
                `SELECT e.*, 
                        c.name as company_name,
                        s.name as station_name
                 FROM employees e
                 LEFT JOIN companies c ON e.company_id = c.id
                 LEFT JOIN stations s ON e.station_id = s.id
                 WHERE e.id = $1`,
                [employeeId]
            );

            if (employeeResult.rows.length === 0) {
                return null;
            }

            // Get all shifts in the date range
            const shiftsResult = await db.query(
                `SELECT 
                    COUNT(*) as total_shifts,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_shifts,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_shifts,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as avg_shift_hours
                 FROM employee_shifts
                 WHERE employee_id = $1
                   AND start_time >= $2
                   AND start_time <= $3`,
                [employeeId, startDate, endDate]
            );

            // Get transaction statistics
            const transactionsResult = await db.query(
                `SELECT 
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(volume), 0) as total_volume,
                    COALESCE(SUM(amount), 0) as total_sales,
                    COALESCE(AVG(amount), 0) as avg_transaction_amount,
                    COALESCE(MIN(amount), 0) as min_transaction,
                    COALESCE(MAX(amount), 0) as max_transaction
                 FROM fuel_transactions
                 WHERE authorized_by_employee_id = $1
                   AND transaction_datetime >= $2
                   AND transaction_datetime <= $3`,
                [employeeId, startDate, endDate]
            );

            // Get transactions by pump
            const pumpBreakdownResult = await db.query(
                `SELECT 
                    pump_number,
                    COUNT(*) as transaction_count,
                    SUM(volume) as total_volume,
                    SUM(amount) as total_amount
                 FROM fuel_transactions
                 WHERE authorized_by_employee_id = $1
                   AND transaction_datetime >= $2
                   AND transaction_datetime <= $3
                 GROUP BY pump_number
                 ORDER BY pump_number`,
                [employeeId, startDate, endDate]
            );

            return {
                employee: employeeResult.rows[0],
                period: {
                    start_date: startDate,
                    end_date: endDate
                },
                shifts: shiftsResult.rows[0],
                transactions: transactionsResult.rows[0],
                pump_breakdown: pumpBreakdownResult.rows
            };
        } catch (error) {
            logger.error('Error getting attendant performance report', error);
            throw error;
        }
    }

    /**
     * Get shift reconciliation report
     * @param {string} shiftId - Shift ID
     * @returns {Promise<Object>} Reconciliation report
     */
    async getShiftReconciliation(shiftId) {
        try {
            const shiftReport = await this.getShiftReport(shiftId);

            if (!shiftReport) {
                return null;
            }

            const shift = shiftReport.shift;
            const summary = shiftReport.summary;

            // Calculate expected cash
            const expectedCash = parseFloat(shift.opening_cash || 0) + parseFloat(summary.total_amount || 0);
            const actualCash = parseFloat(shift.closing_cash || 0);
            const variance = actualCash - expectedCash;

            // Calculate reconciliation status
            const reconciliationStatus = Math.abs(variance) < 0.01 ? 'balanced' :
                variance > 0 ? 'over' : 'short';

            return {
                shift_id: shiftId,
                employee_name: shift.employee_name,
                shift_period: {
                    start: shift.start_time,
                    end: shift.end_time,
                    duration_hours: shift.duration_hours
                },
                cash_flow: {
                    opening_cash: parseFloat(shift.opening_cash || 0),
                    sales_amount: parseFloat(summary.total_amount || 0),
                    expected_closing: expectedCash,
                    actual_closing: actualCash,
                    variance: variance
                },
                reconciliation: {
                    status: reconciliationStatus,
                    variance_percentage: expectedCash > 0 ? (variance / expectedCash * 100).toFixed(2) : 0,
                    cleared: shift.cleared || false
                },
                transactions: {
                    count: parseInt(summary.transaction_count || 0),
                    total_volume: parseFloat(summary.total_volume || 0),
                    average_price: parseFloat(summary.average_price || 0)
                }
            };
        } catch (error) {
            logger.error('Error getting shift reconciliation', error);
            throw error;
        }
    }

    /**
     * Get daily shifts summary for a station
     * @param {string} stationId - Station ID
     * @param {Date} date - Date to get shifts for
     * @returns {Promise<Object>} Daily shifts summary
     */
    async getDailyShiftsSummary(stationId, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            // Get all shifts for the day
            const shiftsResult = await db.query(
                `SELECT es.*,
                        e.first_name || ' ' || e.last_name as employee_name,
                        e.employee_code
                 FROM employee_shifts es
                 LEFT JOIN employees e ON es.employee_id = e.id
                 WHERE es.station_id = $1
                   AND es.start_time >= $2
                   AND es.start_time <= $3
                 ORDER BY es.start_time ASC`,
                [stationId, startOfDay, endOfDay]
            );

            // Get aggregate statistics for all shifts
            const aggregateResult = await db.query(
                `SELECT 
                    COUNT(DISTINCT es.id) as total_shifts,
                    COUNT(DISTINCT es.employee_id) as unique_employees,
                    SUM(CASE WHEN es.status = 'open' THEN 1 ELSE 0 END) as open_shifts,
                    SUM(CASE WHEN es.status = 'closed' THEN 1 ELSE 0 END) as closed_shifts,
                    SUM(COALESCE(es.opening_cash, 0)) as total_opening_cash,
                    SUM(COALESCE(es.closing_cash, 0)) as total_closing_cash
                 FROM employee_shifts es
                 WHERE es.station_id = $1
                   AND es.start_time >= $2
                   AND es.start_time <= $3`,
                [stationId, startOfDay, endOfDay]
            );

            // Get total transactions across all shifts
            const transactionsResult = await db.query(
                `SELECT 
                    COUNT(*) as total_transactions,
                    COALESCE(SUM(volume), 0) as total_volume,
                    COALESCE(SUM(amount), 0) as total_sales
                 FROM fuel_transactions ft
                 WHERE ft.station_id = $1
                   AND ft.transaction_datetime >= $2
                   AND ft.transaction_datetime <= $3`,
                [stationId, startOfDay, endOfDay]
            );

            // Calculate details for each shift
            const shiftsWithDetails = await Promise.all(
                shiftsResult.rows.map(async (shift) => {
                    const shiftTransactions = await db.query(
                        `SELECT 
                            COUNT(*) as count,
                            COALESCE(SUM(amount), 0) as total
                         FROM fuel_transactions
                         WHERE authorized_by_employee_id = $1
                           AND station_id = $2
                           AND transaction_datetime >= $3
                           AND ($4::timestamptz IS NULL OR transaction_datetime <= $4)`,
                        [shift.employee_id, shift.station_id, shift.start_time, shift.end_time]
                    );

                    return {
                        ...shift,
                        transaction_count: parseInt(shiftTransactions.rows[0].count || 0),
                        transaction_total: parseFloat(shiftTransactions.rows[0].total || 0)
                    };
                })
            );

            return {
                station_id: stationId,
                date: date,
                summary: {
                    ...aggregateResult.rows[0],
                    ...transactionsResult.rows[0]
                },
                shifts: shiftsWithDetails
            };
        } catch (error) {
            logger.error('Error getting daily shifts summary', error);
            throw error;
        }
    }
}

module.exports = new ReportService();

