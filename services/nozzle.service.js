/**
 * Nozzle Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class NozzleService {
    /**
     * Get all nozzles (optionally filtered)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT n.*, p.pump_number, p.name as pump_name, pc.station_id
            FROM nozzles n
            LEFT JOIN pumps p ON n.pump_id = p.id
            LEFT JOIN pts_controllers pc ON p.pts_id = pc.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.pump_id) {
            query += ` AND n.pump_id = $${paramIndex++}`;
            params.push(filters.pump_id);
        }
        if (filters.station_id) {
            query += ` AND pc.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }

        query += ' ORDER BY p.pump_number, n.nozzle_number';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get nozzle by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT n.*, p.pump_number, p.name as pump_name
             FROM nozzles n
             LEFT JOIN pumps p ON n.pump_id = p.id
             WHERE n.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create nozzle
     */
    async create(data) {
        const {
            pump_id,
            nozzle_number,
            fuel_grade_id
        } = data;

        const result = await db.query(
            'INSERT INTO nozzles (pump_id, nozzle_number, fuel_grade_id) VALUES ($1, $2, $3) RETURNING *',
            [pump_id, nozzle_number, fuel_grade_id || null]
        );
        return result.rows[0];
    }

    /**
     * Update nozzle
     */
    async update(id, data) {
        const {
            fuel_grade_id
        } = data;

        const result = await db.query(
            'UPDATE nozzles SET fuel_grade_id = $1 WHERE id = $2 RETURNING *',
            [fuel_grade_id || null, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete nozzle
     */
    async delete(id) {
        const result = await db.query('DELETE FROM nozzles WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new NozzleService();

