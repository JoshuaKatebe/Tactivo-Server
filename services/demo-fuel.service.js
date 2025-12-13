const EventEmitter = require('events');
const logger = require('../utils/logger');
const db = require('../lib/db');
const handoverService = require('./handover.service');

class DemoFuelService extends EventEmitter {
    constructor() {
        super();
        this.isPolling = false;
        this.simulationTimer = null;
        this.pollingInterval = 1000;

        // Initialize realistic demo state
        this.pumps = new Map();
        this.tanks = new Map();
        this.pumpPrices = new Map();

        // transactions History
        this.lastTransactionId = 1000;

        // Setup 6 Demo Pumps
        for (let i = 1; i <= 6; i++) {
            this.pumps.set(i, {
                Pump: i,
                Status: 'Idle', // Idle, Filling, Authorized, EndOfTransaction
                Nozzle: 1,
                Volume: 0.00,
                Amount: 0.00,
                Price: 1.65,
                Transaction: 0,
                User: null
            });
            this.pumpPrices.set(i, [1.65, 1.75, 1.85]); // Grade 1, 2, 3
        }

        // Setup 4 Demo Tanks
        for (let i = 1; i <= 4; i++) {
            this.tanks.set(i, {
                Tank: i,
                ProductHeight: 1500 + (Math.random() * 500),
                ProductVolume: 15000 + (Math.random() * 5000),
                Temperature: 22.5,
                WaterHeight: 0,
                WaterVolume: 0,
                TankFillingPercentage: 75 + (Math.random() * 10)
            });
        }
    }

    async startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;
        logger.info('🎮 Demo Fuel Service started (Simulation Mode)');

        this.simulationTimer = setInterval(() => {
            this.runSimulationLoop();
        }, this.pollingInterval);
    }

    async stopPolling() {
        this.isPolling = false;
        if (this.simulationTimer) clearInterval(this.simulationTimer);
    }

    runSimulationLoop() {
        // Simulate Pumping Physics
        this.pumps.forEach((status, pumpNumber) => {
            if (status.Status === 'Filling') {
                // Flow rate: 1.5 liters per second
                const flowRate = 1.5;
                status.Volume += flowRate;
                status.Amount = status.Volume * status.Price;

                // Simulate Tank Depletion (Tank 1 for Nozzle 1, etc)
                const tank = this.tanks.get(1); // Simplification: All pumps pull from Tank 1 for now
                if (tank) {
                    tank.ProductVolume -= flowRate;
                    // Update percentage roughly (assuming 20k capacity)
                    tank.TankFillingPercentage = (tank.ProductVolume / 20000) * 100;
                    this.emit('tankUpdate', { tank: 1, status: tank });
                }

                this.emit('statusUpdate', { pump: pumpNumber, status: status });

                // Auto-stop after 50 Liters (simulating preset or full tank)
                if (status.Volume >= 50) {
                    this.finishTransaction(pumpNumber);
                }
            } else if (status.Status === 'Authorized') {
                // Auto-start filling after 2 seconds
                if (!status.authTime) status.authTime = Date.now();
                if (Date.now() - status.authTime > 2000) {
                    status.Status = 'Filling';
                    delete status.authTime;
                    this.emit('statusUpdate', { pump: pumpNumber, status: status });
                }
            }
        });
    }

    finishTransaction(pumpNumber) {
        const status = this.pumps.get(pumpNumber);
        status.Status = 'EndOfTransaction';
        status.Transaction = ++this.lastTransactionId;

        this.emit('statusUpdate', { pump: pumpNumber, status: status });
        this.emit('transactionUpdate', {
            pump: pumpNumber,
            transaction: status.Transaction,
            data: { ...status } // Clone data
        });

        // Save to DEMO DB
        this.saveDemoTransaction(status).catch(err => logger.error('Failed to save demo txn', err));
    }

    async saveDemoTransaction(status) {
        try {
            // Insert into main fuel_transactions table to link with system
            const result = await db.query(
                `INSERT INTO fuel_transactions
                 (station_id, pump_number, nozzle, volume, amount, price,
                  transaction_datetime, authorized_by_employee_id, synced)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, true)
                 RETURNING id`,
                [
                    status.StationId || null,
                    status.Pump,
                    status.Nozzle,
                    status.Volume,
                    status.Amount,
                    status.Price,
                    status.AuthorizedByEmployeeId || null
                ]
            );

            // Also save to demo table for historical reasons if needed, or we can deprecate it.
            // But let's keep it for the specific demo reports endpoint if it relies on it.
            // Actually, the requirement is "Demo APIs should mark which attendants sold the dummy fuel
            // and should be linked to the rest of the system".
            // So writing to main table is the key.

            // Check for handover trigger
            if (status.AuthorizedByEmployeeId && status.StationId && result.rows[0]) {
                 try {
                     await handoverService.checkAndCreateHandover(
                         status.AuthorizedByEmployeeId,
                         status.StationId,
                         result.rows[0].id
                     );
                 } catch (err) {
                     logger.error('Error checking handover trigger for demo txn', err);
                 }
            }

        } catch (e) {
            logger.error('Error saving demo transaction', e);
        }
    }

    // --- API Methods ---

    getPumpStatuses() {
        const result = {};
        this.pumps.forEach((v, k) => result[k] = v);
        return result;
    }

    getTankStatuses() {
        const result = {};
        this.tanks.forEach((v, k) => result[k] = v);
        return result;
    }

    async authorizePump(pumpNumber, nozzleNumber, presetType, presetDose, price, employeeId, stationId) {
        const status = this.pumps.get(parseInt(pumpNumber));
        if (!status) throw new Error('Invalid Pump');

        status.Status = 'Authorized';
        status.Nozzle = nozzleNumber || 1;
        status.Price = price || 1.65;
        status.Volume = 0;
        status.Amount = 0;

        // Store authorization details for later use when saving
        status.AuthorizedByEmployeeId = employeeId || null;
        status.StationId = stationId || null;

        this.emit('statusUpdate', { pump: pumpNumber, status: status });
        return { success: true, message: 'Pump Authorized (Demo)' };
    }

    async stopPump(pumpNumber) {
        const status = this.pumps.get(parseInt(pumpNumber));
        if (!status) throw new Error('Invalid Pump');

        if (status.Status === 'Filling') {
            this.finishTransaction(parseInt(pumpNumber));
        } else {
            status.Status = 'Idle';
            this.emit('statusUpdate', { pump: pumpNumber, status: status });
        }
        return { success: true };
    }

    // Demo Specific: Manipulate Tank
    async setTankLevel(tankNumber, volume) {
        const tank = this.tanks.get(parseInt(tankNumber));
        if (!tank) throw new Error('Tank not found');

        tank.ProductVolume = parseFloat(volume);
        tank.TankFillingPercentage = (tank.ProductVolume / 20000) * 100;
        this.emit('tankUpdate', { tank: tankNumber, status: tank });
        return tank;
    }
}

module.exports = DemoFuelService;
