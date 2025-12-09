/**
 * Attendant Authentication Service
 * Handles quick attendant login without requiring user accounts
 */

const db = require('../lib/db');
const logger = require('../utils/logger');
const employeeShiftService = require('./employee-shift.service');

class AttendantAuthService {
    /**
     * Login attendant by employee code
     * @param {string} employeeCode - Employee code
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Employee with shift info
     */
    async loginByEmployeeCode(employeeCode, stationId) {
        logger.info('Attendant login attempt', { employeeCode, stationId });

        const result = await db.query(
            `SELECT e.*, 
                    s.name as station_name,
                    c.name as company_name
             FROM employees e
             LEFT JOIN stations s ON e.station_id = s.id
             LEFT JOIN companies c ON e.company_id = c.id
             WHERE e.employee_code = $1 
               AND (e.station_id = $2 OR e.company_id = (SELECT company_id FROM stations WHERE id = $2))
               AND e.active = true`,
            [employeeCode, stationId]
        );

        if (result.rows.length === 0) {
            logger.warn('Attendant login failed - employee not found', { employeeCode });
            throw new Error('Employee not found or inactive');
        }

        const employee = result.rows[0];

        // Get active shift if any
        const activeShift = await employeeShiftService.getOpenShift(employee.id, stationId);

        return {
            employee,
            activeShift,
            hasActiveShift: !!activeShift
        };
    }

    /**
     * Login attendant by badge tag (RFID)
     * @param {string} badgeTag - Badge tag number
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Employee with shift info
     */
    async loginByBadgeTag(badgeTag, stationId) {
        logger.info('Attendant login by badge', { badgeTag, stationId });

        const result = await db.query(
            `SELECT e.*, 
                    s.name as station_name,
                    c.name as company_name
             FROM employees e
             LEFT JOIN stations s ON e.station_id = s.id
             LEFT JOIN companies c ON e.company_id = c.id
             WHERE e.badge_tag = $1 
               AND (e.station_id = $2 OR e.company_id = (SELECT company_id FROM stations WHERE id = $2))
               AND e.active = true`,
            [badgeTag, stationId]
        );

        if (result.rows.length === 0) {
            logger.warn('Attendant login failed - badge not found', { badgeTag });
            throw new Error('Badge not found or employee inactive');
        }

        const employee = result.rows[0];

        // Get active shift if any
        const activeShift = await employeeShiftService.getOpenShift(employee.id, stationId);

        return {
            employee,
            activeShift,
            hasActiveShift: !!activeShift
        };
    }

    /**
     * Login attendant by card ID
     * @param {string} cardId - Card ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Employee with shift info
     */
    async loginByCardId(cardId, stationId) {
        logger.info('Attendant login by card', { cardId, stationId });

        const result = await db.query(
            `SELECT e.*, 
                    s.name as station_name,
                    c.name as company_name
             FROM employees e
             LEFT JOIN stations s ON e.station_id = s.id
             LEFT JOIN companies c ON e.company_id = c.id
             WHERE e.card_id = $1 
               AND (e.station_id = $2 OR e.company_id = (SELECT company_id FROM stations WHERE id = $2))
               AND e.active = true`,
            [cardId, stationId]
        );

        if (result.rows.length === 0) {
            logger.warn('Attendant login failed - card not found', { cardId });
            throw new Error('Card not found or employee inactive');
        }

        const employee = result.rows[0];

        // Get active shift if any
        const activeShift = await employeeShiftService.getOpenShift(employee.id, stationId);

        return {
            employee,
            activeShift,
            hasActiveShift: !!activeShift
        };
    }

    /**
     * Validate attendant is active and authorized
     * @param {string} employeeId - Employee ID
     * @returns {Promise<boolean>} True if valid
     */
    async validateAttendant(employeeId) {
        const result = await db.query(
            'SELECT id, active FROM employees WHERE id = $1',
            [employeeId]
        );

        if (result.rows.length === 0) {
            return false;
        }

        return result.rows[0].active === true;
    }

    /**
     * Get attendant details with current shift status
     * @param {string} employeeId - Employee ID
     * @param {string} stationId - Station ID
     * @returns {Promise<Object>} Employee with shift info
     */
    async getAttendantStatus(employeeId, stationId) {
        const result = await db.query(
            `SELECT e.*, 
                    s.name as station_name,
                    c.name as company_name
             FROM employees e
             LEFT JOIN stations s ON e.station_id = s.id
             LEFT JOIN companies c ON e.company_id = c.id
             WHERE e.id = $1`,
            [employeeId]
        );

        if (result.rows.length === 0) {
            throw new Error('Employee not found');
        }

        const employee = result.rows[0];

        // Get active shift if any
        const activeShift = await employeeShiftService.getOpenShift(employee.id, stationId);

        return {
            employee,
            activeShift,
            hasActiveShift: !!activeShift
        };
    }

    /**
     * Record attendant logout (optional - for tracking)
     * @param {string} employeeId - Employee ID
     * @returns {Promise<void>}
     */
    async logout(employeeId) {
        logger.info('Attendant logout', { employeeId });
        // This is mainly for logging/audit purposes
        // In the future, could track login sessions if needed
    }
}

module.exports = new AttendantAuthService();
