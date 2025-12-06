/**
 * Station Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class StationService {
    /**
     * Get all stations (optionally filtered by company)
     */
    async getAll(companyId = null) {
        let query = `
            SELECT s.*, c.name as company_name, o.name as organization_name
            FROM stations s
            JOIN companies c ON s.company_id = c.id
            JOIN organizations o ON c.organization_id = o.id
        `;
        const params = [];
        
        if (companyId) {
            query += ' WHERE s.company_id = $1';
            params.push(companyId);
        }
        
        query += ' ORDER BY s.created_at DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get station by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT s.*, c.name as company_name, o.name as organization_name
             FROM stations s
             JOIN companies c ON s.company_id = c.id
             JOIN organizations o ON c.organization_id = o.id
             WHERE s.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get station by code and company
     */
    async getByCode(companyId, code) {
        const result = await db.query(
            'SELECT * FROM stations WHERE company_id = $1 AND code = $2',
            [companyId, code]
        );
        return result.rows[0] || null;
    }

    /**
     * Create station
     */
    async create(data) {
        const {
            company_id,
            code,
            name,
            address,
            timezone,
            pts_hostname,
            pts_port,
            config
        } = data;

        const result = await db.query(
            `INSERT INTO stations (company_id, code, name, address, timezone, pts_hostname, pts_port, config)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [company_id, code, name, address || null, timezone || 'UTC', pts_hostname || null, pts_port || 80, config || null]
        );
        return result.rows[0];
    }

    /**
     * Update station
     */
    async update(id, data) {
        const {
            code,
            name,
            address,
            timezone,
            pts_hostname,
            pts_port,
            config
        } = data;

        const result = await db.query(
            `UPDATE stations 
             SET code = $1, name = $2, address = $3, timezone = $4, 
                 pts_hostname = $5, pts_port = $6, config = $7, updated_at = now()
             WHERE id = $8 RETURNING *`,
            [code, name, address || null, timezone || 'UTC', pts_hostname || null, pts_port || 80, config || null, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete station
     */
    async delete(id) {
        const result = await db.query('DELETE FROM stations WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new StationService();

