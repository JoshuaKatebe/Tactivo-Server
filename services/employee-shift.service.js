/**
 * Employee Shift Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class EmployeeShiftService {
    /**
     * Get all employee shifts (with filters)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT es.*, 
                   s.name as station_name,
                   e.first_name || ' ' || e.last_name as employee_name
            FROM employee_shifts es
            LEFT JOIN stations s ON es.station_id = s.id
            LEFT JOIN employees e ON es.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND es.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND es.employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.status) {
            query += ` AND es.status = $${paramIndex++}`;
            params.push(filters.status);
        }

        query += ' ORDER BY es.start_time DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get shift by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT es.*, 
                    s.name as station_name,
                    e.first_name || ' ' || e.last_name as employee_name
             FROM employee_shifts es
             LEFT JOIN stations s ON es.station_id = s.id
             LEFT JOIN employees e ON es.employee_id = e.id
             WHERE es.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get open shift for employee
     */
    async getOpenShift(employeeId, stationId) {
        const result = await db.query(
            'SELECT * FROM employee_shifts WHERE employee_id = $1 AND station_id = $2 AND status = $3 ORDER BY start_time DESC LIMIT 1',
            [employeeId, stationId, 'open']
        );
        return result.rows[0] || null;
    }

    /**
     * Start shift
     */
    async startShift(data) {
        const {
            station_id,
            employee_id,
            station_shift_id,
            opening_totals,
            opening_cash
        } = data;

        const result = await db.query(
            `INSERT INTO employee_shifts 
             (station_id, employee_id, station_shift_id, opening_totals, opening_cash, status)
             VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
            [
                station_id, employee_id, station_shift_id || null,
                opening_totals || null, opening_cash || 0
            ]
        );
        return result.rows[0];
    }

    /**
     * End shift
     */
    async endShift(id, data) {
        const {
            closing_totals,
            closing_cash,
            cleared
        } = data;

        const result = await db.query(
            `UPDATE employee_shifts 
             SET end_time = now(), status = 'closed',
                 closing_totals = $1, closing_cash = $2, cleared = $3, updated_at = now()
             WHERE id = $4 RETURNING *`,
            [closing_totals || null, closing_cash || null, cleared || false, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Update shift
     */
    async update(id, data) {
        const {
            opening_totals,
            closing_totals,
            opening_cash,
            closing_cash,
            cleared
        } = data;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (opening_totals !== undefined) {
            updates.push(`opening_totals = $${paramIndex++}`);
            params.push(opening_totals);
        }
        if (closing_totals !== undefined) {
            updates.push(`closing_totals = $${paramIndex++}`);
            params.push(closing_totals);
        }
        if (opening_cash !== undefined) {
            updates.push(`opening_cash = $${paramIndex++}`);
            params.push(opening_cash);
        }
        if (closing_cash !== undefined) {
            updates.push(`closing_cash = $${paramIndex++}`);
            params.push(closing_cash);
        }
        if (cleared !== undefined) {
            updates.push(`cleared = $${paramIndex++}`);
            params.push(cleared);
        }

        if (updates.length === 0) {
            return await this.getById(id);
        }

        updates.push(`updated_at = now()`);
        params.push(id);

        const query = `UPDATE employee_shifts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);
        return result.rows[0] || null;
    }
}

module.exports = new EmployeeShiftService();

