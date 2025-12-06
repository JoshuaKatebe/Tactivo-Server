/**
 * Role Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class RoleService {
    /**
     * Get all roles (optionally filtered by company)
     */
    async getAll(companyId = null) {
        let query = 'SELECT * FROM roles WHERE 1=1';
        const params = [];
        
        if (companyId) {
            query += ' AND company_id = $1';
            params.push(companyId);
        }
        
        query += ' ORDER BY name';
        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get role by ID (with permissions)
     */
    async getById(id) {
        const roleResult = await db.query('SELECT * FROM roles WHERE id = $1', [id]);
        if (roleResult.rows.length === 0) {
            return null;
        }

        const role = roleResult.rows[0];
        
        // Get permissions for this role
        const permissionsResult = await db.query(
            `SELECT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
            [id]
        );
        
        role.permissions = permissionsResult.rows;
        return role;
    }

    /**
     * Create role
     */
    async create(data) {
        const { company_id, name, description, permission_ids } = data;

        return await db.transaction(async (client) => {
            // Create role
            const roleResult = await client.query(
                'INSERT INTO roles (company_id, name, description) VALUES ($1, $2, $3) RETURNING *',
                [company_id || null, name, description || null]
            );
            
            const role = roleResult.rows[0];

            // Assign permissions if provided
            if (permission_ids && permission_ids.length > 0) {
                for (const permissionId of permission_ids) {
                    await client.query(
                        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                        [role.id, permissionId]
                    );
                }
            }

            return role;
        });
    }

    /**
     * Update role
     */
    async update(id, data) {
        const { name, description, permission_ids } = data;

        return await db.transaction(async (client) => {
            // Update role
            const roleResult = await client.query(
                'UPDATE roles SET name = $1, description = $2 WHERE id = $3 RETURNING *',
                [name, description || null, id]
            );
            
            if (roleResult.rows.length === 0) {
                return null;
            }

            const role = roleResult.rows[0];

            // Update permissions if provided
            if (permission_ids !== undefined) {
                // Remove all existing permissions
                await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
                
                // Add new permissions
                if (permission_ids.length > 0) {
                    for (const permissionId of permission_ids) {
                        await client.query(
                            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
                            [id, permissionId]
                        );
                    }
                }
            }

            return role;
        });
    }

    /**
     * Delete role
     */
    async delete(id) {
        const result = await db.query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }

    /**
     * Get employee roles
     */
    async getEmployeeRoles(employeeId) {
        const result = await db.query(
            `SELECT r.* FROM roles r
             INNER JOIN employee_roles er ON r.id = er.role_id
             WHERE er.employee_id = $1`,
            [employeeId]
        );
        return result.rows;
    }

    /**
     * Assign role to employee
     */
    async assignRoleToEmployee(employeeId, roleId) {
        try {
            await db.query(
                'INSERT INTO employee_roles (employee_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [employeeId, roleId]
            );
            return true;
        } catch (error) {
            logger.error('Error assigning role to employee', error);
            return false;
        }
    }

    /**
     * Remove role from employee
     */
    async removeRoleFromEmployee(employeeId, roleId) {
        const result = await db.query(
            'DELETE FROM employee_roles WHERE employee_id = $1 AND role_id = $2',
            [employeeId, roleId]
        );
        return result.rowCount > 0;
    }

    /**
     * Get employee permissions (all permissions from all roles)
     */
    async getEmployeePermissions(employeeId) {
        const result = await db.query(
            `SELECT DISTINCT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN employee_roles er ON rp.role_id = er.role_id
             WHERE er.employee_id = $1`,
            [employeeId]
        );
        return result.rows;
    }
}

module.exports = new RoleService();

