/**
 * Pump Transactions Service
 * Manages pump transaction lifecycle from authorization to completion
 */

const db = require('../lib/db');
const logger = require('../utils/logger');

class PumpTransactionsService {
    constructor() {
        // In-memory store for pending transactions (pump authorization to completion)
        // Key: pumpNumber, Value: transaction data
        this.pendingTransactions = new Map();
    }

    /**
     * Create pending transaction when pump is authorized
     * @param {number} pumpNumber - Pump number
     * @param {string} employeeId - Employee authorizing the pump
     * @param {Object} authDetails - Authorization details (nozzle, preset, etc.)
     * @param {string} stationId - Station ID
     * @returns {Object} Pending transaction
     */
    async createPendingTransaction(pumpNumber, employeeId, authDetails, stationId) {
        const transaction = {
            pumpNumber,
            employeeId,
            stationId,
            nozzleNumber: authDetails.nozzleNumber,
            presetType: authDetails.presetType,
            presetDose: authDetails.presetDose,
            price: authDetails.price,
            authorizedAt: new Date(),
            status: 'authorized',
            volume: 0,
            amount: 0
        };

        this.pendingTransactions.set(pumpNumber, transaction);
        logger.info('Pending transaction created', { pumpNumber, employeeId });

        return transaction;
    }

    /**
     * Update transaction as fueling progresses (from polling)
     * @param {number} pumpNumber - Pump number
     * @param {Object} transactionData - PTS transaction data
     * @returns {Object} Updated transaction
     */
    async updateTransaction(pumpNumber, transactionData) {
        const pending = this.pendingTransactions.get(pumpNumber);

        if (!pending) {
            logger.warn('No pending transaction found for update', { pumpNumber });
            return null;
        }

        // Update with current values from PTS
        pending.volume = transactionData.Volume || 0;
        pending.amount = transactionData.Amount || 0;
        pending.ptsTransactionId = transactionData.Transaction;
        pending.status = 'in_progress';
        pending.lastUpdate = new Date();

        this.pendingTransactions.set(pumpNumber, pending);

        return pending;
    }

    /**
     * Complete transaction and save to database
     * @param {number} pumpNumber - Pump number
     * @param {Object} finalData - Final transaction data from PTS
     * @param {string} ptsControllerId - PTS controller ID
     * @returns {Promise<Object>} Completed transaction record
     */
    async completeTransaction(pumpNumber, finalData = {}, ptsControllerId = null) {
        const pending = this.pendingTransactions.get(pumpNumber);

        if (!pending) {
            logger.warn('No pending transaction found for completion', { pumpNumber });
            return null;
        }

        try {
            // Merge final data from PTS with pending transaction
            const volume = finalData.Volume || pending.volume;
            const amount = finalData.Amount || pending.amount;
            const ptsTransactionId = finalData.Transaction || pending.ptsTransactionId;

            // Save to database
            const result = await db.query(
                `INSERT INTO fuel_transactions 
                 (station_id, pts_controller_id, pts_transaction_id, pump_number, nozzle,
                  transaction_datetime, volume, amount, price, authorized_by_employee_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
                [
                    pending.stationId,
                    ptsControllerId,
                    ptsTransactionId,
                    pumpNumber,
                    pending.nozzleNumber,
                    pending.authorizedAt,
                    volume,
                    amount,
                    pending.price || (volume > 0 ? amount / volume : 0),
                    pending.employeeId
                ]
            );

            const savedTransaction = result.rows[0];
            logger.info('Transaction completed and saved', {
                pumpNumber,
                transactionId: savedTransaction.id
            });

            // Remove from pending
            this.pendingTransactions.delete(pumpNumber);

            return savedTransaction;
        } catch (error) {
            logger.error('Error completing transaction', error);
            throw error;
        }
    }

    /**
     * Get active/pending transaction for a pump
     * @param {number} pumpNumber - Pump number
     * @returns {Object|null} Pending transaction or null
     */
    getActivePumpTransaction(pumpNumber) {
        return this.pendingTransactions.get(pumpNumber) || null;
    }

    /**
     * Cancel pending transaction
     * @param {number} pumpNumber - Pump number
     */
    cancelPendingTransaction(pumpNumber) {
        const pending = this.pendingTransactions.get(pumpNumber);
        if (pending) {
            logger.info('Cancelling pending transaction', { pumpNumber });
            this.pendingTransactions.delete(pumpNumber);
        }
    }

    /**
     * Get all pending transactions (for monitoring)
     * @returns {Array} Array of pending transactions
     */
    getAllPendingTransactions() {
        return Array.from(this.pendingTransactions.entries()).map(([pump, data]) => ({
            pump,
            ...data
        }));
    }

    /**
     * Clear old pending transactions (cleanup - called periodically)
     * @param {number} maxAgeMinutes - Maximum age in minutes
     */
    clearOldPendingTransactions(maxAgeMinutes = 60) {
        const now = new Date();
        let cleared = 0;

        for (const [pumpNumber, transaction] of this.pendingTransactions.entries()) {
            const ageMinutes = (now - new Date(transaction.authorizedAt)) / 1000 / 60;
            if (ageMinutes > maxAgeMinutes) {
                this.pendingTransactions.delete(pumpNumber);
                cleared++;
                logger.warn('Cleared old pending transaction', { pumpNumber, ageMinutes });
            }
        }

        if (cleared > 0) {
            logger.info('Cleared old pending transactions', { count: cleared });
        }

        return cleared;
    }
}

module.exports = new PumpTransactionsService();
