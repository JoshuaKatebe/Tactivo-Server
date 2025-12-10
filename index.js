/**
 * Tactivo Server - Main Entry Point
 * Node.js backend for PTS-2 Forecourt Controller integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const config = require('./config/config');
const logger = require('./utils/logger');
const db = require('./lib/db');

// Import routes
const fuelRoutes = require('./routes/fuel.routes');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const organizationRoutes = require('./routes/organizations.routes');
const companyRoutes = require('./routes/companies.routes');
const stationRoutes = require('./routes/stations.routes');
const userRoutes = require('./routes/users.routes');
const employeeRoutes = require('./routes/employees.routes');
const shiftRoutes = require('./routes/shifts.routes');
const fuelTransactionRoutes = require('./routes/fuel-transactions.routes');
const shopRoutes = require('./routes/shop.routes');
const roleRoutes = require('./routes/roles.routes');
const permissionRoutes = require('./routes/permissions.routes');
const reportRoutes = require('./routes/reports.routes');
const handoverRoutes = require('./routes/handovers.routes');
const paymentRoutes = require('./routes/payments.routes');
const ptsControllerRoutes = require('./routes/pts-controllers.routes');
const pumpRoutes = require('./routes/pumps.routes');
const nozzleRoutes = require('./routes/nozzles.routes');
const stationShiftRoutes = require('./routes/station-shifts.routes');
const debtorRoutes = require('./routes/debtors.routes');
const stockRoutes = require('./routes/stock.routes');
const attendantRoutes = require('./routes/attendant.routes');

// Import services
const FuelService = require('./services/fuel.service');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    // Skip logging for Swagger UI
    if (req.path.startsWith('/api-docs')) {
        return next();
    }
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
    next();
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Tactivo API Documentation'
}));

// Serve OpenAPI JSON spec
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/fuel-transactions', fuelTransactionRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pts-controllers', ptsControllerRoutes);
app.use('/api/pumps', pumpRoutes);
app.use('/api/nozzles', nozzleRoutes);
app.use('/api/station-shifts', stationShiftRoutes);
app.use('/api/debtors', debtorRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/attendants', attendantRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);

// WebSocket Server for real-time updates
const wss = new WebSocket.Server({ server, path: '/ws' });

// Initialize services
let fuelService;

async function initializeServices() {
    try {
        logger.info('Initializing services...');

        // Initialize database
        db.initDatabase();

        // Initialize Fuel Service (if enabled)
        if (config.pts.enabled) {
            fuelService = new FuelService(config.pts);

            // Set up WebSocket broadcast handler
            fuelService.on('statusUpdate', (data) => {
                broadcastToClients(JSON.stringify({
                    type: 'pumpStatus',
                    data: data
                }));
            });

            fuelService.on('transactionUpdate', (data) => {
                broadcastToClients(JSON.stringify({
                    type: 'transaction',
                    data: data
                }));
            });

            fuelService.on('tankUpdate', (data) => {
                broadcastToClients(JSON.stringify({
                    type: 'tankStatus',
                    data: data
                }));
            });

            // Start polling
            await fuelService.startPolling();
            logger.info('⛽ Fuel Service initialized (Local Mode)');
        } else {
            logger.info('☁️ Fuel Service DISABLED (Cloud/API Mode) - PTS connection skipped');
        }

        logger.info('Services initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize services', error);
        process.exit(1);
    }
}

// WebSocket connection handling
const clients = new Set();

wss.on('connection', (ws, req) => {
    logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });
    clients.add(ws);

    // Send initial pump statuses
    if (fuelService) {
        const statuses = fuelService.getPumpStatuses();
        ws.send(JSON.stringify({
            type: 'initialStatus',
            data: statuses
        }));
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            logger.debug('WebSocket message received', data);

            // Handle client messages if needed
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (error) {
            logger.error('Error processing WebSocket message', error);
        }
    });

    ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        logger.error('WebSocket error', error);
        clients.delete(ws);
    });

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
            ws.terminate();
            clearInterval(pingInterval);
            return;
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);

    ws.on('pong', () => {
        ws.isAlive = true;
    });
});

function broadcastToClients(message) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                logger.error('Error broadcasting to client', error);
            }
        }
    });
}

// Make fuelService available to routes via app.locals
app.locals.fuelService = null; // Will be set after initialization

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', err);
    res.status(err.status || 500).json({
        error: true,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: true,
        message: 'Route not found'
    });
});

// Start server
const PORT = config.server.port || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

// Get local IP address for network access
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

async function startServer() {
    try {
        // Initialize services first
        await initializeServices();

        // Set fuelService in app.locals for route access
        app.locals.fuelService = fuelService;

        // Start HTTP server
        server.listen(PORT, HOST, () => {
            const localIP = getLocalIP();
            logger.info(`🚀 Tactivo Server running on port ${PORT}`);
            logger.info(`📍 Local access: http://localhost:${PORT}`);
            logger.info(`🌐 Network access: http://${localIP}:${PORT}`);
            logger.info(`📡 WebSocket server: ws://${localIP}:${PORT}/ws`);
            logger.info(`📚 Swagger UI: http://${localIP}:${PORT}/api-docs`);
            logger.info(`🔌 PTS Controller: ${config.pts.url}`);
        });
    } catch (error) {
        logger.error('Failed to start server', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    if (fuelService) {
        await fuelService.stopPolling();
    }
    await db.close();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    if (fuelService) {
        await fuelService.stopPolling();
    }
    await db.close();
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start the server
startServer();

module.exports = { app, server };

