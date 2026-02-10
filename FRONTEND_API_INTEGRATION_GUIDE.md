# Frontend API Integration Guide
## Shifts & Pumping Workflow for Tactivo Gas Station Management

**Current Server URL:** `https://tactivo-server-1.onrender.com/api`
**WebSocket URL:** `wss://tactivo-server-1.onrender.com/ws`

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Fuel Configuration APIs](#fuel-configuration-apis)
4. [Complete Workflow Implementation](#complete-workflow-implementation)
5. [Handover System (New)](#handover-system-new)
6. [Demo Mode Integration (New)](#demo-mode-integration-new)
7. [WebSocket Integration](#websocket-integration)
8. [Reports & Analytics APIs](#reports--analytics-apis)
9. [Complete Working Example](#complete-working-example)
10. [Full API Reference & Examples](#full-api-reference--example
5. [WebSocket Integration](#websocket-integration)
6. [Reports & Analytics APIs](#reports--analytics-apis)
7. [Complete Working Example](#complete-working-example)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [API Endpoints Summary](#api-endpoints-summary)

 **See also:** For a complete reference of all 13 report endpoints, refer to the [Report API Integration Guide](./REPORT_API_INTEGRATION_GUIDE.md).

---

## Overview

This guide demonstrates how to integrate the Tactivo backend APIs into your frontend application (React, Flutter, etc.). It covers the complete lifecycle: Authentication -> Shift Start -> Fuel Dispensing -> Handover -> Reporting.

### Workflow Steps
1. **Select/Login Attendant** - Choose employee or enter employee code
2. **Check/Open Shift** - Ensure attendant has an active shift
3. **Select Fuel Type & Amount** - Configure pump preset
4. **Authorize Pump** - Link attendant to transaction and start fueling (Supports **Real** and **Demo** modes)
5. **Monitor Progress** - Real-time updates via WebSocket
6. **Complete Transaction** - Record final transaction data
7. **Handover Check** - Automatically notify attendant if they need to clear cash (after 10 transactions)

---

## Quick Start

### 1. Setup API Client

```javascript
// api-client.js
const API_BASE_URL = 'https://tactivo-server-1.onrender.com/api';

class TactivoAPI {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

export const api = new TactivoAPI();
```

### 2. Authentication Setup

```javascript
// auth.js
export async function loginUser(username, password) {
  const response = await api.post('/auth/login', { username, password });
  if (response.data.token) {
    localStorage.setItem('auth_token', response.data.token);
    api.token = response.data.token;
  }
  return response.data;
}
```

---

## Fuel Configuration APIs

Create a service to manage fuel configuration data (Pumps, Nozzles, Prices).

```javascript
// fuel-config-service.js
class FuelConfigService {
  constructor(apiClient) {
    this.api = apiClient;
    this.cache = { pumps: null, fuelGrades: null, nozzles: null, prices: new Map() };
  }

  async loadConfiguration() {
    const [pumpsRes, gradesRes, nozzlesRes] = await Promise.all([
      this.api.get('/fuel/config/pumps'),
      this.api.get('/fuel/config/fuel-grades'),
      this.api.get('/fuel/config/nozzles')
    ]);
    this.cache.pumps = pumpsRes.data.Pumps || [];
    this.cache.fuelGrades = gradesRes.data.FuelGrades || [];
    this.cache.nozzles = nozzlesRes.data.Nozzles || [];
    return this.cache;
  }

  async getPumpWithPrices(pumpNumber) {
    if (!this.cache.pumps) await this.loadConfiguration();
    const pump = this.cache.pumps.find(p => p.Id === pumpNumber);
    if (!pump) throw new Error(`Pump ${pumpNumber} not found`);

    // Fetch live prices
    const pricesRes = await this.api.get(`/fuel/pumps/${pumpNumber}/prices`);
    const prices = pricesRes.data.Prices || [];

    return {
      ...pump,
      Nozzles: pump.Nozzles.map((nozzle, index) => ({
        ...nozzle,
        Price: prices[index] || 0
      }))
    };
  }
}
export const fuelConfig = new FuelConfigService(api);
```

---

## Complete Workflow Implementation

### Step 1: Attendant Selection & Shift

```javascript
// attendant-service.js
export async function loginAttendantByCode(employeeCode, stationId) {
  return await api.post('/attendants/login', {
    employee_code: employeeCode,
    station_id: stationId,
  });
}
```

```javascript
// shift-service.js
export async function ensureActiveShift(employeeId, stationId) {
  try {
    const response = await api.get(`/shifts/open?employee_id=${employeeId}&station_id=${stationId}`);
    if (response.data) return response.data;

    // Start new if none exists
    const startRes = await api.post('/shifts/start', {
      employee_id: employeeId,
      station_id: stationId,
      opening_cash: 0,
    });
    return startRes.data;
  } catch (error) {
    console.error('Shift Error:', error);
    throw error;
  }
}
```

### Step 2: Pump Authorization (With Demo Support)

This component handles the authorization request. Note the **Demo Mode** integration.

```javascript
// transaction-service.js

export async function authorizePump(data) {
  // data: { pumpNumber, nozzleNumber, presetType, presetDose, price, employeeId, stationId, isDemo }

  const endpoint = data.isDemo
    ? `/demo/fuel/pumps/${data.pumpNumber}/authorize`
    : `/fuel/pumps/${data.pumpNumber}/authorize`;

  const body = {
    nozzle: data.nozzleNumber,      // Note: Demo API expects 'nozzle'
    nozzleNumber: data.nozzleNumber, // Standard API expects 'nozzleNumber'
    type: data.presetType,
    presetType: data.presetType,
    dose: data.presetDose,
    presetDose: data.presetDose,
    price: data.price,

    // Required for both modes to track attendant
    employee_id: data.employeeId,
    authorized_by_employee_id: data.employeeId,
    station_id: data.stationId
  };

  return await api.post(endpoint, body);
}
```

### Step 3: Transaction Monitoring (WebSocket)

```javascript
// websocket-service.js
export class PumpMonitor {
  constructor(wsURL = 'wss://tactivo-server-1.onrender.com/ws') {
    this.wsURL = wsURL;
    this.listeners = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.wsURL);
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data); // { type: 'pumpStatus', data: { pump: 1, status: {...} } }
      this.emit(msg.type, msg);
    };
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }
}
export const pumpMonitor = new PumpMonitor();
```

---

## Handover System (New)

The system enforces a rule: **Attendants must perform a handover after 10 transactions.**

### 1. Checking Status (Attendant View)
Periodically check if the current attendant is blocked/needs handover.

```javascript
// handover-service.js
export async function checkHandoverStatus(employeeId, stationId) {
  const res = await api.get(`/handovers?employee_id=${employeeId}&station_id=${stationId}&status=pending`);
  // If array has items, a handover is required
  return res.data.length > 0 ? res.data[0] : null;
}
```

### 2. Clearing Handover (Cashier/Manager View)

```javascript
export async function getPendingHandovers(stationId) {
  const res = await api.get(`/handovers/pending?station_id=${stationId}`);
  return res.data;
}

export async function clearHandover(handoverId, cashierId, amount, methods) {
  // methods: { cash: 500.00 }
  return await api.post(`/handovers/${handoverId}/clear`, {
    cashier_employee_id: cashierId,
    amount_cashed: amount,
    payment_methods: methods,
    notes: 'Cleared via Frontend'
  });
}
```

---

## Demo Mode Integration (New)

Use Demo Mode to simulate fuel flow without physical hardware.

1.  **Authorization:** Use the `isDemo` flag in the `authorizePump` function (see above).
2.  **Logic:** The backend Demo Service simulates physics (pumping speed) and triggers the *same* WebSocket events (`pumpStatus`, `transaction`) as real hardware.
3.  **Data:** Demo transactions are saved to the main database (`fuel_transactions`) with a `synced` flag, ensuring they appear in reports.
4.  **Handover Testing:** You can test the 10-transaction handover limit using Demo Mode!

---

## Reports & Analytics APIs

```javascript
// report-service.js
export async function getShiftReport(shiftId) {
  const res = await api.get(`/reports/shifts/${shiftId}`);
  return res.data;
}

export async function getAttendantPerformance(employeeId, start, end) {
  const res = await api.get(`/reports/attendants/${employeeId}?start_date=${start}&end_date=${end}`);
  return res.data;
}
```

---

## Full API Reference & Examples

This section provides detailed Request/Response examples for AI generation and integration reference.

### 1. Attendant Login
**POST** `/attendants/login`

**Request:**
```json
{
  "employee_code": "EMP001",
  "station_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "token": "jwt_token_string",
    "employee": {
      "id": "uuid",
      "first_name": "John",
      "active": true
    }
  }
}
```

### 2. Authorize Pump (Real)
**POST** `/fuel/pumps/:id/authorize`

**Request:**
```json
{
  "nozzleNumber": 1,
  "presetType": "Amount",
  "presetDose": 50.00,
  "price": 1.65,
  "authorized_by_employee_id": "uuid",
  "station_id": "uuid"
}
```

**Response:**
```json
{ "error": false, "message": "Pump authorized successfully" }
```

### 3. Authorize Pump (Demo)
**POST** `/demo/fuel/pumps/:id/authorize`

**Request:**
```json
{
  "nozzle": 1,
  "type": "Amount",
  "dose": 50.00,
  "price": 1.65,
  "employee_id": "uuid",
  "station_id": "uuid"
}
```

### 4. Get Pending Handovers
**GET** `/handovers/pending?station_id=...`

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "handover_uuid",
      "employee_name": "John Doe",
      "transaction_count": 10,
      "total_amount": 500.00,
      "amount_expected": 500.00,
      "status": "pending",
      "handover_time": "2023-10-27T10:00:00Z"
    }
  ]
}
```

### 5. Clear Handover
**POST** `/handovers/:id/clear`

**Request:**
```json
{
  "cashier_employee_id": "cashier_uuid",
  "amount_cashed": 500.00,
  "payment_methods": { "cash": 500.00 },
  "notes": "Shift cleared"
}
```

### 6. Sales Report
**GET** `/reports/sales?station_id=...&start_date=2023-01-01&end_date=2023-01-31`

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "date": "2023-01-01T00:00:00Z",
      "total_volume": 1500.50,
      "total_amount": 2475.82,
      "transaction_count": 45
    }
  ]
}
```

### 7. WebSocket Message Types

**Pump Status Update:**
```json
{
  "type": "pumpStatus",
  "data": {
    "pump": 1,
    "status": {
      "Status": "Filling", // Idle, Authorized, Filling, EndOfTransaction
      "Volume": 10.5,
      "Amount": 17.32,
      "Price": 1.65
    }
  }
}
```

**Transaction Finalized:**
```json
{
  "type": "transaction",
  "data": {
    "pump": 1,
    "transaction": 1055,
    "data": {
      "Volume": 20.00,
      "Amount": 33.00,
      "Price": 1.65
    }
  }
}
```

### 3. Offline Support

Handle offline scenarios gracefully:

```javascript
// offline-handler.js
export function setupOfflineHandling() {
  window.addEventListener('online', () => {
    console.log('Back online');
    // Sync pending transactions
    syncPendingTransactions();
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline');
    // Show offline indicator
    showOfflineMessage();
  });
}

function showOfflineMessage() {
  // Display notification to user
  const notification = document.createElement('div');
  notification.className = 'offline-banner';
  notification.textContent = 'You are currently offline. Some features may be unavailable.';
  document.body.appendChild(notification);
}
```

### 4. Performance Optimization

```javascript
// Use React.memo for expensive components
export const TransactionMonitor = React.memo(({ pumpNumber, onComplete }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Only re-render if pumpNumber changes
  return prevProps.pumpNumber === nextProps.pumpNumber;
});

// Debounce search inputs
import { debounce } from 'lodash';

const debouncedSearch = debounce((searchTerm) => {
  searchEmployees(searchTerm);
}, 300);
```

---

## API Endpoints Summary

This section provides a comprehensive reference of all available API endpoints, organized by category.

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login user with username and password |
| `/api/auth/me` | GET | Get current authenticated user info |

### Attendants

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/attendants/login` | POST | Login attendant by code, badge, or card |
| `/api/attendants/{id}` | GET | Get attendant status with current shift |
| `/api/attendants/{id}/logout` | POST | Record attendant logout |
| `/api/attendants/{id}/validate` | GET | Validate attendant is active/authorized |

### Employees

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees` | GET | Get all employees (with filters) |
| `/api/employees` | POST | Create new employee |
| `/api/employees/{id}` | GET | Get employee by ID |
| `/api/employees/{id}` | PUT | Update employee |
| `/api/employees/{id}` | DELETE | Delete employee |
| `/api/employees/{id}/roles` | GET | Get employee roles |

### Shifts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shifts` | GET | List shifts with filters |
| `/api/shifts/open` | GET | Get open shift for employee/station |
| `/api/shifts/{id}` | GET | Get shift by ID |
| `/api/shifts/start` | POST | Start a new shift |
| `/api/shifts/{id}/end` | POST | End a shift |
| `/api/shifts/{id}/transactions` | GET | Get shift transactions |
| `/api/shifts/{id}/summary` | GET | Get shift summary |

### Fuel Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fuel/pumps` | GET | Get all pump statuses |
| `/api/fuel/pumps/{num}` | GET | Get single pump status |
| `/api/fuel/pumps/{num}/authorize` | POST | Authorize pump for fueling |
| `/api/fuel/pumps/{num}/stop` | POST | Stop a pump |
| `/api/fuel/pumps/{num}/emergency-stop` | POST | Emergency stop pump |
| `/api/fuel/pumps/{num}/totals` | GET | Get pump shift totals |
| `/api/fuel/pumps/{num}/close-transaction` | POST | Close and record transaction |
| `/api/fuel/config/pumps` | GET | Get pump configuration |
| `/api/fuel/config/fuel-grades` | GET | Get fuel grades config |
| `/api/fuel/config/nozzles` | GET | Get nozzles configuration |
| `/api/fuel/pumps/{num}/prices` | GET | Get pump prices |
| `/api/fuel/tanks` | GET | Get tank levels |

### Fuel Transactions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fuel-transactions` | GET | List fuel transactions |
| `/api/fuel-transactions/pending` | GET | Get pending (uncleared) transactions |
| `/api/fuel-transactions/summary` | GET | Get transaction summary |
| `/api/fuel-transactions/{id}` | GET | Get transaction by ID |
| `/api/fuel-transactions/register` | POST | Register manual transaction |
| `/api/fuel-transactions/{id}/quick-clear` | POST | Quick clear a transaction |
| `/api/fuel-transactions/by-shift/{id}` | GET | Get transactions by shift |
| `/api/fuel-transactions/by-employee/{id}` | GET | Get transactions by employee |

### Shop (POS)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/shop/products` | GET | Get all products |
| `/api/shop/products` | POST | Create product |
| `/api/shop/products/{id}` | GET | Get product by ID |
| `/api/shop/products/{id}` | PUT | Update product |
| `/api/shop/products/{id}` | DELETE | Delete product |
| `/api/shop/sales` | GET | Get all sales |
| `/api/shop/sales` | POST | Create a sale |
| `/api/shop/sales/{id}` | GET | Get sale by ID |

### Reports

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/sales` | GET | Comprehensive sales report |
| `/api/reports/sales/itemized` | GET | Itemized shop sales |
| `/api/reports/fuel` | GET | Fuel sales by pump/grade |
| `/api/reports/fuel/itemized` | GET | Itemized fuel transactions |
| `/api/reports/inventory` | GET | Inventory/stock report |
| `/api/reports/financial` | GET | Financial/revenue report |
| `/api/reports/employee` | GET | Employee performance |
| `/api/reports/attendants/{id}` | GET | Attendant performance |
| `/api/reports/shifts/{id}` | GET | Detailed shift report |
| `/api/reports/shifts/{id}/reconciliation` | GET | Shift cash reconciliation |
| `/api/reports/daily-shifts` | GET | Daily shifts summary |
| `/api/reports/pump-readings` | GET | Pump readings history |
| `/api/reports/credit-sales` | GET | Credit sales report |

---

### Next Steps

1. Implement authentication for your main application users
2. Add payment processing integration
3. Implement receipt printing
4. Add inventory management for shop items
5. Create mobile-responsive designs
6. Implement progressive web app (PWA) features

For complete API documentation with interactive testing, visit `/api-docs` on your running server.
