/**
 * Users Routes
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management
 */

const express = require('express');
const router = express.Router();
const userService = require('../services/user.service');
const { authenticate, requireSuperuser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (superuser only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
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
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Superuser access required
 *   post:
 *     summary: Create a new user (superuser only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *                 example: "newuser"
 *               password:
 *                 type: string
 *                 example: "SecurePassword123"
 *               email:
 *                 type: string
 *                 format: email
 *               is_superuser:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Superuser access required
 */
router.get('/', authenticate, requireSuperuser, async (req, res) => {
    try {
        const users = await userService.getAll();
        res.json({
            error: false,
            data: users
        });
    } catch (error) {
        logger.error('Error getting users', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get users'
        });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (users can only see their own profile unless superuser)
 *     tags: [Users]
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
 *         description: User details
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *   put:
 *     summary: Update user (users can only update their own profile unless superuser)
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *   delete:
 *     summary: Delete user (superuser only)
 *     tags: [Users]
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
 *         description: User deleted
 *       403:
 *         description: Superuser access required
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        // Users can only see their own profile unless superuser
        if (req.user.id !== req.params.id && !req.user.is_superuser) {
            return res.status(403).json({
                error: true,
                message: 'Access denied'
            });
        }

        const user = await userService.getById(req.params.id);
        
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
        logger.error('Error getting user', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get user'
        });
    }
});

/**
 * POST /api/users
 * Create user
 */
router.post('/', authenticate, requireSuperuser, async (req, res) => {
    try {
        const { username, password, email, is_superuser } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: true,
                message: 'Username and password are required'
            });
        }

        const user = await userService.create({ username, password, email, is_superuser });
        res.status(201).json({
            error: false,
            data: user
        });
    } catch (error) {
        logger.error('Error creating user', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create user'
        });
    }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        // Users can only update their own profile unless superuser
        if (req.user.id !== req.params.id && !req.user.is_superuser) {
            return res.status(403).json({
                error: true,
                message: 'Access denied'
            });
        }

        const user = await userService.update(req.params.id, req.body);
        
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
        logger.error('Error updating user', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update user'
        });
    }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', authenticate, requireSuperuser, async (req, res) => {
    try {
        const user = await userService.delete(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                error: true,
                message: 'User not found'
            });
        }

        res.json({
            error: false,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting user', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete user'
        });
    }
});

module.exports = router;


