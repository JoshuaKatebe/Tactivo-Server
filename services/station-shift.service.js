/**
 * Station Shift Service - PTS hardware shifts
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class StationShiftService {
    /**
     * Get all station shifts (with filters)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT ss.*, 
                   s.name as station_name,
                   e.first_name || ' ' || e.last_name as opened_by_name
            FROM station_shifts ss
            LEFT JOIN stations s ON ss.station_id = s.id
            LEFT JOIN employees e ON ss.opened_by_employee_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND ss.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.status) {
            if (filters.status === 'open') {
                query += ` AND ss.date_time_end IS NULL`;
            } else if (filters.status === 'closed') {
                query += ` AND ss.date_time_end IS NOT NULL`;
            }
        }
        if (filters.start_date) {
            query += ` AND ss.date_time_start >= $${paramIndex++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND ss.date_time_start <= $${paramIndex++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY ss.date_time_start DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get station shift by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT ss.*, 
                    s.name as station_name,
                    e.first_name || ' ' || e.last_name as opened_by_name
             FROM station_shifts ss
             LEFT JOIN stations s ON ss.station_id = s.id
             LEFT JOIN employees e ON ss.opened_by_employee_id = e.id
             WHERE ss.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Get open shift for station
     */
    async getOpenShift(stationId) {
        const result = await db.query(
            'SELECT * FROM station_shifts WHERE station_id = $1 AND date_time_end IS NULL ORDER BY date_time_start DESC LIMIT 1',
            [stationId]
        );
        return result.rows[0] || null;
    }

    /**
     * Start station shift
     */
    async startShift(data) {
        const {
            station_id,
            pts_shift_number,
            opened_by_employee_id,
            configuration_id
        } = data;

        const result = await db.query(
            `INSERT INTO station_shifts 
             (station_id, pts_shift_number, date_time_start, opened_by_employee_id, configuration_id)
             VALUES ($1, $2, now(), $3, $4) RETURNING *`,
            [
                station_id, pts_shift_number || null,
                opened_by_employee_id || null, configuration_id || null
            ]
        );
        return result.rows[0];
    }

    /**
     * End station shift
     */
    async endShift(id, data) {
        const {
            uploaded
        } = data;

        const result = await db.query(
            `UPDATE station_shifts 
             SET date_time_end = now(), uploaded = $1
             WHERE id = $2 RETURNING *`,
            [uploaded || false, id]
        );
        return result.rows[0] || null;
    }

    /**
     * Update station shift
     */
    async update(id, data) {
        const {
            pts_shift_number,
            configuration_id,
            uploaded
        } = data;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (pts_shift_number !== undefined) {
            updates.push(`pts_shift_number = $${paramIndex++}`);
            params.push(pts_shift_number);
        }
        if (configuration_id !== undefined) {
            updates.push(`configuration_id = $${paramIndex++}`);
            params.push(configuration_id);
        }
        if (uploaded !== undefined) {
            updates.push(`uploaded = $${paramIndex++}`);
            params.push(uploaded);
        }

        if (updates.length === 0) {
            return await this.getById(id);
        }

        params.push(id);
        const query = `UPDATE station_shifts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);
        return result.rows[0] || null;
    }
}

module.exports = new StationShiftService();

