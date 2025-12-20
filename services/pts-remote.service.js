/**
 * PTS Remote Service
 * Handles incoming PTS-2 controller push data in cloud/remote mode
 * This service processes packets when fuelService is not available (no local PTS connection)
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');
const db = require('../lib/db');
const crypto = require('crypto');

class PTSRemoteService extends EventEmitter {
    constructor(config = {}) {
        super();
        this.secretKey = config.secretKey || '';
        this.verifySignature = config.verifySignature || false;

        // State storage (in-memory cache for real-time status)
        this.pumpStatuses = new Map();
        this.tankStatuses = new Map();
        this.deviceInfo = new Map(); // Store device configurations

        logger.info('PTSRemoteService initialized', {
            verifySignature: this.verifySignature,
            hasSecretKey: !!this.secretKey
        });
    }

    /**
     * Verify message signature from PTS-2 controller
     * @param {Object} body - Request body
     * @param {string} signature - Signature from X-PTS-Signature header
     * @returns {boolean} - Whether signature is valid
     */
    verifyMessageSignature(body, signature) {
        if (!this.verifySignature || !this.secretKey) {
            return true; // Skip verification if not configured
        }

        if (!signature) {
            logger.warn('Missing signature on signed request');
            return false;
        }

        try {
            const bodyString = JSON.stringify(body);
            const expectedSignature = crypto
                .createHmac('sha256', this.secretKey)
                .update(bodyString)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            logger.error('Error verifying signature', { error: error.message });
            return false;
        }
    }

    /**
     * Process incoming jsonPTS packets
     * @param {Array} packets - Array of jsonPTS packets
     * @param {string} deviceId - Device identifier (optional)
     * @returns {Array} - Results for each packet
     */
    async processPackets(packets, deviceId = null) {
        const results = [];

        for (const packet of packets) {
            try {
                const result = await this.processPacket(packet, deviceId);
                results.push({ Id: packet.Id, Error: false, Code: 0, ...result });
            } catch (error) {
                logger.error('Error processing packet', {
                    id: packet.Id,
                    type: packet.Type,
                    error: error.message
                });
                results.push({
                    Id: packet.Id,
                    Error: true,
                    Message: error.message
                });
            }
        }

        return results;
    }

    /**
     * Process a single jsonPTS packet
     * @param {Object} packet - jsonPTS packet
     * @param {string} deviceId - Device identifier
     */
    async processPacket(packet, deviceId) {
        const { Type, Data, Id } = packet;

        if (!Type || !Data) {
            throw new Error('Invalid packet format: missing Type or Data');
        }

        logger.debug('Processing packet', { type: Type, id: Id, deviceId });

        switch (Type) {
            // Pump Status Updates
            case 'PumpStatus':
            case 'PumpGetStatus':
                return this.handlePumpStatus(Data, deviceId);

            // Tank/Probe Measurements
            case 'ProbeMeasurements':
            case 'ProbeGetMeasurements':
                return this.handleTankMeasurement(Data, deviceId);

            // Pump Transactions
            case 'PumpTransaction':
            case 'PumpTransactionInformation':
            case 'PumpGetTransactionInformation':
                return this.handleTransaction(Data, deviceId);

            // In-Tank Deliveries
            case 'InTankDelivery':
                return this.handleInTankDelivery(Data, deviceId);

            // Alerts
            case 'Alert':
            case 'AlertRecord':
                return this.handleAlert(Data, deviceId);

            // GPS Records
            case 'GpsRecord':
                return this.handleGpsRecord(Data, deviceId);

            // Configuration
            case 'Configuration':
            case 'ControllerConfiguration':
                return this.handleConfiguration(Data, deviceId);

            // Payment Records
            case 'Payment':
            case 'PaymentRecord':
                return this.handlePayment(Data, deviceId);

            // Shift Records
            case 'Shift':
            case 'WorkingShift':
                return this.handleShift(Data, deviceId);

            default:
                logger.debug('Unhandled packet type', { type: Type });
                return { processed: false, type: Type };
        }
    }

    /**
     * Handle pump status update
     */
    async handlePumpStatus(data, deviceId) {
        const pumpNumber = data.Pump;
        if (!pumpNumber) {
            throw new Error('Missing Pump number in status data');
        }

        // Update in-memory cache
        this.pumpStatuses.set(pumpNumber, {
            ...data,
            lastUpdate: new Date().toISOString(),
            deviceId
        });

        // Emit event for WebSocket broadcast
        this.emit('statusUpdate', {
            pump: pumpNumber,
            status: data
        });

        logger.info('Pump status updated', {
            pump: pumpNumber,
            status: data.Status,
            nozzle: data.Nozzle
        });

        return { processed: true, pump: pumpNumber };
    }

    /**
     * Handle tank measurement
     */
    async handleTankMeasurement(data, deviceId) {
        const probeNumber = data.Probe || data.Tank;
        if (!probeNumber) {
            throw new Error('Missing Probe/Tank number in measurement data');
        }

        // Update in-memory cache
        this.tankStatuses.set(probeNumber, {
            ...data,
            lastUpdate: new Date().toISOString(),
            deviceId
        });

        // Emit event for WebSocket broadcast
        this.emit('tankUpdate', {
            tank: probeNumber,
            status: data
        });

        logger.info('Tank measurement received', {
            probe: probeNumber,
            volume: data.ProductVolume,
            height: data.ProductHeight,
            temperature: data.Temperature
        });

        // Persist to database
        try {
            await this.saveTankMeasurement(probeNumber, data);
        } catch (error) {
            logger.error('Failed to save tank measurement to DB', { error: error.message });
        }

        return { processed: true, probe: probeNumber };
    }

    /**
     * Handle pump transaction
     */
    async handleTransaction(data, deviceId) {
        const pumpNumber = data.Pump;
        const transactionNumber = data.Transaction || data.TransactionNumber;

        logger.info('Transaction received', {
            pump: pumpNumber,
            transaction: transactionNumber,
            volume: data.Volume,
            amount: data.Amount,
            fuelGrade: data.FuelGradeId || data.FuelGradeName
        });

        // Emit event for WebSocket broadcast
        this.emit('transactionUpdate', {
            pump: pumpNumber,
            transaction: transactionNumber,
            data: data
        });

        // Persist to database
        try {
            await this.saveTransaction(data);
        } catch (error) {
            logger.error('Failed to save transaction to DB', { error: error.message });
        }

        return { processed: true, pump: pumpNumber, transaction: transactionNumber };
    }

    /**
     * Handle in-tank delivery
     */
    async handleInTankDelivery(data, deviceId) {
        const tankNumber = data.Tank;

        logger.info('In-tank delivery received', {
            tank: tankNumber,
            startVolume: data.ProductVolumeStart,
            endVolume: data.ProductVolumeEnd,
            delivered: (data.ProductVolumeEnd || 0) - (data.ProductVolumeStart || 0)
        });

        // Persist to database
        try {
            await this.saveDelivery(data);
        } catch (error) {
            logger.error('Failed to save delivery to DB', { error: error.message });
        }

        return { processed: true, tank: tankNumber };
    }

    /**
     * Handle alert record
     */
    async handleAlert(data, deviceId) {
        logger.warn('Alert received from PTS-2', {
            type: data.AlertType || data.Type,
            device: data.Device || deviceId,
            message: data.Message || data.Description
        });

        // Emit alert event
        this.emit('alert', {
            data: data,
            deviceId: deviceId
        });

        // Persist to database
        try {
            await this.saveAlert(data);
        } catch (error) {
            logger.error('Failed to save alert to DB', { error: error.message });
        }

        return { processed: true };
    }

    /**
     * Handle GPS record
     */
    async handleGpsRecord(data, deviceId) {
        logger.debug('GPS record received', {
            latitude: data.Latitude,
            longitude: data.Longitude,
            speed: data.Speed
        });

        return { processed: true };
    }

    /**
     * Handle configuration push
     */
    async handleConfiguration(data, deviceId) {
        logger.info('Configuration received from PTS-2', {
            deviceId: deviceId,
            hasPumps: !!data.Pumps,
            hasProbes: !!data.Probes,
            hasTanks: !!data.Tanks
        });

        // Store device configuration
        if (deviceId) {
            this.deviceInfo.set(deviceId, {
                config: data,
                lastUpdate: new Date().toISOString()
            });
        }

        return { processed: true };
    }

    /**
     * Handle payment record
     */
    async handlePayment(data, deviceId) {
        logger.info('Payment record received', {
            pump: data.Pump,
            amount: data.Amount,
            paymentType: data.PaymentType
        });

        return { processed: true };
    }

    /**
     * Handle shift record
     */
    async handleShift(data, deviceId) {
        logger.info('Shift record received', {
            shiftNumber: data.ShiftNumber,
            user: data.User,
            startTime: data.StartDateTime,
            endTime: data.EndDateTime
        });

        return { processed: true };
    }

    // Database persistence methods

    /**
     * Save transaction to database
     */
    async saveTransaction(data) {
        const query = `
            INSERT INTO fuel_transactions (
                pump_number, nozzle_number, transaction_number,
                fuel_grade_id, fuel_grade_name, price_per_unit,
                volume, amount, start_time, end_time,
                attendant_tag, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (transaction_number, pump_number) DO UPDATE SET
                volume = EXCLUDED.volume,
                amount = EXCLUDED.amount,
                end_time = EXCLUDED.end_time,
                status = EXCLUDED.status
            RETURNING id
        `;

        const values = [
            data.Pump,
            data.Nozzle,
            data.Transaction || data.TransactionNumber,
            data.FuelGradeId,
            data.FuelGradeName,
            data.Price,
            data.Volume,
            data.Amount,
            data.StartDateTime,
            data.EndDateTime,
            data.Tag || data.AttendantTag,
            'completed'
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Save tank measurement to database
     */
    async saveTankMeasurement(probeNumber, data) {
        const query = `
            INSERT INTO tank_measurements (
                probe_number, fuel_grade_id, fuel_grade_name,
                product_height, product_volume, product_volume_tc,
                water_height, water_volume, temperature,
                density, mass, ullage, fill_percentage,
                measured_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            RETURNING id
        `;

        const values = [
            probeNumber,
            data.FuelGradeId,
            data.FuelGradeName,
            data.ProductHeight,
            data.ProductVolume,
            data.ProductVolumeTc,
            data.WaterHeight,
            data.WaterVolume,
            data.Temperature,
            data.Density,
            data.Mass,
            data.Ullage,
            data.TankFillingPercentage,
            data.DateTime || new Date().toISOString()
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Save delivery to database
     */
    async saveDelivery(data) {
        const query = `
            INSERT INTO tank_deliveries (
                tank_number, start_time, end_time,
                start_volume, end_volume, delivered_volume,
                start_height, end_height, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            RETURNING id
        `;

        const values = [
            data.Tank,
            data.StartDateTime,
            data.EndDateTime,
            data.ProductVolumeStart,
            data.ProductVolumeEnd,
            (data.ProductVolumeEnd || 0) - (data.ProductVolumeStart || 0),
            data.ProductHeightStart,
            data.ProductHeightEnd
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    /**
     * Save alert to database
     */
    async saveAlert(data) {
        const query = `
            INSERT INTO alerts (
                alert_type, device_type, device_number,
                message, severity, occurred_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
        `;

        const values = [
            data.AlertType || data.Type,
            data.DeviceType || 'controller',
            data.DeviceNumber || data.Device,
            data.Message || data.Description,
            data.Severity || 'warning',
            data.DateTime || new Date().toISOString()
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    // Getter methods for cached status

    /**
     * Get all pump statuses
     */
    getPumpStatuses() {
        const statuses = {};
        this.pumpStatuses.forEach((status, pumpNumber) => {
            statuses[pumpNumber] = status;
        });
        return statuses;
    }

    /**
     * Get all tank statuses
     */
    getTankStatuses() {
        const statuses = {};
        this.tankStatuses.forEach((status, tankNumber) => {
            statuses[tankNumber] = status;
        });
        return statuses;
    }

    /**
     * Get device info
     */
    getDeviceInfo(deviceId) {
        return this.deviceInfo.get(deviceId);
    }
}

module.exports = PTSRemoteService;
