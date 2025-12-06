/**
 * Companies Routes
 * @swagger
 * tags:
 *   - name: Companies
 *     description: Company management
 */

const express = require('express');
const router = express.Router();
const companyService = require('../services/company.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by organization ID
 *     responses:
 *       200:
 *         description: List of companies
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
 *                     $ref: '#/components/schemas/Company'
 *   post:
 *     summary: Create a new company
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - name
 *             properties:
 *               organization_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 example: "Tactivo Fuel Stations"
 *               contact:
 *                 type: object
 *     responses:
 *       201:
 *         description: Company created
 *       400:
 *         description: Missing required fields
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const organizationId = req.query.organization_id;
        const companies = await companyService.getAll(organizationId);
        res.json({
            error: false,
            data: companies
        });
    } catch (error) {
        logger.error('Error getting companies', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get companies'
        });
    }
});

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
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
 *         description: Company details
 *       404:
 *         description: Company not found
 *   put:
 *     summary: Update company
 *     tags: [Companies]
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
 *               contact:
 *                 type: object
 *     responses:
 *       200:
 *         description: Company updated
 *       404:
 *         description: Company not found
 *   delete:
 *     summary: Delete company
 *     tags: [Companies]
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
 *         description: Company deleted
 *       404:
 *         description: Company not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const company = await companyService.getById(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                error: true,
                message: 'Company not found'
            });
        }

        res.json({
            error: false,
            data: company
        });
    } catch (error) {
        logger.error('Error getting company', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get company'
        });
    }
});

/**
 * POST /api/companies
 * Create company
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { organization_id, name, contact } = req.body;

        if (!organization_id || !name) {
            return res.status(400).json({
                error: true,
                message: 'Organization ID and name are required'
            });
        }

        const company = await companyService.create({ organization_id, name, contact });
        res.status(201).json({
            error: false,
            data: company
        });
    } catch (error) {
        logger.error('Error creating company', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create company'
        });
    }
});

/**
 * PUT /api/companies/:id
 * Update company
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const company = await companyService.update(req.params.id, req.body);
        
        if (!company) {
            return res.status(404).json({
                error: true,
                message: 'Company not found'
            });
        }

        res.json({
            error: false,
            data: company
        });
    } catch (error) {
        logger.error('Error updating company', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update company'
        });
    }
});

/**
 * DELETE /api/companies/:id
 * Delete company
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const company = await companyService.delete(req.params.id);
        
        if (!company) {
            return res.status(404).json({
                error: true,
                message: 'Company not found'
            });
        }

        res.json({
            error: false,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting company', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete company'
        });
    }
});

module.exports = router;

