/**
 * Company Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class CompanyService {
    /**
     * Get all companies (optionally filtered by organization)
     */
    async getAll(organizationId = null) {
        let query = 'SELECT * FROM companies';
        const params = [];
        
        if (organizationId) {
            query += ' WHERE organization_id = $1';
            params.push(organizationId);
        }
        
        query += ' ORDER BY created_at DESC';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get company by ID
     */
    async getById(id) {
        const result = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Create company
     */
    async create(data) {
        const { organization_id, name, contact } = data;
        const result = await db.query(
            'INSERT INTO companies (organization_id, name, contact) VALUES ($1, $2, $3) RETURNING *',
            [organization_id, name, contact || null]
        );
        return result.rows[0];
    }

    /**
     * Update company
     */
    async update(id, data) {
        const { name, contact } = data;
        const result = await db.query(
            'UPDATE companies SET name = $1, contact = $2, updated_at = now() WHERE id = $3 RETURNING *',
            [name, contact || null, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete company
     */
    async delete(id) {
        const result = await db.query('DELETE FROM companies WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new CompanyService();

