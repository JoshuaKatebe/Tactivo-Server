# Tactivo Server API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, authentication is handled at the PTS controller level. The server uses Basic Auth credentials configured in environment variables.

---

## Endpoints

### Health Check

#### GET /api/health
Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-02T22:43:00.000Z",
  "services": {
    "fuel": "running"
  }
}
```

---

## Fuel API

### Pumps

#### GET /api/fuel/pumps
Get status of all pumps.

**Response:**
```json
{
  "error": false,
  "data": {
    "1": {
      "Status": "Idle",
      "Transaction": 123,
      "Nozzle": 1,
      "Volume": 0.0,
      "Amount": 0.0
    },
    "2": {
      "Status": "Filling",
      "Transaction": 124,
      "Nozzle": 2,
      "Volume": 15.5,
      "Amount": 25.30
    }
  }
}
```

#### GET /api/fuel/pumps/:pumpNumber
Get status of a specific pump.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Response:**
```json
{
  "error": false,
  "data": {
    "Status": "Idle",
    "Transaction": 123,
    "Nozzle": 1,
    "Volume": 0.0,
    "Amount": 0.0
  }
}
```

#### POST /api/fuel/pumps/:pumpNumber/authorize
Authorize a pump for fueling.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Body:**
```json
{
  "nozzleNumber": 1,
  "presetType": "Volume",  // Optional: "Volume", "Amount", or null
  "presetDose": 20.0,      // Optional: Required if presetType is set
  "price": 1.65            // Optional: Price per unit
}
```

**Response:**
```json
{
  "error": false,
  "message": "Pump authorized successfully",
  "data": {}
}
```

#### POST /api/fuel/pumps/:pumpNumber/stop
Stop a pump.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Response:**
```json
{
  "error": false,
  "message": "Pump stopped successfully",
  "data": {}
}
```

#### POST /api/fuel/pumps/:pumpNumber/emergency-stop
Emergency stop a pump.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Response:**
```json
{
  "error": false,
  "message": "Pump emergency stopped successfully",
  "data": {}
}
```

#### GET /api/fuel/pumps/:pumpNumber/totals
Get pump totals.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)
- `nozzle` (query) - Nozzle number (default: 1)

**Response:**
```json
{
  "error": false,
  "data": {
    "Volume": 1500.5,
    "Amount": 2475.83,
    "Transactions": 125
  }
}
```

#### GET /api/fuel/pumps/:pumpNumber/prices
Get current pump prices.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Response:**
```json
{
  "error": false,
  "data": {
    "Prices": [1.65, 1.70, 1.75, 0, 0, 0]
  }
}
```

#### POST /api/fuel/pumps/:pumpNumber/prices
Set pump prices.

**Parameters:**
- `pumpNumber` (path) - Pump number (1-50)

**Body:**
```json
{
  "prices": [1.65, 1.70, 1.75, 0, 0, 0]
}
```

**Response:**
```json
{
  "error": false,
  "message": "Pump prices updated successfully",
  "data": {}
}
```

### Tanks

#### GET /api/fuel/tanks
Get status of all tanks/probes.

**Response:**
```json
{
  "error": false,
  "data": {
    "1": {
      "Height": 150.5,
      "Volume": 5000.0,
      "Temperature": 20.5,
      "WaterHeight": 0.0
    },
    "2": {
      "Height": 200.0,
      "Volume": 8000.0,
      "Temperature": 21.0,
      "WaterHeight": 0.0
    }
  }
}
```

---

## WebSocket API

### Connection
```
ws://localhost:3000/ws
```

### Message Types

#### Initial Status
Sent immediately upon connection:
```json
{
  "type": "initialStatus",
  "data": {
    "1": { "Status": "Idle", ... },
    "2": { "Status": "Filling", ... }
  }
}
```

#### Pump Status Update
```json
{
  "type": "pumpStatus",
  "data": {
    "pump": 1,
    "status": {
      "Status": "Filling",
      "Transaction": 123,
      "Nozzle": 1,
      "Volume": 15.5,
      "Amount": 25.30
    }
  }
}
```

#### Transaction Update
```json
{
  "type": "transaction",
  "data": {
    "pump": 1,
    "transaction": 123,
    "data": {
      "Volume": 20.0,
      "Amount": 33.00,
      "DateTime": "2025-12-02T22:43:00.000Z"
    }
  }
}
```

#### Tank Status Update
```json
{
  "type": "tankStatus",
  "data": {
    "tank": 1,
    "status": {
      "Height": 150.5,
      "Volume": 5000.0,
      "Temperature": 20.5
    }
  }
}
```

### Client Messages

#### Ping
```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": true,
  "message": "Error description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (pump/tank not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (fuel service not initialized)

---

## Example Usage

### cURL Examples

**Get all pump statuses:**
```bash
curl http://localhost:3000/api/fuel/pumps
```

**Authorize pump 1, nozzle 1:**
```bash
curl -X POST http://localhost:3000/api/fuel/pumps/1/authorize \
  -H "Content-Type: application/json" \
  -d '{"nozzleNumber": 1}'
```

**Stop pump 1:**
```bash
curl -X POST http://localhost:3000/api/fuel/pumps/1/stop
```

**Set pump prices:**
```bash
curl -X POST http://localhost:3000/api/fuel/pumps/1/prices \
  -H "Content-Type: application/json" \
  -d '{"prices": [1.65, 1.70, 1.75, 0, 0, 0]}'
```

### JavaScript Example

```javascript
// Get pump statuses
const response = await fetch('http://localhost:3000/api/fuel/pumps');
const data = await response.json();
console.log(data.data);

// Authorize pump
await fetch('http://localhost:3000/api/fuel/pumps/1/authorize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nozzleNumber: 1,
    presetType: 'Volume',
    presetDose: 20.0
  })
});

// WebSocket connection
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message.type, message.data);
};
```

