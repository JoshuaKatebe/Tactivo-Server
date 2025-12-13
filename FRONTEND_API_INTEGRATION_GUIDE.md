# Frontend API Integration Guide (React)
## Comprehensive Guide for Tactivo Fuel Management System

**Base URL:** `https://tactivo-server-1.onrender.com`
**WebSocket URL:** `wss://tactivo-server-1.onrender.com/ws` (Note: Use `wss://` for secure WebSocket connection)

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Fuel Dispensing Workflow](#fuel-dispensing-workflow)
4. [Handover System (New Feature)](#handover-system-new-feature)
5. [Demo Mode Integration](#demo-mode-integration)
6. [Real-time Monitoring](#real-time-monitoring)
7. [API Reference](#api-reference)

---

## Overview

This guide details how to integrate your frontend application (React, Flutter, or other) with the Tactivo backend. It covers the core fuel dispensing cycle, the new automated handover system, and how to effectively use the Demo Mode for testing and development.

### Core Concepts

*   **Attendant:** The employee dispensing fuel.
*   **Station:** The physical location.
*   **Pump/Nozzle:** The hardware dispensing fuel.
*   **Handover:** A process where an attendant clears their cash balance after accumulating 10 transactions.
*   **Demo Mode:** A simulation mode that generates realistic fuel transaction data without hardware.

---

## Quick Start

### 1. API Client Setup

Configure your HTTP client (e.g., `axios` or `fetch`) to point to the production server.

```javascript
// api-client.js
const API_BASE_URL = 'https://tactivo-server-1.onrender.com/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'API Error');
    return data;
  }
}

export const api = new ApiClient();
```

---

## Fuel Dispensing Workflow

The standard workflow for dispensing fuel involves authorization and monitoring.

### 1. Authorize Pump
Send a request to authorize a specific pump for an attendant.

```javascript
async function authorizePump(pumpId, nozzleNumber, amount, attendantId, stationId) {
  return await api.request(`/fuel/pumps/${pumpId}/authorize`, {
    method: 'POST',
    body: JSON.stringify({
      nozzleNumber: nozzleNumber,
      presetType: 'Amount',
      presetDose: amount,
      price: 1.65, // Fetch current price from config
      authorized_by_employee_id: attendantId,
      station_id: stationId
    })
  });
}
```

### 2. Complete Transaction
Once fueling is done (monitored via WebSocket), the transaction is automatically recorded. You can optionally call a "close" endpoint if manual confirmation is required by your UI flow, but the backend handles completion automatically upon receiving the "EndOfTransaction" signal from the controller (or Demo service).

---

## Handover System (New Feature)

The system automatically enforces a "Handover" rule: **When an attendant accumulates 10 uncleared transactions, a pending handover is created.** The attendant must clear this balance with a cashier to continue efficiently (or simply to follow protocol).

### 1. Checking for Pending Handovers
The frontend should periodically check if the current attendant has a pending handover to notify them.

**Endpoint:** `GET /api/handovers?employee_id={id}&status=pending`

```javascript
async function checkHandoverStatus(employeeId, stationId) {
  try {
    const response = await api.request(`/handovers?employee_id=${employeeId}&station_id=${stationId}&status=pending`);
    const pendingHandovers = response.data;

    if (pendingHandovers.length > 0) {
      // Notify user: "You have a pending handover. Please visit the cashier."
      return pendingHandovers[0];
    }
    return null;
  } catch (error) {
    console.error('Failed to check handover status', error);
  }
}
```

### 2. Cashier Workflow: Clearing a Handover
A separate "Cashier" or "Manager" view is required to process these handovers.

**Step A: List Pending Handovers**
Fetch all pending handovers for the station.

```javascript
// For Cashier Dashboard
async function getPendingStationHandovers(stationId) {
  return await api.request(`/handovers/pending?station_id=${stationId}`);
}
```

**Step B: View Handover Details**
When a cashier selects a handover, show the expected amount.

```javascript
async function getHandoverDetails(handoverId) {
  // Get handover metadata and linked transactions
  return await api.request(`/handovers/${handoverId}/transactions`);
}
```

**Step C: Clear Handover**
Submit the payment details to clear the handover.

```javascript
async function clearHandover(handoverId, cashierId, amountReceived, paymentMethods) {
  // paymentMethods example: { cash: 500.00, pos: 100.00 }
  return await api.request(`/handovers/${handoverId}/clear`, {
    method: 'POST',
    body: JSON.stringify({
      cashier_employee_id: cashierId,
      amount_cashed: amountReceived,
      payment_methods: paymentMethods,
      notes: "Cleared at end of shift"
    })
  });
}
```

---

## Demo Mode Integration

Use the Demo Mode to simulate fuel transactions without connecting to physical pumps. The new Demo APIs ensure these transactions are linked to your attendants and trigger real system behaviors (like the Handover limit).

### 1. Authorize Demo Pump
Use this specific endpoint to start a simulation. **Crucially, pass `employee_id` and `station_id` so the system can track the sale against the attendant.**

**Endpoint:** `POST /api/demo/fuel/pumps/:id/authorize`

```javascript
async function startDemoTransaction(pumpId, attendantId, stationId) {
  return await api.request(`/demo/fuel/pumps/${pumpId}/authorize`, {
    method: 'POST',
    body: JSON.stringify({
      nozzle: 1,
      type: 'Amount',
      dose: 50,      // Simulate $50 fuel
      price: 1.65,
      employee_id: attendantId, // REQUIRED for handover tracking
      station_id: stationId     // REQUIRED for station reporting
    })
  });
}
```

### 2. Testing the Handover Logic
To test the handover feature using Demo Mode:
1.  Log in as an attendant.
2.  Trigger 10 separate demo transactions using the function above.
3.  After the 10th transaction completes, call `checkHandoverStatus`. You should see a new pending handover.
4.  Switch to a Cashier user (or use a different screen) to fetch and clear that handover.

---

## Real-time Monitoring

Connect to the WebSocket to update the UI in real-time as the demo (or real) pump dispenses fuel.

```javascript
const WS_URL = 'wss://tactivo-server-1.onrender.com/ws';

function connectWebSocket(onMessage) {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log('Connected to Pump Stream');
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    // Types: 'pumpStatus', 'transaction', 'tankStatus'
    if (message.type === 'pumpStatus') {
      const { pump, status } = message.data;
      // Update UI: status.Status (Idle, Filling, Authorized), status.Volume, status.Amount
      onMessage(pump, status);
    }
  };

  return ws;
}
```

---

## API Reference Summary

### Authentication
*   `POST /auth/login` - Login user

### Employees
*   `GET /employees` - List employees
*   `POST /attendants/login` - Shift login for attendants

### Fuel & Demo
*   `POST /fuel/pumps/:id/authorize` - Real pump auth
*   `POST /demo/fuel/pumps/:id/authorize` - **Demo pump auth (Use for testing)**

### Handovers
*   `GET /handovers/pending` - List all pending handovers (Cashier view)
*   `GET /handovers?employee_id=...&status=pending` - Check specific attendant status
*   `POST /handovers/:id/clear` - Clear a handover

### Reports
*   `GET /reports/sales` - General sales report
*   `GET /reports/attendants/:id` - Attendant performance
