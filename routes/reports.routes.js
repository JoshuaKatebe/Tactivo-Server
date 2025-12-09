/**
 * Reports Routes
 * @swagger
 * tags:
 *   - name: Reports
 *     description: Reporting and analytics
 */

const express = require('express');
const router = express.Router();
const reportService = require('../services/report.service');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     summary: Get comprehensive sales report (fuel + shop combined)
 *     description: Returns sales summary, payment methods breakdown, daily breakdown, and product sales
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report (ISO 8601)
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, shift, employee]
 *           default: day
 *         description: Grouping method for sales data
 *     responses:
 *       200:
 *         description: Sales report data
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total_sales:
 *                           type: number
 *                           example: 124580
 *                         fuel_sales:
 *                           type: number
 *                           example: 98550
 *                         store_sales:
 *                           type: number
 *                           example: 26030
 *                         transactions:
 *                           type: integer
 *                           example: 210
 *                         avg_transaction:
 *                           type: number
 *                           example: 593
 *                     payment_methods:
 *                       type: object
 *                       properties:
 *                         cash:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                         card:
 *                           type: object
 *                           properties:
 *                             amount:
 *                               type: number
 *                             percentage:
 *                               type: number
 *                     daily_breakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           fuel_sales:
 *                             type: number
 *                           store_sales:
 *                             type: number
 *                           total_sales:
 *                             type: number
 *                           transactions:
 *                             type: integer
 *                     by_product:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sales', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            group_by: req.query.group_by || 'day'
        };

        // Get comprehensive summary (fuel + shop combined)
        const summary = await reportService.getSalesSummary(filters);

        // Get payment methods breakdown
        const paymentMethods = await reportService.getPaymentMethodsBreakdown(filters);

        // Get daily breakdown
        const dailyBreakdown = await reportService.getDailySalesBreakdown(filters);

        // Get sales by product (shop only)
        const byProduct = await reportService.getSalesByProduct(filters);

        res.json({
            error: false,
            data: {
                summary,
                payment_methods: paymentMethods,
                daily_breakdown: dailyBreakdown,
                by_product: byProduct
            }
        });
    } catch (error) {
        logger.error('Error getting sales report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get sales report'
        });
    }
});

/**
 * @swagger
 * /api/reports/sales/itemized:
 *   get:
 *     summary: Get itemized shop sales with line items
 *     description: Returns detailed shop sales transactions with product line items. Supports pagination.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip for pagination
 *     responses:
 *       200:
 *         description: Itemized shop sales data
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
 *                     sales:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           station_id:
 *                             type: string
 *                             format: uuid
 *                           employee_id:
 *                             type: string
 *                             format: uuid
 *                           employee_name:
 *                             type: string
 *                           sale_time:
 *                             type: string
 *                             format: date-time
 *                           total_amount:
 *                             type: number
 *                           payments:
 *                             type: object
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 product_id:
 *                                   type: string
 *                                 product_name:
 *                                   type: string
 *                                 qty:
 *                                   type: number
 *                                 unit_price:
 *                                   type: number
 *                                 line_total:
 *                                   type: number
 *                     total:
 *                       type: integer
 *                       description: Total number of records matching the filter
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sales/itemized', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await reportService.getItemizedShopSales(filters);

        res.json({
            error: false,
            data: result
        });
    } catch (error) {
        logger.error('Error getting itemized sales', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get itemized sales'
        });
    }
});

/**
 * @swagger
 * /api/reports/fuel:
 *   get:
 *     summary: Get fuel sales report
 *     description: Returns fuel sales grouped by pump and by fuel grade
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report (ISO 8601)
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *         description: Filter by fuel grade ID
 *     responses:
 *       200:
 *         description: Fuel report data
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
 *                     by_pump:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           pump_number:
 *                             type: integer
 *                           nozzle:
 *                             type: integer
 *                           transaction_count:
 *                             type: integer
 *                           total_volume:
 *                             type: number
 *                           total_amount:
 *                             type: number
 *                           avg_price:
 *                             type: number
 *                     by_grade:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fuel_grade_id:
 *                             type: integer
 *                           transaction_count:
 *                             type: integer
 *                           total_volume:
 *                             type: number
 *                           total_amount:
 *                             type: number
 *                           avg_price:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/fuel', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            grade: req.query.grade
        };

        const report = await reportService.getFuelReport(filters);
        const byGrade = await reportService.getFuelByGrade(filters);

        res.json({
            error: false,
            data: {
                by_pump: report,
                by_grade: byGrade
            }
        });
    } catch (error) {
        logger.error('Error getting fuel report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get fuel report'
        });
    }
});

/**
 * @swagger
 * /api/reports/fuel/itemized:
 *   get:
 *     summary: Get itemized fuel transactions with details
 *     description: Returns detailed fuel transaction records with pump and employee information. Supports pagination.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 1000
 *         description: Maximum number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *           minimum: 0
 *         description: Number of records to skip for pagination
 *     responses:
 *       200:
 *         description: Itemized fuel transactions data
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
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           station_id:
 *                             type: string
 *                             format: uuid
 *                           pump_number:
 *                             type: integer
 *                           nozzle:
 *                             type: integer
 *                           transaction_datetime:
 *                             type: string
 *                             format: date-time
 *                           volume:
 *                             type: number
 *                           amount:
 *                             type: number
 *                           price:
 *                             type: number
 *                           payment_methods:
 *                             type: object
 *                           pump_name:
 *                             type: string
 *                           fuel_grade_id:
 *                             type: integer
 *                           authorized_by_name:
 *                             type: string
 *                     total:
 *                       type: integer
 *                       description: Total number of records matching the filter
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/fuel/itemized', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const result = await reportService.getItemizedFuelTransactions(filters);

        res.json({
            error: false,
            data: result
        });
    } catch (error) {
        logger.error('Error getting itemized fuel transactions', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get itemized fuel transactions'
        });
    }
});

/**
 * GET /api/reports/inventory
 * Get inventory report
 * Query: station_id, start_date, end_date
 */
router.get('/inventory', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const report = await reportService.getInventoryReport(filters);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting inventory report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get inventory report'
        });
    }
});

/**
 * GET /api/reports/financial
 * Get financial report
 * Query: station_id, start_date, end_date
 */
router.get('/financial', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const report = await reportService.getFinancialReport(filters);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting financial report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get financial report'
        });
    }
});

/**
 * GET /api/reports/employee
 * Get employee performance report
 * Query: employee_id, station_id, start_date, end_date
 */
router.get('/employee', authenticate, async (req, res) => {
    try {
        const filters = {
            employee_id: req.query.employee_id,
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const report = await reportService.getEmployeeReport(filters);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting employee report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get employee report'
        });
    }
});

/**
 * GET /api/reports/pump-readings
 * Get pump readings report
 * Query: station_id, pump_id, start_date, end_date
 */
router.get('/pump-readings', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            pump_id: req.query.pump_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date
        };

        const report = await reportService.getPumpReadingsReport(filters);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting pump readings report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get pump readings report'
        });
    }
});

/**
 * GET /api/reports/credit-sales
 * Get credit sales report
 * Query: station_id, debtor_id, start_date, end_date, status
 */
router.get('/credit-sales', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            debtor_id: req.query.debtor_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            status: req.query.status
        };

        const report = await reportService.getCreditSalesReport(filters);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting credit sales report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get credit sales report'
        });
    }
});

/**
 * @swagger
 * /api/reports/shifts/{shiftId}:
 *   get:
 *     summary: Get detailed shift report
 *     description: Returns comprehensive shift report with all transactions and summary statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Detailed shift report
 *       404:
 *         description: Shift not found
 */
router.get('/shifts/:shiftId', authenticate, async (req, res) => {
    try {
        const report = await reportService.getShiftReport(req.params.shiftId);

        if (!report) {
            return res.status(404).json({
                error: true,
                message: 'Shift not found'
            });
        }

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting shift report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get shift report'
        });
    }
});

/**
 * @swagger
 * /api/reports/shifts/{shiftId}/reconciliation:
 *   get:
 *     summary: Get shift reconciliation report
 *     description: Returns cash reconciliation report comparing expected vs actual cash
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Shift ID
 *     responses:
 *       200:
 *         description: Reconciliation report
 *       404:
 *         description: Shift not found
 */
router.get('/shifts/:shiftId/reconciliation', authenticate, async (req, res) => {
    try {
        const report = await reportService.getShiftReconciliation(req.params.shiftId);

        if (!report) {
            return res.status(404).json({
                error: true,
                message: 'Shift not found'
            });
        }

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting shift reconciliation', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get shift reconciliation'
        });
    }
});

/**
 * @swagger
 * /api/reports/attendants/{employeeId}:
 *   get:
 *     summary: Get attendant performance report
 *     description: Returns comprehensive performance metrics for an attendant
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for report
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for report
 *     responses:
 *       200:
 *         description: Attendant performance report
 *       404:
 *         description: Employee not found
 */
router.get('/attendants/:employeeId', authenticate, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                error: true,
                message: 'start_date and end_date are required'
            });
        }

        const report = await reportService.getAttendantPerformanceReport(
            req.params.employeeId,
            start_date,
            end_date
        );

        if (!report) {
            return res.status(404).json({
                error: true,
                message: 'Employee not found'
            });
        }

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting attendant performance report', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get attendant performance report'
        });
    }
});

/**
 * @swagger
 * /api/reports/daily-shifts:
 *   get:
 *     summary: Get daily shifts summary
 *     description: Returns summary of all shifts for a station on a specific date
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Station ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for report (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Daily shifts summary
 *       400:
 *         description: Missing required parameters
 */
router.get('/daily-shifts', authenticate, async (req, res) => {
    try {
        const { station_id, date } = req.query;

        if (!station_id || !date) {
            return res.status(400).json({
                error: true,
                message: 'station_id and date are required'
            });
        }

        const report = await reportService.getDailyShiftsSummary(station_id, date);

        res.json({
            error: false,
            data: report
        });
    } catch (error) {
        logger.error('Error getting daily shifts summary', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get daily shifts summary'
        });
    }
});

module.exports = router;

