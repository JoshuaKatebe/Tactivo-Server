/**
 * Employees Routes
 * @swagger
 * tags:
 *   - name: Employees
 *     description: Employee management
 */

const express = require('express');
const router = express.Router();
const employeeService = require('../services/employee.service');
const roleService = require('../services/role.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               station_id:
 *                 type: string
 *                 format: uuid
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               first_name:
 *                 type: string
 *                 example: "John"
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *               badge_tag:
 *                 type: string
 *               employee_code:
 *                 type: string
 *               phone:
 *                 type: string
 *               active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Employee created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const filters = {
            company_id: req.query.company_id,
            station_id: req.query.station_id,
            active: req.query.active !== undefined ? req.query.active === 'true' : undefined
        };

        const employees = await employeeService.getAll(filters);
        res.json({
            error: false,
            data: employees
        });
    } catch (error) {
        logger.error('Error getting employees', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get employees'
        });
    }
});

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               badge_tag:
 *                 type: string
 *               employee_code:
 *                 type: string
 *               phone:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 *   delete:
 *     summary: Delete employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee deleted
 *       404:
 *         description: Employee not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const employee = await employeeService.getById(req.params.id);

        if (!employee) {
            return res.status(404).json({
                error: true,
                message: 'Employee not found'
            });
        }

        res.json({
            error: false,
            data: employee
        });
    } catch (error) {
        logger.error('Error getting employee', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get employee'
        });
    }
});

/**
 * POST /api/employees
 * Create employee
 */
router.post('/', authenticate, async (req, res) => {
    try {
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
        } = req.body;

        if (!first_name) {
            return res.status(400).json({
                error: true,
                message: 'First name is required'
            });
        }

        const employee = await employeeService.create({
            company_id, station_id, user_id, first_name, last_name,
            badge_tag, card_id, phone, employee_code, active
        });

        // Sync to PTS Controller
        try {
            const fuelService = req.app.locals.fuelService;
            if (fuelService) {
                const fullName = employee.last_name ? `${employee.first_name} ${employee.last_name}` : employee.first_name;
                const identity = employee.employee_code || fullName;

                // Run in background to not block response
                fuelService.ensureUserExists(identity, identity).catch(err =>
                    logger.warn('Failed to sync new employee to PTS', { id: employee.id, error: err.message })
                );
            }
        } catch (error) {
            logger.warn('Error initiating PTS sync for new employee', { error: error.message });
        }

        res.status(201).json({
            error: false,
            data: employee
        });
    } catch (error) {
        logger.error('Error creating employee', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create employee'
        });
    }
});

/**
 * PUT /api/employees/:id
 * Update employee
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const employee = await employeeService.update(req.params.id, req.body);

        if (!employee) {
            return res.status(404).json({
                error: true,
                message: 'Employee not found'
            });
        }

        // Sync to PTS Controller
        try {
            const fuelService = req.app.locals.fuelService;
            if (fuelService) {
                const fullName = employee.last_name ? `${employee.first_name} ${employee.last_name}` : employee.first_name;
                const identity = employee.employee_code || fullName;

                // Run in background to not block response
                fuelService.ensureUserExists(identity, identity).catch(err =>
                    logger.warn('Failed to sync updated employee to PTS', { id: employee.id, error: err.message })
                );
            }
        } catch (error) {
            logger.warn('Error initiating PTS sync for updated employee', { error: error.message });
        }

        res.json({
            error: false,
            data: employee
        });
    } catch (error) {
        logger.error('Error updating employee', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update employee'
        });
    }
});

/**
 * DELETE /api/employees/:id
 * Delete employee
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const employee = await employeeService.delete(req.params.id);

        if (!employee) {
            return res.status(404).json({
                error: true,
                message: 'Employee not found'
            });
        }

        res.json({
            error: false,
            message: 'Employee deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting employee', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete employee'
        });
    }
});

/**
 * @swagger
 * /api/employees/{id}/roles:
 *   get:
 *     summary: Get employee roles
 *     description: Get all roles assigned to an employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of employee roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       404:
 *         description: Employee not found
 */
router.get('/:id/roles', authenticate, async (req, res) => {
    try {
        // First check if employee exists
        const employee = await employeeService.getById(req.params.id);
        if (!employee) {
            return res.status(404).json({
                error: true,
                message: 'Employee not found'
            });
        }

        const roles = await roleService.getEmployeeRoles(req.params.id);
        res.json({
            error: false,
            data: roles
        });
    } catch (error) {
        logger.error('Error getting employee roles', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get employee roles'
        });
    }
});

module.exports = router;


