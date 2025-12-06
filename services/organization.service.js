/**
 * Organization Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class OrganizationService {
    /**
     * Get all organizations
     */
    async getAll() {
        const result = await db.query('SELECT * FROM organizations ORDER BY created_at DESC');
        return result.rows;
    }

    /**
     * Get organization by ID
     */
    async getById(id) {
        const result = await db.query('SELECT * FROM organizations WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Create organization
     */
    async create(data) {
        const { name } = data;
        const result = await db.query(
            'INSERT INTO organizations (name) VALUES ($1) RETURNING *',
            [name]
        );
        return result.rows[0];
    }

    /**
     * Update organization
     */
    async update(id, data) {
        const { name } = data;
        const result = await db.query(
            'UPDATE organizations SET name = $1, updated_at = now() WHERE id = $2 RETURNING *',
            [name, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete organization
     */
    async delete(id) {
        const result = await db.query('DELETE FROM organizations WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new OrganizationService();

