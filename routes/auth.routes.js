/**
 * Authentication Routes
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication endpoints
 */

const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const { generateToken, authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "joshuakatebe"
 *               password:
 *                 type: string
 *                 example: "@we$omE123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Missing username or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Debug logging
        logger.debug('Login attempt', {
            username: username,
            passwordLength: password ? password.length : 0,
            passwordPreview: password ? password.substring(0, 3) + '...' : 'null',
            bodyKeys: Object.keys(req.body)
        });

        if (!username || !password) {
            logger.warn('Login failed: missing credentials', {
                hasUsername: !!username,
                hasPassword: !!password
            });
            return res.status(400).json({
                error: true,
                message: 'Username and password are required'
            });
        }

        const user = await userService.verifyPassword(username, password);
        
        if (!user) {
            logger.warn('Login failed: invalid credentials', {
                username: username,
                passwordLength: password.length
            });
        }

        if (!user) {
            return res.status(401).json({
                error: true,
                message: 'Invalid username or password'
            });
        }

        const token = generateToken(user);

        // Get employee info if user is linked to an employee
        let employee = null;
        try {
            const employeeService = require('../services/employee.service');
            const roleService = require('../services/role.service');
            
            const employees = await employeeService.getAll({ user_id: user.id });
            if (employees.length > 0) {
                employee = employees[0];
                
                // Load roles and permissions
                const roles = await roleService.getEmployeeRoles(employee.id);
                const permissions = await roleService.getEmployeePermissions(employee.id);
                employee.roles = roles;
                employee.permissions = permissions.map(p => p.code);
            }
        } catch (error) {
            logger.debug('Could not load employee info on login', error);
        }

        res.json({
            error: false,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_superuser: user.is_superuser
                },
                employee: employee ? {
                    id: employee.id,
                    first_name: employee.first_name,
                    last_name: employee.last_name,
                    employee_code: employee.employee_code,
                    station_id: employee.station_id,
                    company_id: employee.company_id,
                    roles: employee.roles,
                    permissions: employee.permissions
                } : null
            }
        });
    } catch (error) {
        logger.error('Login error', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Login failed'
        });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await userService.getById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        res.json({
            error: false,
            data: user
        });
    } catch (error) {
        logger.error('Get user error', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get user'
        });
    }
});

module.exports = router;

