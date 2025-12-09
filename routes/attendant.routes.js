/**
 * Attendant Routes
 * @swagger
 * tags:
 *   - name: Attendants
 *     description: Attendant authentication and identification
 */

const express = require('express');
const router = express.Router();
const attendantAuthService = require('../services/attendant-auth.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/attendants/login:
 *   post:
 *     summary: Attendant login
 *     description: Login attendant using employee code, badge tag, or card ID
 *     tags: [Attendants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - station_id
 *             properties:
 *               station_id:
 *                 type: string
 *                 format: uuid
 *                 description: Station ID where attendant is logging in
 *               employee_code:
 *                 type: string
 *                 description: Employee code (use one of employee_code, badge_tag, or card_id)
 *               badge_tag:
 *                 type: string
 *                 description: RFID badge tag
 *               card_id:
 *                 type: string
 *                 description: Card ID
 *           examples:
 *             byEmployeeCode:
 *               summary: Login by employee code
 *               value:
 *                 station_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 employee_code: "EMP001"
 *             byBadgeTag:
 *               summary: Login by badge tag
 *               value:
 *                 station_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 badge_tag: "BADGE123"
 *             byCardId:
 *               summary: Login by card ID
 *               value:
 *                 station_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 card_id: "CARD456"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                       description: Employee details
 *                     activeShift:
 *                       type: object
 *                       description: Current active shift if any
 *                     hasActiveShift:
 *                       type: boolean
 *                       description: Whether employee has an active shift
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Employee not found or inactive
 */
router.post('/login', async (req, res) => {
    try {
        const { station_id, employee_code, badge_tag, card_id } = req.body;

        if (!station_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID is required'
            });
        }

        let result;

        // Try login method based on provided credential
        if (employee_code) {
            result = await attendantAuthService.loginByEmployeeCode(employee_code, station_id);
        } else if (badge_tag) {
            result = await attendantAuthService.loginByBadgeTag(badge_tag, station_id);
        } else if (card_id) {
            result = await attendantAuthService.loginByCardId(card_id, station_id);
        } else {
            return res.status(400).json({
                error: true,
                message: 'One of employee_code, badge_tag, or card_id is required'
            });
        }

        res.json({
            error: false,
            data: result
        });
    } catch (error) {
        logger.error('Attendant login error', error);
        res.status(401).json({
            error: true,
            message: error.message || 'Login failed'
        });
    }
});

/**
 * @swagger
 * /api/attendants/{id}:
 *   get:
 *     summary: Get attendant status
 *     description: Get attendant details with current shift status
 *     tags: [Attendants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *       - in: query
 *         name: station_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Station ID
 *     responses:
 *       200:
 *         description: Attendant status
 *       404:
 *         description: Attendant not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { station_id } = req.query;

        if (!station_id) {
            return res.status(400).json({
                error: true,
                message: 'Station ID is required'
            });
        }

        const result = await attendantAuthService.getAttendantStatus(req.params.id, station_id);

        res.json({
            error: false,
            data: result
        });
    } catch (error) {
        logger.error('Error getting attendant status', error);
        res.status(404).json({
            error: true,
            message: error.message || 'Attendant not found'
        });
    }
});

/**
 * @swagger
 * /api/attendants/{id}/logout:
 *   post:
 *     summary: Attendant logout
 *     description: Record attendant logout (optional - for tracking/audit)
 *     tags: [Attendants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/:id/logout', authenticate, async (req, res) => {
    try {
        await attendantAuthService.logout(req.params.id);

        res.json({
            error: false,
            message: 'Logout successful'
        });
    } catch (error) {
        logger.error('Attendant logout error', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Logout failed'
        });
    }
});

/**
 * @swagger
 * /api/attendants/{id}/validate:
 *   get:
 *     summary: Validate attendant
 *     description: Check if attendant is active and authorized
 *     tags: [Attendants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 */
router.get('/:id/validate', authenticate, async (req, res) => {
    try {
        const valid = await attendantAuthService.validateAttendant(req.params.id);

        res.json({
            error: false,
            data: { valid }
        });
    } catch (error) {
        logger.error('Attendant validation error', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Validation failed'
        });
    }
});

module.exports = router;
