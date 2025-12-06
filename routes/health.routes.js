/**
 * Health Check Routes
 * @swagger
 * tags:
 *   - name: Health
 *     description: System health checks
 */

const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     fuel:
 *                       type: string
 *                       example: "running"
 */
router.get('/', (req, res) => {
    const fuelService = req.app.locals.fuelService;
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            fuel: fuelService ? 'running' : 'not initialized'
        }
    });
});

module.exports = router;

