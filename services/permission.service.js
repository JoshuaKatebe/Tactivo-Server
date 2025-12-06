/**
 * Permission Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class PermissionService {
    /**
     * Get all permissions
     */
    async getAll() {
        const result = await db.query('SELECT * FROM permissions ORDER BY code');
        return result.rows;
    }

    /**
     * Get permission by ID
     */
    async getById(id) {
        const result = await db.query('SELECT * FROM permissions WHERE id = $1', [id]);
        return result.rows[0] || null;
    }

    /**
     * Get permission by code
     */
    async getByCode(code) {
        const result = await db.query('SELECT * FROM permissions WHERE code = $1', [code]);
        return result.rows[0] || null;
    }

    /**
     * Create permission
     */
    async create(data) {
        const { code, description } = data;
        const result = await db.query(
            'INSERT INTO permissions (code, description) VALUES ($1, $2) RETURNING *',
            [code, description || null]
        );
        return result.rows[0];
    }

    /**
     * Update permission
     */
    async update(id, data) {
        const { code, description } = data;
        const result = await db.query(
            'UPDATE permissions SET code = $1, description = $2 WHERE id = $3 RETURNING *',
            [code, description || null, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete permission
     */
    async delete(id) {
        const result = await db.query('DELETE FROM permissions WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }

    /**
     * Initialize default permissions
     */
    async initializeDefaults() {
        const defaultPermissions = [
            { code: 'fuel.authorize', description: 'Authorize fuel pumps' },
            { code: 'fuel.stop', description: 'Stop fuel pumps' },
            { code: 'fuel.prices.view', description: 'View fuel prices' },
            { code: 'fuel.prices.update', description: 'Update fuel prices' },
            { code: 'shift.start', description: 'Start shift' },
            { code: 'shift.end', description: 'End shift' },
            { code: 'shift.view', description: 'View shifts' },
            { code: 'shop.sale.create', description: 'Create shop sales' },
            { code: 'shop.sale.view', description: 'View shop sales' },
            { code: 'shop.product.manage', description: 'Manage shop products' },
            { code: 'reports.view', description: 'View reports' },
            { code: 'employees.manage', description: 'Manage employees' },
            { code: 'config.view', description: 'View configuration' },
            { code: 'config.update', description: 'Update configuration' },
            { code: 'cash.reconcile', description: 'Reconcile cash' },
            { code: 'handover.create', description: 'Create handovers' }
        ];

        const created = [];
        for (const perm of defaultPermissions) {
            try {
                const existing = await this.getByCode(perm.code);
                if (!existing) {
                    const newPerm = await this.create(perm);
                    created.push(newPerm);
                }
            } catch (error) {
                logger.error(`Error creating permission ${perm.code}`, error);
            }
        }

        return created;
    }
}

module.exports = new PermissionService();

