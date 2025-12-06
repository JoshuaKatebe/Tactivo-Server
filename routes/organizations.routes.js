/**
 * Organizations Routes
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organization management
 */

const express = require('express');
const router = express.Router();
const organizationService = require('../services/organization.service');
const { authenticate, requireSuperuser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
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
 *                     $ref: '#/components/schemas/Organization'
 *   post:
 *     summary: Create organization (superuser only)
 *     tags: [Organizations]
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Tactivo Engineering"
 *     responses:
 *       201:
 *         description: Organization created
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Superuser access required
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const organizations = await organizationService.getAll();
        res.json({
            error: false,
            data: organizations
        });
    } catch (error) {
        logger.error('Error getting organizations', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get organizations'
        });
    }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
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
 *         description: Organization details
 *       404:
 *         description: Organization not found
 *   put:
 *     summary: Update organization (superuser only)
 *     tags: [Organizations]
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
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated
 *       403:
 *         description: Superuser access required
 *   delete:
 *     summary: Delete organization (superuser only)
 *     tags: [Organizations]
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
 *         description: Organization deleted
 *       403:
 *         description: Superuser access required
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const organization = await organizationService.getById(req.params.id);
        
        if (!organization) {
            return res.status(404).json({
                error: true,
                message: 'Organization not found'
            });
        }

        res.json({
            error: false,
            data: organization
        });
    } catch (error) {
        logger.error('Error getting organization', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get organization'
        });
    }
});

/**
 * POST /api/organizations
 * Create organization
 */
router.post('/', authenticate, requireSuperuser, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                error: true,
                message: 'Name is required'
            });
        }

        const organization = await organizationService.create({ name });
        res.status(201).json({
            error: false,
            data: organization
        });
    } catch (error) {
        logger.error('Error creating organization', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create organization'
        });
    }
});

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id', authenticate, requireSuperuser, async (req, res) => {
    try {
        const organization = await organizationService.update(req.params.id, req.body);
        
        if (!organization) {
            return res.status(404).json({
                error: true,
                message: 'Organization not found'
            });
        }

        res.json({
            error: false,
            data: organization
        });
    } catch (error) {
        logger.error('Error updating organization', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update organization'
        });
    }
});

/**
 * DELETE /api/organizations/:id
 * Delete organization
 */
router.delete('/:id', authenticate, requireSuperuser, async (req, res) => {
    try {
        const organization = await organizationService.delete(req.params.id);
        
        if (!organization) {
            return res.status(404).json({
                error: true,
                message: 'Organization not found'
            });
        }

        res.json({
            error: false,
            message: 'Organization deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting organization', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete organization'
        });
    }
});

module.exports = router;

