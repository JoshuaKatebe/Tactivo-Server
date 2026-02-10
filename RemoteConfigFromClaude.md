 src/index.js (Main Server File)

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
require('dotenv').config();

const pts2Routes = require('./routes/pts2Routes');
const { authenticateWebSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Tactivo PTS-2 Server Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      http: '/api/pts/*',
      websocket: 'ws://tactivo-server-1.onrender.com/ws'
    }
  });
});

// PTS-2 HTTP Routes
app.use('/api/pts', pts2Routes);

// WebSocket Server Setup for real-time bidirectional communication
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

// Store connected PTS-2 controllers
const pts2Clients = new Map();

wss.on('connection', async (ws, req) => {
  console.log('🔌 New WebSocket connection attempt');
  
  // Authenticate (optional for testing)
  const isAuthenticated = await authenticateWebSocket(req);
  if (!isAuthenticated) {
    console.log('❌ WebSocket authentication failed');
    ws.close(1008, 'Authentication failed');
    return;
  }
  
  // Extract device identifier from initial message or generate one
  let deviceId = null;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 WebSocket received:', message);
      
      // Register device on first message
      if (!deviceId && message.Protocol === 'jsonPTS') {
        // Try to get device ID from message or use connection time
        deviceId = message.DeviceId || `device_${Date.now()}`;
        pts2Clients.set(deviceId, ws);
        console.log(`✅ PTS-2 Controller registered: ${deviceId}`);
        console.log(`📊 Total connected devices: ${pts2Clients.size}`);
      }
      
      // Handle different message types
      handleWebSocketMessage(ws, message, deviceId);
      
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
      ws.send(JSON.stringify({
        Protocol: 'jsonPTS',
        Packets: [{
          Type: 'Error',
          Data: { Message: 'Invalid message format' }
        }]
      }));
    }
  });
  
  ws.on('close', () => {
    if (deviceId) {
      pts2Clients.delete(deviceId);
      console.log(`🔌 Device disconnected: ${deviceId}`);
      console.log(`📊 Total connected devices: ${pts2Clients.size}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    Protocol: 'jsonPTS',
    Packets: [{
      Type: 'Confirmation',
      Data: { 
        Message: 'Connected to Tactivo Server',
        Timestamp: new Date().toISOString()
      }
    }]
  }));
});

// Handle WebSocket messages
function handleWebSocketMessage(ws, message, deviceId) {
  const packetType = message.Packets?.[0]?.Type;
  
  switch (packetType) {
    case 'PumpTransaction':
      console.log(`💰 Pump transaction from ${deviceId}:`, message.Packets[0].Data);
      // Store in database, process, etc.
      break;
      
    case 'TankMeasurement':
      console.log(`📊 Tank measurement from ${deviceId}:`, message.Packets[0].Data);
      break;
      
    case 'PumpStatus':
      console.log(`⛽ Pump status from ${deviceId}:`, message.Packets[0].Data);
      break;
      
    case 'TankStatus':
      console.log(`🛢️ Tank status from ${deviceId}:`, message.Packets[0].Data);
      break;
      
    case 'Configuration':
      console.log(`⚙️ Configuration from ${deviceId}:`, message.Packets[0].Data);
      break;
      
    case 'Alert':
      console.log(`🚨 Alert from ${deviceId}:`, message.Packets[0].Data);
      break;
      
    default:
      console.log(`📦 Unknown message type: ${packetType}`);
  }
  
  // Send acknowledgment
  ws.send(JSON.stringify({
    Protocol: 'jsonPTS',
    Packets: [{
      Id: message.Packets?.[0]?.Id || 1,
      Type: 'Confirmation',
      Data: { 
        Success: true,
        Received: packetType,
        Timestamp: new Date().toISOString()
      }
    }]
  }));
}

// Function to send commands to specific PTS-2 controller
function sendCommandToDevice(deviceId, command) {
  const ws = pts2Clients.get(deviceId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(command));
    return true;
  }
  return false;
}

// Example: Broadcast to all connected devices
function broadcastToAll(message) {
  pts2Clients.forEach((ws, deviceId) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// API endpoint to send commands via HTTP (for your dashboard/app)
app.post('/api/command/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const command = req.body;
  
  if (sendCommandToDevice(deviceId, command)) {
    res.json({ success: true, message: 'Command sent' });
  } else {
    res.status(404).json({ success: false, message: 'Device not connected' });
  }
});

// Get connected devices
app.get('/api/devices', (req, res) => {
  const devices = Array.from(pts2Clients.keys());
  res.json({
    count: devices.length,
    devices: devices
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Tactivo Server Started');
  console.log(`📡 HTTP Server: https://tactivo-server-1.onrender.com`);
  console.log(`🔌 WebSocket Server: ws://tactivo-server-1.onrender.com/ws`);
  console.log(`🎯 Port: ${PORT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('💤 SIGTERM received, closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

 src/routes/pts2Routes.js
 const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pts2Service = require('../services/pts2Service');

// Apply authentication middleware (optional for testing)
// router.use(authenticate);

// Pump transactions
router.post('/transactions', async (req, res) => {
  try {
    console.log('📥 Received pump transaction');
    const result = await pts2Service.handlePumpTransaction(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling pump transaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tank measurements
router.post('/tanks', async (req, res) => {
  try {
    console.log('📥 Received tank measurement');
    const result = await pts2Service.handleTankMeasurement(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling tank measurement:', error);
    res.status(500).json({ error: error.message });
  }
});

// In-tank deliveries
router.post('/deliveries', async (req, res) => {
  try {
    console.log('📥 Received in-tank delivery');
    const result = await pts2Service.handleInTankDelivery(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling in-tank delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

// GPS records
router.post('/gps', async (req, res) => {
  try {
    console.log('📥 Received GPS records');
    const result = await pts2Service.handleGpsRecords(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling GPS records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Alert records
router.post('/alerts', async (req, res) => {
  try {
    console.log('📥 Received alert records');
    const result = await pts2Service.handleAlertRecords(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling alert records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configuration
router.post('/configuration', async (req, res) => {
  try {
    console.log('📥 Received configuration');
    const result = await pts2Service.handleConfiguration(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status updates
router.post('/status', async (req, res) => {
  try {
    console.log('📥 Received status update');
    const result = await pts2Service.handleStatus(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Payments
router.post('/payments', async (req, res) => {
  try {
    console.log('📥 Received payment');
    const result = await pts2Service.handlePayment(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Working shifts
router.post('/shifts', async (req, res) => {
  try {
    console.log('📥 Received shift data');
    const result = await pts2Service.handleShift(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling shift:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

 src/services/pts2Service.js
 class PTS2Service {
  
  // Handle pump transaction
  async handlePumpTransaction(data) {
    const packet = data.Packets?.[0];
    console.log('💰 Processing pump transaction:', packet?.Data);
    
    // TODO: Save to database
    // await db.pumpTransactions.create(packet.Data);
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle tank measurement
  async handleTankMeasurement(data) {
    const packet = data.Packets?.[0];
    console.log('📊 Processing tank measurement:', packet?.Data);
    
    // TODO: Save to database
    // await db.tankMeasurements.create(packet.Data);
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle in-tank delivery
  async handleInTankDelivery(data) {
    const packet = data.Packets?.[0];
    console.log('🚚 Processing in-tank delivery:', packet?.Data);
    
    // TODO: Save to database
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle GPS records
  async handleGpsRecords(data) {
    const packet = data.Packets?.[0];
    console.log('📍 Processing GPS records:', packet?.Data);
    
    // TODO: Save to database
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle alert records
  async handleAlertRecords(data) {
    const packet = data.Packets?.[0];
    console.log('🚨 Processing alert:', packet?.Data);
    
    // TODO: Save to database and trigger notifications
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle configuration
  async handleConfiguration(data) {
    const packet = data.Packets?.[0];
    console.log('⚙️ Processing configuration:', packet?.Data);
    
    // TODO: Save configuration
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle status
  async handleStatus(data) {
    const packet = data.Packets?.[0];
    console.log('📡 Processing status:', packet?.Data);
    
    // TODO: Update device status in database
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle payment
  async handlePayment(data) {
    const packet = data.Packets?.[0];
    console.log('💳 Processing payment:', packet?.Data);
    
    // TODO: Process payment
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Handle shift
  async handleShift(data) {
    const packet = data.Packets?.[0];
    console.log('👷 Processing shift:', packet?.Data);
    
    // TODO: Save shift data
    
    return this.createConfirmation(packet?.Id);
  }
  
  // Create standard confirmation response
  createConfirmation(packetId = 1) {
    return {
      Protocol: 'jsonPTS',
      Packets: [{
        Id: packetId,
        Type: 'Confirmation',
        Data: {
          Success: true,
          Timestamp: new Date().toISOString()
        }
      }]
    };
  }
}

module.exports = new PTS2Service();


src/middleware/auth.js
// Simple authentication middleware
function authenticate(req, res, next) {
  // Skip authentication for testing
  if (process.env.SKIP_AUTH === 'true') {
    return next();
  }
  
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="PTS-2"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
    const [username, password] = credentials.split(':');
    
    const validUsername = process.env.PTS2_USERNAME || 'admin';
    const validPassword = process.env.PTS2_PASSWORD || 'admin';
    
    if (username === validUsername && password === validPassword) {
      next();
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid authorization header' });
  }
}

// WebSocket authentication
async function authenticateWebSocket(req) {
  // Skip authentication for testing
  if (process.env.SKIP_AUTH === 'true') {
    return true;
  }
  
  const auth = req.headers.authorization;
  if (!auth) return false;
  
  try {
    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString();
    const [username, password] = credentials.split(':');
    
    const validUsername = process.env.PTS2_USERNAME || 'admin';
    const validPassword = process.env.PTS2_PASSWORD || 'admin';
    
    return username === validUsername && password === validPassword;
  } catch {
    return false;
  }
}

module.exports = { authenticate, authenticateWebSocket };

