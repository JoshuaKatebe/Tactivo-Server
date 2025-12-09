/**
 * Fuel Routes - REST API endpoints for fuel operations
 * @swagger
 * tags:
 *   - name: Fuel
 *     description: PTS pump control and monitoring
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const pumpTransactionsService = require('../services/pump-transactions.service');
const employeeShiftService = require('../services/employee-shift.service');
const handoverService = require('../services/handover.service');
const db = require('../lib/db');

/**
 * @swagger
 * /api/fuel/pumps:
 *   get:
 *     summary: Get status of all pumps
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pump statuses
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
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/PumpStatus'
 */
router.get('/pumps', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const statuses = fuelService.getPumpStatuses();
        res.json({
            error: false,
            data: statuses
        });
    } catch (error) {
        logger.error('Error getting pump statuses', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump statuses'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}:
 *   get:
 *     summary: Get status of a specific pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 120
 *     responses:
 *       200:
 *         description: Pump status
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const status = await fuelService.getPumpStatus(pumpNumber);

        if (!status) {
            return res.status(404).json({
                error: true,
                message: 'Pump not found or not responding'
            });
        }

        res.json({
            error: false,
            data: status
        });
    } catch (error) {
        logger.error('Error getting pump status', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump status'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/authorize:
 *   post:
 *     summary: Authorize a pump for fueling
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nozzleNumber
 *             properties:
 *               nozzleNumber:
 *                 type: integer
 *                 example: 1
 *               presetType:
 *                 type: string
 *                 enum: [Volume, Amount]
 *               presetDose:
 *                 type: number
 *                 example: 20.0
 *               price:
 *                 type: number
 *                 example: 1.65
 *     responses:
 *       200:
 *         description: Pump authorized successfully
 *       400:
 *         description: Invalid request
 */
router.post('/pumps/:pumpNumber/authorize', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        let { nozzleNumber, presetType, presetDose, price, authorized_by_employee_id, employee_id, station_id } = req.body;

        // Fallback for employee ID if authorized_by_employee_id is missing
        if (!authorized_by_employee_id && employee_id) {
            authorized_by_employee_id = employee_id;
        }

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        if (!nozzleNumber || isNaN(parseInt(nozzleNumber, 10))) {
            return res.status(400).json({
                error: true,
                message: 'Nozzle number is required'
            });
        }

        // Get attendant name to pass to PTS controller
        let attendantName = null;

        // Debug: Log what employee IDs we received
        logger.info('Pump authorization request', {
            pumpNumber,
            authorized_by_employee_id,
            employee_id,
            final_employee_id: authorized_by_employee_id || employee_id,
            station_id
        });

        if (authorized_by_employee_id) {
            try {
                const employeeResult = await db.query(
                    'SELECT first_name, last_name, employee_code FROM employees WHERE id = $1',
                    [authorized_by_employee_id]
                );

                if (employeeResult.rows.length > 0) {
                    const employee = employeeResult.rows[0];
                    // Use employee code or full name for PTS-2 User field
                    attendantName = employee.employee_code || `${employee.first_name} ${employee.last_name}`;
                    logger.info('Resolved attendant name', {
                        employee_id: authorized_by_employee_id,
                        attendantName,
                        employee_code: employee.employee_code,
                        first_name: employee.first_name,
                        last_name: employee.last_name
                    });
                } else {
                    logger.warn('Employee not found in database', { employee_id: authorized_by_employee_id });
                }
            } catch (err) {
                logger.warn('Could not fetch employee name', { employee_id: authorized_by_employee_id, error: err.message });
            }
        } else {
            logger.warn('No employee ID provided for pump authorization - User field will be null', { pumpNumber });
        }

        // Create pending transaction to track attendant linkage
        if (authorized_by_employee_id && station_id) {
            await pumpTransactionsService.createPendingTransaction(
                pumpNumber,
                authorized_by_employee_id,
                {
                    nozzleNumber: parseInt(nozzleNumber, 10),
                    presetType,
                    presetDose,
                    price,
                    attendantName
                },
                station_id
            );
        }

        // Ensure user exists in PTS before authorizing
        // This maps the attendant ID to their name in the controller
        if (attendantName) {
            // We use the same ID we're going to pass as 'User'
            const userId = attendantName; // In our logic, 'attendantName' IS the value passed to PTS User field
            // Ideally we'd separate ID and Name, but here we used code/name as the identifier
            await fuelService.ensureUserExists(userId, userId);
        }

        const result = await fuelService.authorizePump(
            pumpNumber,
            parseInt(nozzleNumber, 10),
            presetType || null,
            presetDose || null,
            price || null,
            attendantName  // Pass attendant name to PTS-2
        );

        res.json({
            error: false,
            message: 'Pump authorized successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error authorizing pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to authorize pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/stop:
 *   post:
 *     summary: Stop a pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump stopped successfully
 *       400:
 *         description: Invalid pump number
 */
router.post('/pumps/:pumpNumber/stop', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const result = await fuelService.stopPump(pumpNumber);

        res.json({
            error: false,
            message: 'Pump stopped successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error stopping pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to stop pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/emergency-stop:
 *   post:
 *     summary: Emergency stop a pump
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump emergency stopped
 *       400:
 *         description: Invalid pump number
 */
router.post('/pumps/:pumpNumber/emergency-stop', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const result = await fuelService.emergencyStopPump(pumpNumber);

        res.json({
            error: false,
            message: 'Pump emergency stopped successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error emergency stopping pump', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to emergency stop pump'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/totals:
 *   get:
 *     summary: Get pump totals (shift totals)
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: nozzle
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Pump totals
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber/totals', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const nozzleNumber = parseInt(req.query.nozzle || '1', 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const totals = await fuelService.getPumpTotals(pumpNumber, nozzleNumber);

        if (!totals) {
            return res.status(404).json({
                error: true,
                message: 'Totals not found'
            });
        }

        res.json({
            error: false,
            data: totals
        });
    } catch (error) {
        logger.error('Error getting pump totals', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump totals'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/prices:
 *   get:
 *     summary: Get pump prices
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pump prices
 *       404:
 *         description: Pump not found
 */
router.get('/pumps/:pumpNumber/prices', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        const prices = await fuelService.getPumpPrices(pumpNumber);

        if (!prices) {
            return res.status(404).json({
                error: true,
                message: 'Prices not found'
            });
        }

        res.json({
            error: false,
            data: prices
        });
    } catch (error) {
        logger.error('Error getting pump prices', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump prices'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/prices:
 *   post:
 *     summary: Update pump prices
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prices
 *             properties:
 *               prices:
 *                 type: array
 *                 items:
 *                   type: number
 *                 example: [1.65, 1.70, 1.75]
 *     responses:
 *       200:
 *         description: Prices updated successfully
 *       400:
 *         description: Invalid request
 */
router.post('/pumps/:pumpNumber/prices', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const { prices } = req.body;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        if (!prices || !Array.isArray(prices)) {
            return res.status(400).json({
                error: true,
                message: 'Prices array is required'
            });
        }

        const result = await fuelService.setPumpPrices(pumpNumber, prices);

        res.json({
            error: false,
            message: 'Pump prices updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error setting pump prices', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to set pump prices'
        });
    }
});

/**
 * @swagger
 * /api/fuel/pumps/{pumpNumber}/close-transaction:
 *   post:
 *     summary: Close and record a completed pump transaction
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pumpNumber
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pts_controller_id:
 *                 type: string
 *                 format: uuid
 *                 description: PTS Controller ID
 *     responses:
 *       200:
 *         description: Transaction closed and recorded
 *       404:
 *         description: No pending transaction found
 */
router.post('/pumps/:pumpNumber/close-transaction', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;
        const pumpNumber = parseInt(req.params.pumpNumber, 10);
        const { pts_controller_id } = req.body;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        if (isNaN(pumpNumber) || pumpNumber < 1) {
            return res.status(400).json({
                error: true,
                message: 'Invalid pump number'
            });
        }

        // Get transaction information from PTS
        const transactionInfo = await fuelService.getPumpTransactionInfo(pumpNumber);

        if (!transactionInfo) {
            return res.status(404).json({
                error: true,
                message: 'No transaction information available'
            });
        }

        // Complete and save transaction
        const savedTransaction = await pumpTransactionsService.completeTransaction(
            pumpNumber,
            transactionInfo,
            pts_controller_id || null
        );

        if (!savedTransaction) {
            return res.status(404).json({
                error: true,
                message: 'No pending transaction found for this pump'
            });
        }

        // Check if handover should be created (after 10 transactions)
        if (savedTransaction.authorized_by_employee_id && savedTransaction.station_id) {
            try {
                const handover = await handoverService.checkAndCreateHandover(
                    savedTransaction.authorized_by_employee_id,
                    savedTransaction.station_id,
                    savedTransaction.id
                );

                if (handover) {
                    logger.info(`Handover ${handover.id} created for employee ${savedTransaction.authorized_by_employee_id}`);
                    savedTransaction.handover_created = true;
                    savedTransaction.handover_id = handover.id;
                }
            } catch (handoverError) {
                // Log error but don't fail transaction
                logger.error('Error checking/creating handover', handoverError);
            }
        }

        res.json({
            error: false,
            message: 'Transaction completed and recorded',
            data: savedTransaction
        });
    } catch (error) {
        logger.error('Error closing transaction', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to close transaction'
        });
    }
});

/**
 * @swagger
 * /api/fuel/tanks:
 *   get:
 *     summary: Get tank levels
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tank levels
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
 *                       Tank:
 *                         type: integer
 *                       Level:
 *                         type: number
 *                       Volume:
 *                         type: number
 *                       Temperature:
 *                         type: number
 */
router.get('/tanks', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const statuses = fuelService.getTankStatuses();
        res.json({
            error: false,
            data: statuses
        });
    } catch (error) {
        logger.error('Error getting tank statuses', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get tank statuses'
        });
    }
});

/**
 * @swagger
 * /api/fuel/config/pumps:
 *   get:
 *     summary: Get pumps configuration from PTS controller
 *     description: Returns detailed pump configuration including nozzles and fuel grades
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pumps configuration
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
 *                     Pumps:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/config/pumps', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const response = await fuelService.ptsClient.createComplexRequest([{
            function: fuelService.ptsClient.GetPumpsConfiguration.bind(fuelService.ptsClient),
            arguments: []
        }]);

        if (response.Packets && response.Packets[0]) {
            if (response.Packets[0].Error === true) {
                return res.status(500).json({
                    error: true,
                    message: response.Packets[0].Message || 'Failed to get pumps configuration'
                });
            }

            res.json({
                error: false,
                data: response.Packets[0].Data || {}
            });
        } else {
            res.status(500).json({
                error: true,
                message: 'Invalid response from PTS controller'
            });
        }
    } catch (error) {
        logger.error('Error getting pumps configuration', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pumps configuration'
        });
    }
});

/**
 * @swagger
 * /api/fuel/config/fuel-grades:
 *   get:
 *     summary: Get fuel grades configuration from PTS controller
 *     description: Returns all configured fuel grades with names and IDs
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Fuel grades configuration
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
 *                     FuelGrades:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Id:
 *                             type: integer
 *                           Name:
 *                             type: string
 */
router.get('/config/fuel-grades', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const response = await fuelService.ptsClient.createComplexRequest([{
            function: fuelService.ptsClient.GetFuelGradesConfiguration.bind(fuelService.ptsClient),
            arguments: []
        }]);

        if (response.Packets && response.Packets[0]) {
            if (response.Packets[0].Error === true) {
                return res.status(500).json({
                    error: true,
                    message: response.Packets[0].Message || 'Failed to get fuel grades configuration'
                });
            }

            res.json({
                error: false,
                data: response.Packets[0].Data || {}
            });
        } else {
            res.status(500).json({
                error: true,
                message: 'Invalid response from PTS controller'
            });
        }
    } catch (error) {
        logger.error('Error getting fuel grades configuration', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get fuel grades configuration'
        });
    }
});

/**
 * @swagger
 * /api/fuel/config/nozzles:
 *   get:
 *     summary: Get nozzles configuration from PTS controller
 *     description: Returns all configured nozzles with pump associations and fuel grades
 *     tags: [Fuel]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nozzles configuration
 */
router.get('/config/nozzles', async (req, res) => {
    try {
        const fuelService = req.app.locals.fuelService;

        if (!fuelService) {
            return res.status(503).json({
                error: true,
                message: 'Fuel service not initialized'
            });
        }

        const response = await fuelService.ptsClient.createComplexRequest([{
            function: fuelService.ptsClient.GetNozzlesConfiguration.bind(fuelService.ptsClient),
            arguments: []
        }]);

        if (response.Packets && response.Packets[0]) {
            if (response.Packets[0].Error === true) {
                return res.status(500).json({
                    error: true,
                    message: response.Packets[0].Message || 'Failed to get nozzles configuration'
                });
            }

            res.json({
                error: false,
                data: response.Packets[0].Data || {}
            });
        } else {
            res.status(500).json({
                error: true,
                message: 'Invalid response from PTS controller'
            });
        }
    } catch (error) {
        logger.error('Error getting nozzles configuration', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get nozzles configuration'
        });
    }
});

module.exports = router;

