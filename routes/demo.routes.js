const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../lib/db');

// Middleware to ensure Demo Service is available
const checkDemoService = (req, res, next) => {
    const fuelService = req.app.locals.fuelService;
    // Check if it's actually the demo service (by checking a unique property or class name)
    // Or just assume if we are calling these routes, we expect a fuelService to exist.
    // In "Cloud Mode", fuelService might be null, BUT for Demo Mode, we should probably instantiate it specifically.
    // Actually, distinct from "Cloud Mode", "Demo Mode" might mock the service inside the main "fuelService" slot 
    // OR be a separate sidecar.
    // Based on user request: "make a route called demo APIs" -> suggesting a parallel set of APIs.
    // So let's attach the *DemoFuelService* to req.app.locals.demoFuelService

    if (!req.app.locals.demoFuelService) {
        return res.status(503).json({ error: true, message: 'Demo service not running' });
    }
    req.fuelService = req.app.locals.demoFuelService;
    next();
};

/**
 * Fuel Pump Control (Demo)
 */
router.get('/fuel/pumps', checkDemoService, (req, res) => {
    res.json({ error: false, data: req.fuelService.getPumpStatuses() });
});

router.post('/fuel/pumps/:id/authorize', checkDemoService, async (req, res) => {
    try {
        const result = await req.fuelService.authorizePump(
            req.params.id,
            req.body.nozzle || 1,
            req.body.type,
            req.body.dose,
            req.body.price,
            req.body.employee_id,
            req.body.station_id
        );
        res.json({ error: false, data: result });
    } catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});

router.post('/fuel/pumps/:id/stop', checkDemoService, async (req, res) => {
    try {
        await req.fuelService.stopPump(req.params.id);
        res.json({ error: false, message: 'Pump Stopped' });
    } catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});

/**
 * Tank Control (Demo)
 */
router.get('/fuel/tanks', checkDemoService, (req, res) => {
    res.json({ error: false, data: req.fuelService.getTankStatuses() });
});

// Set Tank Level (Simulation Tool)
router.put('/fuel/tanks/:id/level', checkDemoService, async (req, res) => {
    try {
        const result = await req.fuelService.setTankLevel(req.params.id, req.body.volume);
        res.json({ error: false, data: result });
    } catch (e) {
        res.status(400).json({ error: true, message: e.message });
    }
});

/**
 * Demo Reports (from demo_fuel_transactions)
 */
router.get('/reports', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM demo_fuel_transactions ORDER BY transaction_datetime DESC LIMIT 50`
        );
        res.json({ error: false, data: result.rows });
    } catch (e) {
        res.status(500).json({ error: true, message: e.message });
    }
});

/**
 * Demo Attendants
 */
router.get('/attendants', (req, res) => {
    res.json({
        error: false,
        data: [
            { id: 1, name: 'David Makondo', code: 'EMP001' },
            { id: 2, name: 'John Banda', code: 'EMP002' },
            { id: 3, name: 'Micheal Phiri', code: 'EMP003' }
        ]
    });
});

module.exports = router;
