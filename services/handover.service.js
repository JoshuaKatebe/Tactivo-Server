/**
 * Handover Service - Cash clearance and handovers
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class HandoverService {
    /**
     * Get all handovers (with filters)
     */
    async getAll(filters = {}) {
        let query = `
            SELECT h.*, 
                   s.name as station_name,
                   e1.first_name || ' ' || e1.last_name as employee_name,
                   e2.first_name || ' ' || e2.last_name as cashier_name
            FROM handovers h
            LEFT JOIN stations s ON h.station_id = s.id
            LEFT JOIN employees e1 ON h.employee_id = e1.id
            LEFT JOIN employees e2 ON h.cashier_employee_id = e2.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND h.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND h.employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.shift_id) {
            query += ` AND h.employee_shift_id = $${paramIndex++}`;
            params.push(filters.shift_id);
        }
        if (filters.start_date) {
            query += ` AND h.handover_time >= $${paramIndex++}`;
            params.push(filters.start_date);
        }
        if (filters.end_date) {
            query += ` AND h.handover_time <= $${paramIndex++}`;
            params.push(filters.end_date);
        }

        query += ' ORDER BY h.handover_time DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get handover by ID
     */
    async getById(id) {
        const result = await db.query(
            `SELECT h.*, 
                    s.name as station_name,
                    e1.first_name || ' ' || e1.last_name as employee_name,
                    e2.first_name || ' ' || e2.last_name as cashier_name
             FROM handovers h
             LEFT JOIN stations s ON h.station_id = s.id
             LEFT JOIN employees e1 ON h.employee_id = e1.id
             LEFT JOIN employees e2 ON h.cashier_employee_id = e2.id
             WHERE h.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /**
     * Create handover
     */
    async create(data) {
        const {
            station_id,
            employee_id,
            cashier_employee_id,
            employee_shift_id,
            amount_expected,
            amount_cashed,
            notes
        } = data;

        const difference = parseFloat(amount_cashed || 0) - parseFloat(amount_expected || 0);

        const result = await db.query(
            `INSERT INTO handovers 
             (station_id, employee_id, cashier_employee_id, employee_shift_id,
              amount_expected, amount_cashed, difference, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                station_id, employee_id, cashier_employee_id || null,
                employee_shift_id || null, amount_expected || 0,
                amount_cashed || 0, difference, notes || null
            ]
        );
        return result.rows[0];
    }

    /**
     * Update handover
     */
    async update(id, data) {
        const {
            amount_expected,
            amount_cashed,
            notes
        } = data;

        const difference = amount_cashed !== undefined && amount_expected !== undefined
            ? parseFloat(amount_cashed) - parseFloat(amount_expected)
            : null;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (amount_expected !== undefined) {
            updates.push(`amount_expected = $${paramIndex++}`);
            params.push(amount_expected);
        }
        if (amount_cashed !== undefined) {
            updates.push(`amount_cashed = $${paramIndex++}`);
            params.push(amount_cashed);
        }
        if (difference !== null) {
            updates.push(`difference = $${paramIndex++}`);
            params.push(difference);
        }
        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex++}`);
            params.push(notes);
        }

        if (updates.length === 0) {
            return await this.getById(id);
        }

        params.push(id);
        const query = `UPDATE handovers SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        const result = await db.query(query, params);
        return result.rows[0] || null;
    }

    /**
     * Delete handover
     */
    async delete(id) {
        const result = await db.query('DELETE FROM handovers WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    }

    /**
     * Get pending handovers with filters and sorting
     */
    async getPendingHandovers(filters = {}) {
        let query = `
            SELECT h.*, 
                   s.name as station_name,
                   e1.first_name || ' ' || e1.last_name as employee_name,
                   e2.first_name || ' ' || e2.last_name as cashier_name,
                   COUNT(ht.fuel_transaction_id) as transaction_count,
                   COALESCE(SUM(ft.amount), 0) as total_amount
            FROM handovers h
            LEFT JOIN stations s ON h.station_id = s.id
            LEFT JOIN employees e1 ON h.employee_id = e1.id
            LEFT JOIN employees e2 ON h.cashier_employee_id = e2.id
            LEFT JOIN handover_transactions ht ON h.id = ht.handover_id
            LEFT JOIN fuel_transactions ft ON ht.fuel_transaction_id = ft.id
            WHERE h.status = 'pending'
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND h.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND h.employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.employee_name) {
            query += ` AND (e1.first_name ILIKE $${paramIndex} OR e1.last_name ILIKE $${paramIndex})`;
            params.push(`%${filters.employee_name}%`);
            paramIndex++;
        }
        if (filters.pump_number) {
            query += ` AND ft.pump_number = $${paramIndex++}`;
            params.push(filters.pump_number);
        }

        query += ' GROUP BY h.id, s.name, e1.first_name, e1.last_name, e2.first_name, e2.last_name';

        // Sorting
        const validSortFields = {
            'employee_name': 'employee_name',
            'employee_id': 'h.employee_id',
            'pump_number': 'MIN(ft.pump_number)',
            'transaction_count': 'transaction_count',
            'handover_time': 'h.handover_time'
        };

        const sortBy = filters.sort_by && validSortFields[filters.sort_by]
            ? validSortFields[filters.sort_by]
            : 'h.handover_time';

        query += ` ORDER BY ${sortBy} DESC`;

        query += ' LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get handover with all associated transactions
     */
    async getHandoverWithTransactions(handoverId) {
        const handover = await this.getById(handoverId);
        if (!handover) {
            return null;
        }

        const transactions = await db.query(
            `SELECT ft.*, ht.created_at as linked_at
             FROM fuel_transactions ft
             JOIN handover_transactions ht ON ft.id = ht.fuel_transaction_id
             WHERE ht.handover_id = $1
             ORDER BY ft.transaction_datetime DESC`,
            [handoverId]
        );

        handover.transactions = transactions.rows;
        handover.transaction_count = transactions.rows.length;

        return handover;
    }

    /**
     * Clear handover (cashier action)
     */
    async clearHandover(handoverId, cashierEmployeeId, paymentMethods, amountCashed, notes = null) {
        const handover = await db.query(
            'SELECT * FROM handovers WHERE id = $1',
            [handoverId]
        );

        if (!handover.rows[0]) {
            throw new Error('Handover not found');
        }

        if (handover.rows[0].status === 'cleared') {
            throw new Error('Handover already cleared');
        }

        const difference = parseFloat(amountCashed || 0) - parseFloat(handover.rows[0].amount_expected || 0);

        const result = await db.query(
            `UPDATE handovers 
             SET status = 'cleared',
                 cashier_employee_id = $1,
                 payment_methods = $2,
                 amount_cashed = $3,
                 difference = $4,
                 cleared_at = now(),
                 notes = COALESCE($5, notes)
             WHERE id = $6
             RETURNING *`,
            [cashierEmployeeId, JSON.stringify(paymentMethods), amountCashed, difference, notes, handoverId]
        );

        // Mark all linked transactions as cleared
        await db.query(
            `UPDATE fuel_transactions ft
             SET cleared = true,
                 cleared_by_cashier_id = $1,
                 cleared_at = now()
             FROM handover_transactions ht
             WHERE ht.fuel_transaction_id = ft.id
               AND ht.handover_id = $2
               AND ft.cleared = false`,
            [cashierEmployeeId, handoverId]
        );

        return result.rows[0];
    }

    /**
     * Get pending (uncleared) fuel transactions for Quick Clear UI
     */
    async getPendingTransactions(filters = {}) {
        let query = `
            SELECT ft.*,
                   e.first_name || ' ' || e.last_name as authorized_by_name,
                   COUNT(*) OVER(PARTITION BY ft.authorized_by_employee_id) as employee_total_count,
                   SUM(ft.amount) OVER(PARTITION BY ft.authorized_by_employee_id) as employee_total_amount
            FROM fuel_transactions ft
            LEFT JOIN employees e ON ft.authorized_by_employee_id = e.id
            WHERE ft.cleared = false
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.station_id) {
            query += ` AND ft.station_id = $${paramIndex++}`;
            params.push(filters.station_id);
        }
        if (filters.employee_id) {
            query += ` AND ft.authorized_by_employee_id = $${paramIndex++}`;
            params.push(filters.employee_id);
        }
        if (filters.pump_number) {
            query += ` AND ft.pump_number = $${paramIndex++}`;
            params.push(filters.pump_number);
        }

        query += ' ORDER BY ft.transaction_datetime DESC LIMIT $' + paramIndex++;
        params.push(filters.limit || 100);

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Quick clear a single transaction
     */
    async quickClearTransaction(transactionId, cashierEmployeeId) {
        const result = await db.query(
            `UPDATE fuel_transactions
             SET cleared = true,
                 cleared_by_cashier_id = $1,
                 cleared_at = now()
             WHERE id = $2
               AND cleared = false
             RETURNING *`,
            [cashierEmployeeId, transactionId]
        );

        if (!result.rows[0]) {
            throw new Error('Transaction not found or already cleared');
        }

        return result.rows[0];
    }

    /**
     * Check if employee needs handover and create if necessary
     * Returns handover object if created, null otherwise
     */
    async checkAndCreateHandover(employeeId, stationId, transactionId) {
        // Get count of UNCLEARED and UNLINKED transactions for this employee
        const countResult = await db.query(
            `SELECT COUNT(*) as unlinked_count,
                    COALESCE(SUM(amount), 0) as total_amount
             FROM fuel_transactions ft
             WHERE ft.authorized_by_employee_id = $1
               AND ft.station_id = $2
               AND ft.cleared = false
               AND NOT EXISTS (
                   SELECT 1 FROM handover_transactions ht 
                   WHERE ht.fuel_transaction_id = ft.id
               )`,
            [employeeId, stationId]
        );

        const unlinkedCount = parseInt(countResult.rows[0].unlinked_count);
        const totalAmount = parseFloat(countResult.rows[0].total_amount);

        // Create handover if we have 10 or more uncleared, unlinked transactions
        if (unlinkedCount >= 10) {
            logger.info(`Creating handover for employee ${employeeId} with ${unlinkedCount} uncleared transactions`);

            // Create the handover
            const handover = await db.query(
                `INSERT INTO handovers 
                 (station_id, employee_id, amount_expected, status)
                 VALUES ($1, $2, $3, 'pending')
                 RETURNING *`,
                [stationId, employeeId, totalAmount]
            );

            const handoverId = handover.rows[0].id;

            // Link all uncleared, unlinked transactions to this handover
            await db.query(
                `INSERT INTO handover_transactions (handover_id, fuel_transaction_id)
                 SELECT $1, ft.id
                 FROM fuel_transactions ft
                 WHERE ft.authorized_by_employee_id = $2
                   AND ft.station_id = $3
                   AND ft.cleared = false
                   AND NOT EXISTS (
                       SELECT 1 FROM handover_transactions ht 
                       WHERE ht.fuel_transaction_id = ft.id
                   )`,
                [handoverId, employeeId, stationId]
            );

            logger.info(`Handover ${handoverId} created and linked with ${unlinkedCount} uncleared transactions`);

            return handover.rows[0];
        }

        return null;
    }
}

module.exports = new HandoverService();

