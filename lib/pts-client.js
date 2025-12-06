/**
 * PTS Client - Node.js implementation of jsonPTS protocol
 * Converts browser-based pts.js to Node.js compatible module
 */

const axios = require('axios');
const https = require('https');
const EventEmitter = require('events');
const logger = require('../utils/logger');

// Constants
const TOTAL_PUMP_PORTS = 4;
const TOTAL_PUMPS = 50;
const TOTAL_PROBE_PORTS = 3;
const TOTAL_PROBES = 50;
const TOTAL_PRICE_BOARDS = 5;
const TOTAL_READERS = TOTAL_PUMPS;
const TOTAL_FUEL_GRADES = 10;

class PTSClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.baseURL = config.url;
        this.username = config.username;
        this.password = config.password;
        this.timeout = config.timeout || 30000;
        
        // Create axios instance with basic auth
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            auth: {
                username: this.username,
                password: this.password
            },
            // Allow self-signed certificates (common in industrial controllers)
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });
    }

    /**
     * Create a complex request with multiple packets
     * @param {Array} commands - Array of {function: Function, arguments: Array}
     * @returns {Promise}
     */
    async createComplexRequest(commands) {
        const request = {
            Protocol: 'jsonPTS',
            Packets: []
        };

        commands.forEach((command, index) => {
            const packet = {
                Id: index + 1,
                Type: command.function.name,
                Data: command.function.apply(this, command.arguments || [])
            };
            request.Packets.push(packet);
        });

        return this.sendRequest(JSON.stringify(request));
    }

    /**
     * Send request to PTS controller
     * @param {string} requestString - JSON string of the request
     * @returns {Promise}
     */
    async sendRequest(requestString) {
        try {
            logger.debug('Sending request to PTS', { url: this.baseURL });
            
            const response = await this.client.post('', requestString);
            
            // Check for errors in response
            if (response.data.Error === true) {
                const errorMsg = response.data.Message || 'Unknown error';
                logger.error('PTS controller error', { message: errorMsg, data: response.data.Data });
                throw new Error(errorMsg);
            }

            // Check for errors in packets
            if (response.data.Packets) {
                response.data.Packets.forEach((packet) => {
                    if (packet.Error === true) {
                        const errorMsg = packet.Message || 'Unknown packet error';
                        logger.error('PTS packet error', { 
                            packetId: packet.Id, 
                            packetType: packet.Type,
                            message: errorMsg,
                            data: packet.Data 
                        });
                        // Don't throw, but log - some packets may have errors while others succeed
                    }
                });
            }

            return response.data;
        } catch (error) {
            if (error.response) {
                logger.error('PTS HTTP error', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
                throw new Error(`PTS HTTP Error: ${error.response.status} ${error.response.statusText}`);
            } else if (error.request) {
                logger.error('PTS request timeout/network error', { message: error.message });
                throw new Error(`PTS Network Error: ${error.message}`);
            } else {
                logger.error('PTS request error', { message: error.message });
                throw error;
            }
        }
    }

    // ============================================================================
    // General Requests
    // ============================================================================

    GetConfigurationIdentifier() {
        return {};
    }

    GetLanguage() {
        return undefined;
    }

    GetMeasurementUnits() {
        return undefined;
    }

    GetDateTime() {
        return undefined;
    }

    SetDateTime(dateTime, autoSync, utcOffset) {
        return {
            DateTime: dateTime,
            AutoSynchronize: autoSync,
            UTCOffset: utcOffset
        };
    }

    GetUserInformation() {
        return undefined;
    }

    GetFirmwareInformation() {
        return undefined;
    }

    GetBatteryVoltage() {
        return undefined;
    }

    GetCpuTemperature() {
        return undefined;
    }

    GetUniqueIdentifier() {
        return undefined;
    }

    GetSdInformation() {
        return undefined;
    }

    GetSystemOperationInformation() {
        return undefined;
    }

    Restart() {
        return undefined;
    }

    // ============================================================================
    // Pump Control Requests
    // ============================================================================

    PumpGetStatus(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpAuthorize(pumpNumber, nozzleNumber, presetType, presetDose, price) {
        const data = {
            Pump: pumpNumber,
            Nozzle: nozzleNumber,
            Type: presetType,
            Price: price
        };
        
        if (data.Type === 'Volume' || data.Type === 'Amount') {
            data.Dose = presetDose;
        }
        
        return data;
    }

    PumpStop(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpEmergencyStop(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpResume(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpSuspend(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpCloseTransaction(pumpNumber, transactionNumber) {
        return {
            Pump: pumpNumber,
            Transaction: transactionNumber
        };
    }

    PumpGetTotals(pumpNumber, nozzleNumber) {
        return {
            Pump: pumpNumber,
            Nozzle: nozzleNumber
        };
    }

    PumpGetPrices(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpSetPrices(pumpNumber, prices) {
        return {
            Pump: pumpNumber,
            Prices: Array.isArray(prices) ? prices : [prices]
        };
    }

    PumpGetTransactionInformation(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpGetTag(pumpNumber, nozzleNumber) {
        return {
            Pump: pumpNumber,
            Nozzle: nozzleNumber
        };
    }

    PumpSetLights(pumpNumber, state) {
        return {
            Pump: pumpNumber,
            State: state
        };
    }

    PumpLock(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    PumpUnlock(pumpNumber) {
        return {
            Pump: pumpNumber
        };
    }

    // ============================================================================
    // Probe/Tank Requests
    // ============================================================================

    ProbeGetMeasurements(probeNumber) {
        return {
            Probe: probeNumber
        };
    }

    ProbeGetTankVolumeForHeight(tankNumber, height) {
        return {
            Probe: tankNumber,
            Height: height
        };
    }

    // ============================================================================
    // Configuration Requests
    // ============================================================================

    GetPumpsConfiguration() {
        return undefined;
    }

    GetProbesConfiguration() {
        return undefined;
    }

    GetTanksConfiguration() {
        return undefined;
    }

    GetFuelGradesConfiguration() {
        return undefined;
    }

    GetFuelGradesPrices() {
        return undefined;
    }

    SetFuelGradesPrices(fuelGradesPrices) {
        return {
            FuelGrades: fuelGradesPrices
        };
    }

    GetPumpNozzlesConfiguration() {
        return undefined;
    }

    GetPriceBoardsConfiguration() {
        return undefined;
    }

    GetReadersConfiguration() {
        return undefined;
    }

    GetTagsList() {
        return undefined;
    }

    GetPortsState() {
        return undefined;
    }

    // ============================================================================
    // Reader Requests
    // ============================================================================

    ReaderGetTag(readerNumber) {
        return {
            Reader: readerNumber
        };
    }

    ReaderGetStatus(readerNumber) {
        return {
            Reader: readerNumber
        };
    }
}

module.exports = PTSClient;

