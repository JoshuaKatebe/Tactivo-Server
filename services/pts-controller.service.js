/**
 * PTS Controller Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class PTSControllerService {
    /**
     * Get all PTS controllers (optionally filtered)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT pc.*, s.name as station_name
            FROM pts_controllers pc
            LEFT JOIN stations s ON pc.station_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND pc.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }

        query += ' ORDER BY pc.created_at DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get PTS controller by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT pc.*, s.name as station_name
             FROM pts_controllers pc
             LEFT JOIN stations s ON pc.station_id = s.id
             WHERE pc.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create PTS controller
     */
    async create(data) {
        const {
            station_id,
            identifier,
            hostname,
            port,
            http_auth
        } = data;

        const result = await db.query(
            `INSERT INTO pts_controllers 
             (station_id, identifier, hostname, port, http_auth)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
                station_id || null, identifier || null, hostname || null,
                port || 80, http_auth || null
            ]
        );
        return result.rows[0];
    }

    /**
     * Update PTS controller
     */
    async update(id, data) {
        const {
            identifier,
            hostname,
            port,
            http_auth
        } = data;

        const result = await db.query(
            `UPDATE pts_controllers 
             SET identifier = $1, hostname = $2, port = $3, http_auth = $4, updated_at = now()
             WHERE id = $5 RETURNING *`,
            [identifier || null, hostname || null, port || 80, http_auth || null, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete PTS controller
     */
    async delete(id) {
        const result = await db.query('DELETE FROM pts_controllers WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new PTSControllerService();

