/**
 * Fuel Service - Manages pump operations and polling
 */

const EventEmitter = require('events');
const PTSClient = require('../lib/pts-client');
const logger = require('../utils/logger');

class FuelService extends EventEmitter {
    constructor(config) {
        super();
        this.ptsClient = new PTSClient(config);
        this.pollingInterval = config.pollingInterval || 1000;
        this.pollingTimer = null;
        this.isPolling = false;
        
        // State storage
        this.pumpStatuses = new Map(); // pumpNumber -> status object
        this.tankStatuses = new Map(); // tankNumber -> status object
        this.lastTransactionNumbers = new Map(); // pumpNumber -> last transaction number
        
        // Track which pumps to poll (can be configured)
        this.pumpsToPoll = [];
    }

    /**
     * Start polling pumps and probes
     */
    async startPolling() {
        if (this.isPolling) {
            logger.warn('Polling already started');
            return;
        }

        logger.info('Starting fuel service polling', { interval: this.pollingInterval });
        this.isPolling = true;

        // Initial status fetch
        await this.pollAllPumps();
        await this.pollAllTanks();

        // Start periodic polling
        this.pollingTimer = setInterval(async () => {
            try {
                await this.pollAllPumps();
                // Poll tanks less frequently (every 5 seconds)
                if (Date.now() % 5000 < this.pollingInterval) {
                    await this.pollAllTanks();
                }
            } catch (error) {
                logger.error('Error during polling cycle', error);
            }
        }, this.pollingInterval);
    }

    /**
     * Stop polling
     */
    async stopPolling() {
        if (!this.isPolling) {
            return;
        }

        logger.info('Stopping fuel service polling');
        this.isPolling = false;

        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
    }

    /**
     * Poll status for all configured pumps
     */
    async pollAllPumps() {
        try {
            // If no pumps configured, try to poll first 10 pumps
            const pumpsToCheck = this.pumpsToPoll.length > 0 
                ? this.pumpsToPoll 
                : Array.from({ length: 10 }, (_, i) => i + 1);

            // Create batch request for all pumps
            const commands = pumpsToCheck.map(pumpNumber => ({
                function: this.ptsClient.PumpGetStatus.bind(this.ptsClient),
                arguments: [pumpNumber]
            }));

            if (commands.length === 0) {
                return;
            }

            const response = await this.ptsClient.createComplexRequest(commands);

            if (response.Packets) {
                response.Packets.forEach((packet, index) => {
                    const pumpNumber = pumpsToCheck[index];
                    if (packet.Error !== true && packet.Data) {
                        this.updatePumpStatus(pumpNumber, packet.Data);
                    }
                });
            }
        } catch (error) {
            logger.error('Error polling pumps', error);
        }
    }

    /**
     * Update pump status and emit events if changed
     */
    updatePumpStatus(pumpNumber, statusData) {
        const previousStatus = this.pumpStatuses.get(pumpNumber);
        this.pumpStatuses.set(pumpNumber, statusData);

        // Emit status update
        this.emit('statusUpdate', {
            pump: pumpNumber,
            status: statusData
        });

        // Check for transaction changes
        if (statusData.Transaction !== undefined) {
            const lastTransaction = this.lastTransactionNumbers.get(pumpNumber);
            if (lastTransaction !== statusData.Transaction) {
                this.lastTransactionNumbers.set(pumpNumber, statusData.Transaction);
                
                // If transaction completed, fetch transaction details
                if (statusData.Status === 'EndOfTransaction') {
                    this.fetchTransactionDetails(pumpNumber, statusData.Transaction);
                }
            }
        }

        // Emit specific events based on status
        if (statusData.Status) {
            if (statusData.Status === 'Filling' && previousStatus?.Status !== 'Filling') {
                this.emit('pumpFilling', {
                    pump: pumpNumber,
                    status: statusData
                });
            } else if (statusData.Status === 'Idle' && previousStatus?.Status !== 'Idle') {
                this.emit('pumpIdle', {
                    pump: pumpNumber,
                    status: statusData
                });
            } else if (statusData.Status === 'EndOfTransaction' && previousStatus?.Status !== 'EndOfTransaction') {
                this.emit('transactionComplete', {
                    pump: pumpNumber,
                    transaction: statusData.Transaction,
                    status: statusData
                });
            }
        }
    }

    /**
     * Fetch detailed transaction information
     */
    async fetchTransactionDetails(pumpNumber, transactionNumber) {
        try {
            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpGetTransactionInformation.bind(this.ptsClient),
                arguments: [pumpNumber]
            }]);

            if (response.Packets && response.Packets[0] && response.Packets[0].Data) {
                const transactionData = response.Packets[0].Data;
                this.emit('transactionUpdate', {
                    pump: pumpNumber,
                    transaction: transactionNumber,
                    data: transactionData
                });
            }
        } catch (error) {
            logger.error('Error fetching transaction details', { pump: pumpNumber, transaction: transactionNumber, error });
        }
    }

    /**
     * Poll all tanks/probes
     */
    async pollAllTanks() {
        try {
            // Poll first 10 probes (adjust based on configuration)
            const probesToCheck = Array.from({ length: 10 }, (_, i) => i + 1);

            const commands = probesToCheck.map(probeNumber => ({
                function: this.ptsClient.ProbeGetMeasurements.bind(this.ptsClient),
                arguments: [probeNumber]
            }));

            if (commands.length === 0) {
                return;
            }

            const response = await this.ptsClient.createComplexRequest(commands);

            if (response.Packets) {
                response.Packets.forEach((packet, index) => {
                    const probeNumber = probesToCheck[index];
                    if (packet.Error !== true && packet.Data) {
                        this.updateTankStatus(probeNumber, packet.Data);
                    }
                });
            }
        } catch (error) {
            logger.error('Error polling tanks', error);
        }
    }

    /**
     * Update tank status
     */
    updateTankStatus(tankNumber, statusData) {
        const previousStatus = this.tankStatuses.get(tankNumber);
        this.tankStatuses.set(tankNumber, statusData);

        this.emit('tankUpdate', {
            tank: tankNumber,
            status: statusData
        });
    }

    /**
     * Authorize a pump for fueling
     */
    async authorizePump(pumpNumber, nozzleNumber, presetType = null, presetDose = null, price = null) {
        try {
            logger.info('Authorizing pump', { pump: pumpNumber, nozzle: nozzleNumber, type: presetType, dose: presetDose, price });

            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpAuthorize.bind(this.ptsClient),
                arguments: [pumpNumber, nozzleNumber, presetType, presetDose, price]
            }]);

            if (response.Packets && response.Packets[0]) {
                if (response.Packets[0].Error === true) {
                    throw new Error(response.Packets[0].Message || 'Authorization failed');
                }
                return response.Packets[0].Data;
            }

            throw new Error('Invalid response from PTS controller');
        } catch (error) {
            logger.error('Error authorizing pump', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Stop a pump
     */
    async stopPump(pumpNumber) {
        try {
            logger.info('Stopping pump', { pump: pumpNumber });

            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpStop.bind(this.ptsClient),
                arguments: [pumpNumber]
            }]);

            if (response.Packets && response.Packets[0]) {
                if (response.Packets[0].Error === true) {
                    throw new Error(response.Packets[0].Message || 'Stop failed');
                }
                return response.Packets[0].Data;
            }

            throw new Error('Invalid response from PTS controller');
        } catch (error) {
            logger.error('Error stopping pump', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Emergency stop a pump
     */
    async emergencyStopPump(pumpNumber) {
        try {
            logger.warn('Emergency stopping pump', { pump: pumpNumber });

            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpEmergencyStop.bind(this.ptsClient),
                arguments: [pumpNumber]
            }]);

            if (response.Packets && response.Packets[0]) {
                if (response.Packets[0].Error === true) {
                    throw new Error(response.Packets[0].Message || 'Emergency stop failed');
                }
                return response.Packets[0].Data;
            }

            throw new Error('Invalid response from PTS controller');
        } catch (error) {
            logger.error('Error emergency stopping pump', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Get pump status
     */
    async getPumpStatus(pumpNumber) {
        try {
            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpGetStatus.bind(this.ptsClient),
                arguments: [pumpNumber]
            }]);

            if (response.Packets && response.Packets[0] && response.Packets[0].Data) {
                this.updatePumpStatus(pumpNumber, response.Packets[0].Data);
                return response.Packets[0].Data;
            }

            return null;
        } catch (error) {
            logger.error('Error getting pump status', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Get all pump statuses (from cache)
     */
    getPumpStatuses() {
        const statuses = {};
        this.pumpStatuses.forEach((status, pumpNumber) => {
            statuses[pumpNumber] = status;
        });
        return statuses;
    }

    /**
     * Get tank statuses
     */
    getTankStatuses() {
        const statuses = {};
        this.tankStatuses.forEach((status, tankNumber) => {
            statuses[tankNumber] = status;
        });
        return statuses;
    }

    /**
     * Get pump totals
     */
    async getPumpTotals(pumpNumber, nozzleNumber) {
        try {
            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpGetTotals.bind(this.ptsClient),
                arguments: [pumpNumber, nozzleNumber]
            }]);

            if (response.Packets && response.Packets[0] && response.Packets[0].Data) {
                return response.Packets[0].Data;
            }

            return null;
        } catch (error) {
            logger.error('Error getting pump totals', { pump: pumpNumber, nozzle: nozzleNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Set pump prices
     */
    async setPumpPrices(pumpNumber, prices) {
        try {
            logger.info('Setting pump prices', { pump: pumpNumber, prices });

            // Ensure prices is an array
            const pricesArray = Array.isArray(prices) ? prices : [prices];

            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpSetPrices.bind(this.ptsClient),
                arguments: [pumpNumber, pricesArray]
            }]);

            if (response.Packets && response.Packets[0]) {
                if (response.Packets[0].Error === true) {
                    throw new Error(response.Packets[0].Message || 'Set prices failed');
                }
                return response.Packets[0].Data;
            }

            throw new Error('Invalid response from PTS controller');
        } catch (error) {
            logger.error('Error setting pump prices', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Get pump prices
     */
    async getPumpPrices(pumpNumber) {
        try {
            const response = await this.ptsClient.createComplexRequest([{
                function: this.ptsClient.PumpGetPrices.bind(this.ptsClient),
                arguments: [pumpNumber]
            }]);

            if (response.Packets && response.Packets[0] && response.Packets[0].Data) {
                return response.Packets[0].Data;
            }

            return null;
        } catch (error) {
            logger.error('Error getting pump prices', { pump: pumpNumber, error: error.message });
            throw error;
        }
    }

    /**
     * Configure which pumps to poll
     */
    setPumpsToPoll(pumpNumbers) {
        this.pumpsToPoll = Array.isArray(pumpNumbers) ? pumpNumbers : [pumpNumbers];
        logger.info('Updated pumps to poll', { pumps: this.pumpsToPoll });
    }
}

module.exports = FuelService;

