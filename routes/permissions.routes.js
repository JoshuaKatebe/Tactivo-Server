/**
 * Permissions Routes
 * @swagger
 * tags:
 *   - name: Permissions
 *     description: Permission management
 */

const express = require('express');
const router = express.Router();
const permissionService = require('../services/permission.service');
const { authenticate, requireSuperuser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const permissions = await permissionService.getAll();
        res.json({
            error: false,
            data: permissions
        });
    } catch (error) {
        logger.error('Error getting permissions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get permissions'
        });
    }
});

/**
 * @swagger
 * /api/permissions/initialize:
 *   post:
 *     summary: Initialize default permissions (superuser only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default permissions initialized
 *       403:
 *         description: Superuser access required
 */
router.post('/initialize', authenticate, requireSuperuser, async (req, res) => {
    try {
        const created = await permissionService.initializeDefaults();
        res.json({
            error: false,
            message: `Initialized ${created.length} default permissions`,
            data: created
        });
    } catch (error) {
        logger.error('Error initializing permissions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to initialize permissions'
        });
    }
});

/**
 * GET /api/permissions/:id
 * Get permission by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const permission = await permissionService.getById(req.params.id);
        
        if (!permission) {
            return res.status(404).json({
                error: true,
                message: 'Permission not found'
            });
        }

        res.json({
            error: false,
            data: permission
        });
    } catch (error) {
        logger.error('Error getting permission', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get permission'
        });
    }
});

/**
 * POST /api/permissions
 * Create permission
 */
router.post('/', authenticate, requireSuperuser, async (req, res) => {
    try {
        const { code, description } = req.body;

        if (!code) {
            return res.status(400).json({
                error: true,
                message: 'Code is required'
            });
        }

        const permission = await permissionService.create({ code, description });
        res.status(201).json({
            error: false,
            data: permission
        });
    } catch (error) {
        logger.error('Error creating permission', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create permission'
        });
    }
});

module.exports = router;

