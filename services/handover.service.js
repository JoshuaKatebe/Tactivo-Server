/**
 * Handover Service - Cash clearance and handovers
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class HandoverService {
    /**
     * Get all handovers (with filters)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT h.*, 
                   s.name as station_name,
                   e1.first_name || ' ' || e1.last_name as employee_name,
                   e2.first_name || ' ' || e2.last_name as cashier_name
            FROM handovers h
            LEFT JOIN stations s ON h.station_id = s.id
            LEFT JOIN employees e1 ON h.employee_id = e1.id
            LEFT JOIN employees e2 ON h.cashier_employee_id = e2.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND h.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND h.employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.shift_id) {
            query += ` AND h.employee_shift_id = $${paramIndex++}`;
            params.push(filters.shift_id);
        }
        if (filters.start_date) {
            query += ` AND h.handover_time >= $${paramIndex++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND h.handover_time <= $${paramIndex++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY h.handover_time DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get handover by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT h.*, 
                    s.name as station_name,
                    e1.first_name || ' ' || e1.last_name as employee_name,
                    e2.first_name || ' ' || e2.last_name as cashier_name
             FROM handovers h
             LEFT JOIN stations s ON h.station_id = s.id
             LEFT JOIN employees e1 ON h.employee_id = e1.id
             LEFT JOIN employees e2 ON h.cashier_employee_id = e2.id
             WHERE h.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create handover
     */
    async create(data) {
        const {
            station_id,
            employee_id,
            cashier_employee_id,
            employee_shift_id,
            amount_expected,
            amount_cashed,
            notes
        } = data;

        const difference = parseFloat(amount_cashed || 0) - parseFloat(amount_expected || 0);

        const result = await db.query(
            `INSERT INTO handovers 
             (station_id, employee_id, cashier_employee_id, employee_shift_id,
              amount_expected, amount_cashed, difference, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                station_id, employee_id, cashier_employee_id || null,
                employee_shift_id || null, amount_expected || 0,
                amount_cashed || 0, difference, notes || null
            ]
        );
        return result.rows[0];
    }

    /**
     * Update handover
     */
    async update(id, data) {
        const {
            amount_expected,
            amount_cashed,
            notes
        } = data;

        const difference = amount_cashed !== undefined && amount_expected !== undefined
            ? parseFloat(amount_cashed) - parseFloat(amount_expected)
            : null;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (amount_expected !== undefined) {
            updates.push(`amount_expected = $${paramIndex++}`);
            params.push(amount_expected);
        }
        if (amount_cashed !== undefined) {
            updates.push(`amount_cashed = $${paramIndex++}`);
            params.push(amount_cashed);
        }
        if (difference !== null) {
            updates.push(`difference = $${paramIndex++}`);
            params.push(difference);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            params.push(notes);
        }

        if (updates.length === 0) {
            return await this.getById(id);
        }

        params.push(id);
        const query = `UPDATE handovers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);
        return result.rows[0] || null;
    }

    /**
     * Delete handover
     */
    async delete(id) {
        const result = await db.query('DELETE FROM handovers WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new HandoverService();

