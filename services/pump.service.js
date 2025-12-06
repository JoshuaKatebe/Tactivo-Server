/**
 * Pump Service
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class PumpService {
    /**
     * Get all pumps (optionally filtered)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT p.*, pc.station_id, pc.hostname as pts_hostname
            FROM pumps p
            LEFT JOIN pts_controllers pc ON p.pts_id = pc.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND pc.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.active !== undefined) {
            query += ` AND p.active = $${paramIndex++}`;
            params.push(filters.active);
        }

        query += ' ORDER BY p.pump_number';
        const result = await db.query(query, params);
        
        // Load nozzles for each pump
        for (const pump of result.rows) {
            const nozzlesResult = await db.query(
                'SELECT * FROM nozzles WHERE pump_id = $1 ORDER BY nozzle_number',
                [pump.id]
            );
            pump.nozzles = nozzlesResult.rows;
        }
        
        return result.rows;
    }

    /**
     * Get pump by ID (with nozzles)
     */
    async getById(id) {
        const result = await db.query(
            `SELECT p.*, pc.station_id, pc.hostname as pts_hostname
             FROM pumps p
             LEFT JOIN pts_controllers pc ON p.pts_id = pc.id
             WHERE p.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return null;
        }

        const pump = result.rows[0];
        
        // Load nozzles
        const nozzlesResult = await db.query(
            'SELECT * FROM nozzles WHERE pump_id = $1 ORDER BY nozzle_number',
            [id]
        );
        pump.nozzles = nozzlesResult.rows;
        
        return pump;
    }

    /**
     * Create pump
     */
    async create(data) {
        const {
            pts_id,
            pump_number,
            name,
            active,
            nozzles
        } = data;

        return await db.transaction(async (client) => {
            // Create pump
            const pumpResult = await client.query(
                'INSERT INTO pumps (pts_id, pump_number, name, active) VALUES ($1, $2, $3, $4) RETURNING *',
                [pts_id, pump_number, name || null, active !== undefined ? active : true]
            );
            
            const pump = pumpResult.rows[0];

            // Create nozzles if provided
            if (nozzles && nozzles.length > 0) {
                for (const nozzle of nozzles) {
                    await client.query(
                        'INSERT INTO nozzles (pump_id, nozzle_number, fuel_grade_id) VALUES ($1, $2, $3)',
                        [pump.id, nozzle.nozzle_number, nozzle.fuel_grade_id || null]
                    );
                }
            }

            return pump;
        });
    }

    /**
     * Update pump
     */
    async update(id, data) {
        const {
            name,
            active,
            nozzles
        } = data;

        return await db.transaction(async (client) => {
            // Update pump
            const pumpResult = await client.query(
                'UPDATE pumps SET name = $1, active = $2 WHERE id = $3 RETURNING *',
                [name || null, active !== undefined ? active : true, id]
            );
            
            if (pumpResult.rows.length === 0) {
                return null;
            }

            // Update nozzles if provided
            if (nozzles !== undefined) {
                // Delete existing nozzles
                await client.query('DELETE FROM nozzles WHERE pump_id = $1', [id]);
                
                // Create new nozzles
                if (nozzles.length > 0) {
                    for (const nozzle of nozzles) {
                        await client.query(
                            'INSERT INTO nozzles (pump_id, nozzle_number, fuel_grade_id) VALUES ($1, $2, $3)',
                            [id, nozzle.nozzle_number, nozzle.fuel_grade_id || null]
                        );
                    }
                }
            }

            return pumpResult.rows[0];
        });
    }

    /**
     * Delete pump
     */
    async delete(id) {
        const result = await db.query('DELETE FROM pumps WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }
}

module.exports = new PumpService();

