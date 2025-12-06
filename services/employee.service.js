/**
 * Employee Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class EmployeeService {
    /**
     * Get all employees (optionally filtered)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT e.*, u.username, c.name as company_name, s.name as station_name
            FROM employees e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN companies c ON e.company_id = c.id
            LEFT JOIN stations s ON e.station_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.company_id) {
            query += ` AND e.company_id = $${paramIndex++}`;
            params.push(filters.company_id);
        }
        if (filters.station_id) {
            query += ` AND e.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.user_id) {
            query += ` AND e.user_id = $${paramIndex++}`;
            params.push(filters.user_id);
        }
        if (filters.active !== undefined) {
            query += ` AND e.active = $${paramIndex++}`;
            params.push(filters.active);
        }

        query += ' ORDER BY e.created_at DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get employee by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT e.*, u.username, c.name as company_name, s.name as station_name
             FROM employees e
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN companies c ON e.company_id = c.id
             LEFT JOIN stations s ON e.station_id = s.id
             WHERE e.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get employee by badge tag
     */
    async getByBadgeTag(stationId, badgeTag) {
        const result = await db.query(
            'SELECT * FROM employees WHERE station_id = $1 AND badge_tag = $2',
            [stationId, badgeTag]
        );
        return result.rows[0] || null;
    }

    /**
     * Create employee
     */
    async create(data) {
        const {
            company_id,
            station_id,
            user_id,
            first_name,
            last_name,
            badge_tag,
            card_id,
            phone,
            employee_code,
            active
        } = data;

        const result = await db.query(
            `INSERT INTO employees (company_id, station_id, user_id, first_name, last_name, 
             badge_tag, card_id, phone, employee_code, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [company_id || null, station_id || null, user_id || null, first_name, last_name || null,
             badge_tag || null, card_id || null, phone || null, employee_code || null, active !== undefined ? active : true]
        );
        return result.rows[0];
    }

    /**
     * Update employee
     */
    async update(id, data) {
        const {
            company_id,
            station_id,
            user_id,
            first_name,
            last_name,
            badge_tag,
            card_id,
            phone,
            employee_code,
            active
        } = data;

        const result = await db.query(
            `UPDATE employees 
             SET company_id = $1, station_id = $2, user_id = $3, first_name = $4, last_name = $5,
                 badge_tag = $6, card_id = $7, phone = $8, employee_code = $9, active = $10, updated_at = now()
             WHERE id = $11 RETURNING *`,
            [company_id || null, station_id || null, user_id || null, first_name, last_name || null,
             badge_tag || null, card_id || null, phone || null, employee_code || null, active !== undefined ? active : true, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete employee
     */
    async delete(id) {
        const result = await db.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new EmployeeService();

