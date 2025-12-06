/**
 * Roles Routes
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Role management
 */

const express = require('express');
const router = express.Router();
const roleService = require('../services/role.service');
const { authenticate, requireSuperuser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role (superuser only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - company_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cashier"
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 *       403:
 *         description: Superuser access required
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const companyId = req.query.company_id;
        const roles = await roleService.getAll(companyId);
        res.json({
            error: false,
            data: roles
        });
    } catch (error) {
        logger.error('Error getting roles', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get roles'
        });
    }
});

/**
 * GET /api/roles/:id
 * Get role by ID (with permissions)
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const role = await roleService.getById(req.params.id);
        
        if (!role) {
            return res.status(404).json({
                error: true,
                message: 'Role not found'
            });
        }

        res.json({
            error: false,
            data: role
        });
    } catch (error) {
        logger.error('Error getting role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get role'
        });
    }
});

/**
 * POST /api/roles
 * Create role
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { company_id, name, description, permission_ids } = req.body;

        if (!name) {
            return res.status(400).json({
                error: true,
                message: 'Name is required'
            });
        }

        const role = await roleService.create({ company_id, name, description, permission_ids });
        res.status(201).json({
            error: false,
            data: role
        });
    } catch (error) {
        logger.error('Error creating role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create role'
        });
    }
});

/**
 * PUT /api/roles/:id
 * Update role
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const role = await roleService.update(req.params.id, req.body);
        
        if (!role) {
            return res.status(404).json({
                error: true,
                message: 'Role not found'
            });
        }

        res.json({
            error: false,
            data: role
        });
    } catch (error) {
        logger.error('Error updating role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update role'
        });
    }
});

/**
 * DELETE /api/roles/:id
 * Delete role
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const role = await roleService.delete(req.params.id);
        
        if (!role) {
            return res.status(404).json({
                error: true,
                message: 'Role not found'
            });
        }

        res.json({
            error: false,
            message: 'Role deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete role'
        });
    }
});

/**
 * POST /api/roles/:roleId/assign/:employeeId
 * Assign role to employee
 */
router.post('/:roleId/assign/:employeeId', authenticate, async (req, res) => {
    try {
        const success = await roleService.assignRoleToEmployee(req.params.employeeId, req.params.roleId);
        
        if (!success) {
            return res.status(400).json({
                error: true,
                message: 'Failed to assign role'
            });
        }

        res.json({
            error: false,
            message: 'Role assigned successfully'
        });
    } catch (error) {
        logger.error('Error assigning role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to assign role'
        });
    }
});

/**
 * DELETE /api/roles/:roleId/assign/:employeeId
 * Remove role from employee
 */
router.delete('/:roleId/assign/:employeeId', authenticate, async (req, res) => {
    try {
        const success = await roleService.removeRoleFromEmployee(req.params.employeeId, req.params.roleId);
        
        if (!success) {
            return res.status(404).json({
                error: true,
                message: 'Role assignment not found'
            });
        }

        res.json({
            error: false,
            message: 'Role removed successfully'
        });
    } catch (error) {
        logger.error('Error removing role', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to remove role'
        });
    }
});

module.exports = router;

