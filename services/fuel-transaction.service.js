/**
 * Fuel Transaction Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class FuelTransactionService {
    /**
     * Get all fuel transactions (with filters)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT ft.*, 
                   s.name as station_name,
                   e.first_name || ' ' || e.last_name as authorized_by_name
            FROM fuel_transactions ft
            LEFT JOIN stations s ON ft.station_id = s.id
            LEFT JOIN employees e ON ft.authorized_by_employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND ft.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.start_date) {
            query += ` AND ft.transaction_datetime >= $${paramIndex++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND ft.transaction_datetime <= $${paramIndex++}`;
            params.push(filters.end_date);
        }
        if (filters.synced !== undefined) {
            query += ` AND ft.synced = $${paramIndex++}`;
            params.push(filters.synced);
        }

        query += ' ORDER BY ft.transaction_datetime DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get transaction by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT ft.*, 
                    s.name as station_name,
                    e.first_name || ' ' || e.last_name as authorized_by_name
             FROM fuel_transactions ft
             LEFT JOIN stations s ON ft.station_id = s.id
             LEFT JOIN employees e ON ft.authorized_by_employee_id = e.id
             WHERE ft.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create fuel transaction
     */
    async create(data) {
        const {
            station_id,
            pts_controller_id,
            pts_transaction_id,
            pump_number,
            nozzle,
            transaction_datetime,
            volume,
            amount,
            price,
            payment_form_id,
            payment_methods,
            tag,
            authorized_by_employee_id,
            recorded_by_terminal_id,
            synced
        } = data;

        const result = await db.query(
            `INSERT INTO fuel_transactions 
             (station_id, pts_controller_id, pts_transaction_id, pump_number, nozzle,
              transaction_datetime, volume, amount, price, payment_form_id, payment_methods,
              tag, authorized_by_employee_id, recorded_by_terminal_id, synced)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [
                station_id, pts_controller_id || null, pts_transaction_id || null,
                pump_number || null, nozzle || null, transaction_datetime || new Date(),
                volume || 0, amount || 0, price || 0, payment_form_id || null,
                payment_methods || null, tag || null, authorized_by_employee_id || null,
                recorded_by_terminal_id || null, synced || false
            ]
        );
        return result.rows[0];
    }

    /**
     * Mark transaction as synced
     */
    async markSynced(id) {
        const result = await db.query(
            'UPDATE fuel_transactions SET synced = true WHERE id = $1 RETURNING *',
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get transactions summary for a date range
     */
    async getSummary(stationId, startDate, endDate) {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_transactions,
                SUM(volume) as total_volume,
                SUM(amount) as total_amount,
                AVG(price) as avg_price
             FROM fuel_transactions
             WHERE station_id = $1 
               AND transaction_datetime >= $2 
               AND transaction_datetime <= $3`,
            [stationId, startDate, endDate]
        );
        return result.rows[0] || null;
    }
}

module.exports = new FuelTransactionService();

