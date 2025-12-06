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
 *     summary: Get sales report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: station_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, shift, employee]
 *           default: day
 *     responses:
 *       200:
 *         description: Sales report data
 *       401:
 *         description: Unauthorized
 */
router.get('/sales', authenticate, async (req, res) => {
    try {
        const filters = {
            station_id: req.query.station_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            group_by: req.query.group_by || 'day'
        };

        const report = await reportService.getSalesReport(filters);
        
        // Get sales by product
        const byProduct = await reportService.getSalesByProduct(filters);

        res.json({
            error: false,
            data: {
                summary: report,
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
 * GET /api/reports/fuel
 * Get fuel report
 * Query: station_id, start_date, end_date, grade
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

module.exports = router;

