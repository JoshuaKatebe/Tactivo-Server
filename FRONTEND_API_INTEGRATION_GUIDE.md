# Frontend API Integration Guide
## Shifts & Pumping Workflow for Tactivo Gas Station Management

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Fuel Configuration APIs](#fuel-configuration-apis)
4. [Complete Workflow Implementation](#complete-workflow-implementation)
5. [WebSocket Integration](#websocket-integration)
6. [Reports & Analytics APIs](#reports--analytics-apis)
7. [Complete Working Example](#complete-working-example)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Overview

This guide demonstrates how to integrate the Tactivo backend APIs into your frontend application to create a complete fuel dispensing workflow with attendant tracking, shift management, and analytics.

### Workflow Steps
1. **Select/Login Attendant** - Choose employee or enter employee code
2. **Check/Open Shift** - Ensure attendant has an active shift
3. **Select Fuel Type & Amount** - Configure pump preset
4. **Authorize Pump** - Link attendant to transaction and start fueling
5. **Monitor Progress** - Real-time updates via WebSocket
6. **Complete Transaction** - Record final transaction data
7. **View Reports** - Analytics and reconciliation

### Base URL
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
const WS_BASE_URL = 'ws://localhost:3000/ws';
```

---

## Quick Start

### 1. Setup API Client

```javascript
// api-client.js
class TactivoAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
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

  // Convenience methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new TactivoAPI();
```

### 2. Authentication Setup

```javascript
// auth.js
export async function loginUser(username, password) {
  const response = await api.post('/auth/login', {
    username,
    password,
  });

  if (response.data.token) {
    localStorage.setItem('auth_token', response.data.token);
    api.token = response.data.token;
  }

  return response.data;
}

export function logout() {
  localStorage.removeItem('auth_token');
  api.token = null;
}
```

---

## Fuel Configuration APIs

Before implementing the workflow, you need to fetch configuration data from the PTS-2 controller to know what pumps, nozzles, and fuel grades are available.

### Configuration Service

Create a service to manage fuel configuration data:

```javascript
// fuel-config-service.js

class FuelConfigService {
  constructor(apiClient) {
    this.api = apiClient;
    this.cache = {
      pumps: null,
      fuelGrades: null,
      nozzles: null,
      prices: new Map()
    };
  }

  /**
   * Load all configuration data from PTS controller
   */
  async loadConfiguration() {
    try {
      const [pumpsRes, gradesRes, nozzlesRes] = await Promise.all([
        this.api.get('/fuel/config/pumps'),
        this.api.get('/fuel/config/fuel-grades'),
        this.api.get('/fuel/config/nozzles')
      ]);

      this.cache.pumps = pumpsRes.data.Pumps || [];
      this.cache.fuelGrades = gradesRes.data.FuelGrades || [];
      this.cache.nozzles = nozzlesRes.data.Nozzles || [];

      return this.cache;
    } catch (error) {
      console.error('Failed to load fuel configuration:', error);
      throw error;
    }
  }

  /**
   * Get nozzles for a specific pump
   */
  getNozzlesForPump(pumpNumber) {
    if (!this.cache.pumps) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }

    const pump = this.cache.pumps.find(p => p.Id === pumpNumber);
    return pump ? pump.Nozzles : [];
  }

  /**
   * Get fuel grade name by ID
   */
  getFuelGradeName(fuelGradeId) {
    if (!this.cache.fuelGrades) {
      throw new Error('Configuration not loaded.');
    }

    const grade = this.cache.fuelGrades.find(g => g.Id === fuelGradeId);
    return grade ? grade.Name : 'Unknown';
  }

  /**
   * Get pump with current prices
   */
  async getPumpWithPrices(pumpNumber) {
    const pump = this.cache.pumps.find(p => p.Id === pumpNumber);
    if (!pump) {
      throw new Error(`Pump ${pumpNumber} not found`);
    }

    // Get current prices
    const pricesRes = await this.api.get(`/fuel/pumps/${pumpNumber}/prices`);
    const prices = pricesRes.data.Prices || [];

    // Cache prices
    this.cache.prices.set(pumpNumber, prices);

    // Attach prices to nozzles
    return {
      ...pump,
      Nozzles: pump.Nozzles.map((nozzle, index) => ({
        ...nozzle,
        Price: prices[index] || 0
      }))
    };
  }

  /**
   * Get all pumps with their current prices
   */
  async getAllPumpsWithPrices() {
    if (!this.cache.pumps) {
      await this.loadConfiguration();
    }

    const pumpsWithPrices = await Promise.all(
      this.cache.pumps.map(pump => this.getPumpWithPrices(pump.Id))
    );

    return pumpsWithPrices;
  }

  /**
   * Get all fuel grades
   */
  getAllFuelGrades() {
    return this.cache.fuelGrades || [];
  }
}

export const fuelConfig = new FuelConfigService(api);
```

### React Component: Fuel Selection UI

```jsx
// FuelSelectionPanel.jsx
import React, { useEffect, useState } from 'react';
import { fuelConfig } from './fuel-config-service';

export function FuelSelectionPanel({ 
  pumpNumber, 
  onFuelSelected 
}) {
  const [pumpData, setPumpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNozzle, setSelectedNozzle] = useState(null);

  useEffect(() => {
    loadPumpData();
  }, [pumpNumber]);

  async function loadPumpData() {
    setLoading(true);
    try {
      // Load configuration if needed
      if (!fuelConfig.cache.pumps) {
        await fuelConfig.loadConfiguration();
      }

      // Get pump with current prices
      const pump = await fuelConfig.getPumpWithPrices(pumpNumber);
      setPumpData(pump);

      // Auto-select first nozzle
      if (pump.Nozzles.length > 0) {
        setSelectedNozzle(pump.Nozzles[0]);
      }
    } catch (error) {
      alert('Failed to load pump configuration');
    } finally {
      setLoading(false);
    }
  }

  function handleNozzleSelect(nozzle) {
    setSelectedNozzle(nozzle);
    onFuelSelected({
      nozzleNumber: nozzle.PhysicalNumber,
      fuelGrade: nozzle.FuelGradeName,
      fuelGradeId: nozzle.FuelGradeId,
      price: nozzle.Price
    });
  }

  if (loading) return <div>Loading pump configuration...</div>;
  if (!pumpData) return <div>No pump data available</div>;

  return (
    <div className="fuel-selection-panel">
      <h3>Pump {pumpData.Id} - Select Fuel Type</h3>
      
      <div className="nozzle-grid">
        {pumpData.Nozzles.map(nozzle => (
          <div
            key={nozzle.Id}
            className={`nozzle-card ${selectedNozzle?.Id === nozzle.Id ? 'selected' : ''}`}
            onClick={() => handleNozzleSelect(nozzle)}
          >
            <div className="fuel-name">{nozzle.FuelGradeName}</div>
            <div className="nozzle-number">Nozzle {nozzle.PhysicalNumber}</div>
            <div className="price">${nozzle.Price.toFixed(2)}/L</div>
          </div>
        ))}
      </div>

      {selectedNozzle && (
        <div className="selection-summary">
          <p><strong>Selected:</strong> {selectedNozzle.FuelGradeName}</p>
          <p><strong>Price:</strong> ${selectedNozzle.Price.toFixed(2)}/L</p>
          <p><strong>Nozzle:</strong> {selectedNozzle.PhysicalNumber}</p>
        </div>
      )}
    </div>
  );
}
```

### API Endpoints Reference

#### 1. Get Pumps Configuration
```javascript
const response = await api.get('/fuel/config/pumps');
```

**Response:**
```json
{
  "error": false,
  "data": {
    "Pumps": [
      {
        "Id": 1,
        "PhysicalNumber": 1,
        "Name": "Pump 1",
        "Nozzles": [
          {
            "Id": 1,
            "PhysicalNumber": 1,
            "FuelGradeId": 1,
            "FuelGradeName": "Petrol 95"
          },
          {
            "Id": 2,
            "PhysicalNumber": 2,
            "FuelGradeId": 2,
            "FuelGradeName": "Diesel"
          }
        ]
      }
    ]
  }
}
```

#### 2. Get Fuel Grades Configuration
```javascript
const response = await api.get('/fuel/config/fuel-grades');
```

**Response:**
```json
{
  "error": false,
  "data": {
    "FuelGrades": [
      {
        "Id": 1,
        "Name": "Petrol 95",
        "Code": "P95"
      },
      {
        "Id": 2,
        "Name": "Diesel",
        "Code": "DSL"
      }
    ]
  }
}
```

#### 3. Get Nozzles Configuration
```javascript
const response = await api.get('/fuel/config/nozzles');
```

**Response:**
```json
{
  "error": false,
  "data": {
    "Nozzles": [
      {
        "Id": 1,
        "Pump": 1,
        "PhysicalNumber": 1,
        "FuelGradeId": 1,
        "FuelGradeName": "Petrol 95"
      }
    ]
  }
}
```

#### 4. Get Pump Prices
```javascript
const response = await api.get('/fuel/pumps/1/prices');
```

**Response:**
```json
{
  "error": false,
  "data": {
    "Pump": 1,
    "Prices": [27.5, 23.99, 0, 0, 0, 0]
  }
}
```

**Note:** Prices array corresponds to nozzles 1-6. A price of `0` means the nozzle is not configured.

### Usage in Workflow

```javascript
// On app initialization
async function initializeApp() {
  try {
    // Load configuration once on startup
    await fuelConfig.loadConfiguration();
    console.log('Fuel configuration loaded');
    
    // Now you can use the cached data
    const fuelGrades = fuelConfig.getAllFuelGrades();
    console.log('Available fuel grades:', fuelGrades);
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

// In pump authorization component
async function selectPump(pumpNumber) {
  // Get pump with current prices
  const pumpData = await fuelConfig.getPumpWithPrices(pumpNumber);
  
  // Display nozzles to user
  pumpData.Nozzles.forEach(nozzle => {
    console.log(`${nozzle.FuelGradeName}: $${nozzle.Price}/L`);
  });
}

// When authorizing pump
function authorizePump(pumpNumber, selectedNozzle, presetAmount) {
  return api.post(`/fuel/pumps/${pumpNumber}/authorize`, {
    nozzleNumber: selectedNozzle.PhysicalNumber,
    presetType: 'Amount',
    presetDose: presetAmount,
    price: selectedNozzle.Price,
    authorized_by_employee_id: currentAttendant.id,
    station_id: currentStation.id
  });
}


### Step 1: Attendant Selection

#### Option A: Search and Select from Employee List

```javascript
// attendant-service.js

/**
 * Get all active employees for selection
 */
export async function getActiveEmployees(stationId) {
  try {
    const response = await api.get(`/employees?station_id=${stationId}&active=true`);
    return response.data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

/**
 * Login attendant using employee selection
 */
export async function loginAttendantById(employeeId, stationId) {
  try {
    // Get employee details first
    const employee = await api.get(`/employees/${employeeId}`);
    
    // Login using employee code
    const response = await api.post('/attendants/login', {
      employee_code: employee.data.employee_code,
      station_id: stationId,
    });

    return response.data;
  } catch (error) {
    console.error('Error logging in attendant:', error);
    throw error;
  }
}
```

**React Component Example:**
```jsx
// AttendantSelector.jsx
import React, { useState, useEffect } from 'react';
import { getActiveEmployees, loginAttendantById } from './attendant-service';

export function AttendantSelector({ stationId, onAttendantSelected }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEmployees();
  }, [stationId]);

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await getActiveEmployees(stationId);
      setEmployees(data);
    } catch (error) {
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectEmployee(employee) {
    setLoading(true);
    try {
      const attendantData = await loginAttendantById(employee.id, stationId);
      onAttendantSelected(attendantData);
    } catch (error) {
      alert('Failed to login attendant');
    } finally {
      setLoading(false);
    }
  }

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.includes(searchTerm)
  );

  return (
    <div className="attendant-selector">
      <h3>Select Attendant</h3>
      
      <input
        type="text"
        placeholder="Search by name or employee code..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="employee-list">
          {filteredEmployees.map(employee => (
            <div
              key={employee.id}
              className="employee-card"
              onClick={() => handleSelectEmployee(employee)}
            >
              <div className="employee-name">
                {employee.first_name} {employee.last_name}
              </div>
              <div className="employee-code">
                Code: {employee.employee_code}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Option B: Manual Employee Code Entry

```javascript
/**
 * Login attendant by entering employee code
 */
export async function loginAttendantByCode(employeeCode, stationId) {
  try {
    const response = await api.post('/attendants/login', {
      employee_code: employeeCode,
      station_id: stationId,
    });

    return response.data;
  } catch (error) {
    console.error('Error logging in attendant:', error);
    throw error;
  }
}
```

**React Component Example:**
```jsx
// QuickAttendantLogin.jsx
import React, { useState } from 'react';
import { loginAttendantByCode } from './attendant-service';

export function QuickAttendantLogin({ stationId, onAttendantSelected }) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    
    if (!employeeCode.trim()) {
      alert('Please enter an employee code');
      return;
    }

    setLoading(true);
    try {
      const attendantData = await loginAttendantByCode(employeeCode, stationId);
      onAttendantSelected(attendantData);
      setEmployeeCode('');
    } catch (error) {
      alert('Invalid employee code or employee not found');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="quick-login">
      <h3>Quick Attendant Login</h3>
      <input
        type="text"
        placeholder="Enter employee code"
        value={employeeCode}
        onChange={(e) => setEmployeeCode(e.target.value)}
        disabled={loading}
        autoFocus
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Step 2: Check/Open Shift

```javascript
// shift-service.js

/**
 * Check if attendant has an active shift
 */
export async function checkActiveShift(employeeId, stationId) {
  try {
    const response = await api.get(
      `/shifts/open?employee_id=${employeeId}&station_id=${stationId}`
    );
    
    return response.data; // Returns shift or null
  } catch (error) {
    console.error('Error checking shift:', error);
    return null;
  }
}

/**
 * Start a new shift for attendant
 */
export async function startShift(employeeId, stationId, openingCash = 0) {
  try {
    const response = await api.post('/shifts/start', {
      employee_id: employeeId,
      station_id: stationId,
      opening_cash: openingCash,
    });

    return response.data;
  } catch (error) {
    console.error('Error starting shift:', error);
    throw error;
  }
}

/**
 * Ensure attendant has active shift (check or create)
 */
export async function ensureActiveShift(employeeId, stationId) {
  let shift = await checkActiveShift(employeeId, stationId);
  
  if (!shift) {
    // No active shift, need to start one
    const openingCash = prompt('Enter opening cash amount:', '100');
    if (openingCash === null) {
      throw new Error('Shift start cancelled');
    }
    
    shift = await startShift(employeeId, stationId, parseFloat(openingCash));
  }
  
  return shift;
}
```

### Step 3: Pump Authorization Interface

```jsx
// PumpAuthorizationPanel.jsx
import React, { useState } from 'react';

export function PumpAuthorizationPanel({ 
  attendant, 
  shift, 
  stationId, 
  onPumpAuthorized 
}) {
  const [pumpNumber, setPumpNumber] = useState(1);
  const [nozzleNumber, setNozzleNumber] = useState(1);
  const [fuelType, setFuelType] = useState('petrol');
  const [presetType, setPresetType] = useState('Amount'); // 'Amount' or 'Volume'
  const [presetValue, setPresetValue] = useState('');
  const [price, setPrice] = useState(1.65);
  const [loading, setLoading] = useState(false);

  const fuelTypes = [
    { id: 'petrol', name: 'Petrol 95', nozzle: 1 },
    { id: 'diesel', name: 'Diesel', nozzle: 2 },
    { id: 'premium', name: 'Petrol 98', nozzle: 3 },
  ];

  async function handleAuthorize() {
    if (!presetValue || parseFloat(presetValue) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/fuel/pumps/${pumpNumber}/authorize`, {
        nozzleNumber,
        presetType,
        presetDose: parseFloat(presetValue),
        price,
        authorized_by_employee_id: attendant.employee.id,
        station_id: stationId,
      });

      onPumpAuthorized({
        pumpNumber,
        nozzleNumber,
        fuelType,
        presetType,
        presetValue,
        price,
      });

      // Reset for next transaction
      setPresetValue('');
    } catch (error) {
      alert('Failed to authorize pump: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pump-authorization-panel">
      <div className="attendant-info">
        <h4>Attendant: {attendant.employee.first_name} {attendant.employee.last_name}</h4>
        <p>Shift started: {new Date(shift.start_time).toLocaleTimeString()}</p>
      </div>

      <div className="pump-selection">
        <label>
          Pump Number:
          <input
            type="number"
            min="1"
            max="20"
            value={pumpNumber}
            onChange={(e) => setPumpNumber(parseInt(e.target.value))}
          />
        </label>
      </div>

      <div className="fuel-type-selection">
        <label>Fuel Type:</label>
        <div className="fuel-types">
          {fuelTypes.map(fuel => (
            <button
              key={fuel.id}
              className={fuelType === fuel.id ? 'active' : ''}
              onClick={() => {
                setFuelType(fuel.id);
                setNozzleNumber(fuel.nozzle);
              }}
            >
              {fuel.name}
            </button>
          ))}
        </div>
      </div>

      <div className="preset-configuration">
        <label>
          Preset Type:
          <select 
            value={presetType} 
            onChange={(e) => setPresetType(e.target.value)}
          >
            <option value="Amount">Amount ($)</option>
            <option value="Volume">Volume (L)</option>
          </select>
        </label>

        <label>
          {presetType === 'Amount' ? 'Amount ($):' : 'Volume (L):'}
          <input
            type="number"
            step="0.01"
            placeholder={presetType === 'Amount' ? '50.00' : '30.00'}
            value={presetValue}
            onChange={(e) => setPresetValue(e.target.value)}
          />
        </label>

        <label>
          Price per Liter:
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <div className="estimated-info">
        {presetType === 'Amount' && presetValue && (
          <p>Estimated Volume: {(parseFloat(presetValue) / price).toFixed(2)} L</p>
        )}
        {presetType === 'Volume' && presetValue && (
          <p>Estimated Amount: ${(parseFloat(presetValue) * price).toFixed(2)}</p>
        )}
      </div>

      <button
        className="authorize-button"
        onClick={handleAuthorize}
        disabled={loading || !presetValue}
      >
        {loading ? 'Authorizing...' : 'Authorize Pump'}
      </button>
    </div>
  );
}
```

### Step 4: Real-Time Transaction Monitoring

```javascript
// websocket-service.js

class PumpMonitor {
  constructor(wsURL = 'ws://localhost:3000/ws') {
    this.wsURL = wsURL;
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    this.ws = new WebSocket(this.wsURL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  handleMessage(data) {
    const { type } = data;
    
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => callback(data));
    }

    // Handle all listeners
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => callback(data));
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const callbacks = this.listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pumpMonitor = new PumpMonitor();
```

**React Component for Real-Time Monitoring:**
```jsx
// TransactionMonitor.jsx
import React, { useState, useEffect } from 'react';
import { pumpMonitor } from './websocket-service';

export function TransactionMonitor({ pumpNumber, onTransactionComplete }) {
  const [status, setStatus] = useState(null);
  const [transaction, setTransaction] = useState({
    volume: 0,
    amount: 0,
    status: 'idle',
  });

  useEffect(() => {
    pumpMonitor.connect();

    const handlePumpStatus = (data) => {
      if (data.data.pump === pumpNumber) {
        setStatus(data.data.status);
        
        // Update transaction progress
        if (data.data.status.Status === 'Filling' || 
            data.data.status.Status === 'Complete') {
          setTransaction({
            volume: data.data.status.Volume || 0,
            amount: data.data.status.Amount || 0,
            status: data.data.status.Status,
          });
        }

        // Check if transaction is complete
        if (data.data.status.Status === 'Idle' && transaction.status === 'Complete') {
          onTransactionComplete(data.data.status);
        }
      }
    };

    pumpMonitor.on('pumpStatus', handlePumpStatus);

    return () => {
      pumpMonitor.off('pumpStatus', handlePumpStatus);
    };
  }, [pumpNumber]);

  const getStatusColor = () => {
    switch (transaction.status) {
      case 'Filling': return '#4CAF50';
      case 'Complete': return '#2196F3';
      case 'Authorized': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="transaction-monitor">
      <h3>Pump {pumpNumber} - {transaction.status}</h3>
      
      <div className="transaction-display" style={{ borderColor: getStatusColor() }}>
        <div className="metric">
          <span className="label">Volume:</span>
          <span className="value">{transaction.volume.toFixed(2)} L</span>
        </div>
        
        <div className="metric">
          <span className="label">Amount:</span>
          <span className="value">${transaction.amount.toFixed(2)}</span>
        </div>

        {transaction.volume > 0 && (
          <div className="metric">
            <span className="label">Price/L:</span>
            <span className="value">
              ${(transaction.amount / transaction.volume).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {transaction.status === 'Filling' && (
        <div className="progress-indicator">
          <div className="spinner"></div>
          <p>Fueling in progress...</p>
        </div>
      )}

      {transaction.status === 'Complete' && (
        <div className="complete-indicator">
          <p>✓ Fueling complete - Ready to finalize</p>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Complete and Record Transaction

```javascript
// transaction-service.js

/**
 * Close and record completed pump transaction
 */
export async function closeTransaction(pumpNumber, ptsControllerId = null) {
  try {
    const response = await api.post(`/fuel/pumps/${pumpNumber}/close-transaction`, {
      pts_controller_id: ptsControllerId,
    });

    return response.data;
  } catch (error) {
    console.error('Error closing transaction:', error);
    throw error;
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(transactionId) {
  try {
    const response = await api.get(`/fuel-transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
}
```

**React Component:**
```jsx
// TransactionCompletion.jsx
import React, { useState } from 'react';
import { closeTransaction } from './transaction-service';

export function TransactionCompletion({ 
  pumpNumber, 
  finalData, 
  onComplete 
}) {
  const [loading, setLoading] = useState(false);

  async function handleFinalize() {
    setLoading(true);
    try {
      const result = await closeTransaction(pumpNumber);
      onComplete(result.data);
    } catch (error) {
      alert('Failed to finalize transaction: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="transaction-completion">
      <h3>Transaction Summary</h3>
      
      <div className="summary-details">
        <div className="detail-row">
          <span>Pump:</span>
          <span>{pumpNumber}</span>
        </div>
        <div className="detail-row">
          <span>Volume:</span>
          <span>{finalData.Volume?.toFixed(2)} L</span>
        </div>
        <div className="detail-row">
          <span>Amount:</span>
          <span>${finalData.Amount?.toFixed(2)}</span>
        </div>
        <div className="detail-row">
          <span>Price/L:</span>
          <span>
            ${(finalData.Amount / finalData.Volume).toFixed(2)}
          </span>
        </div>
      </div>

      <button
        className="finalize-button"
        onClick={handleFinalize}
        disabled={loading}
      >
        {loading ? 'Recording...' : 'Finalize Transaction'}
      </button>
    </div>
  );
}
```

---

## WebSocket Integration

### Complete WebSocket Event Handling

```javascript
// pump-events.js

export function setupPumpEventHandlers(pumpMonitor, handlers = {}) {
  // Pump status updates
  pumpMonitor.on('pumpStatus', (data) => {
    const { pump, status } = data.data;
    
    if (handlers.onPumpStatusChange) {
      handlers.onPumpStatusChange(pump, status);
    }

    // Status-specific handlers
    switch (status.Status) {
      case 'Authorized':
        handlers.onPumpAuthorized?.(pump, status);
        break;
      case 'Filling':
        handlers.onFueling?.(pump, status);
        break;
      case 'Complete':
        handlers.onFuelingComplete?.(pump, status);
        break;
      case 'Idle':
        handlers.onPumpIdle?.(pump, status);
        break;
      case 'Error':
        handlers.onPumpError?.(pump, status);
        break;
    }
  });

  // Transaction updates
  pumpMonitor.on('transactionUpdate', (data) => {
    if (handlers.onTransactionUpdate) {
      handlers.onTransactionUpdate(data.data);
    }
  });

  // New transaction complete
  pumpMonitor.on('newTransaction', (data) => {
    if (handlers.onNewTransaction) {
      handlers.onNewTransaction(data.data);
    }
  });

  // Tank level updates
  pumpMonitor.on('tankUpdate', (data) => {
    if (handlers.onTankUpdate) {
      handlers.onTankUpdate(data.data);
    }
  });
}
```

### Usage Example

```jsx
// PumpDashboard.jsx
import React, { useEffect, useState } from 'react';
import { pumpMonitor } from './websocket-service';
import { setupPumpEventHandlers } from './pump-events';

export function PumpDashboard() {
  const [pumpStatuses, setPumpStatuses] = useState({});

  useEffect(() => {
    pumpMonitor.connect();

    setupPumpEventHandlers(pumpMonitor, {
      onPumpStatusChange: (pump, status) => {
        setPumpStatuses(prev => ({
          ...prev,
          [pump]: status,
        }));
      },
      
      onFueling: (pump, status) => {
        console.log(`Pump ${pump} fueling:`, status.Volume, 'L');
      },
      
      onFuelingComplete: (pump, status) => {
        console.log(`Pump ${pump} complete:`, status);
        // Show notification or auto-finalize
      },
    });

    return () => {
      pumpMonitor.disconnect();
    };
  }, []);

  return (
    <div className="pump-dashboard">
      {Object.entries(pumpStatuses).map(([pump, status]) => (
        <div key={pump} className="pump-card">
          <h4>Pump {pump}</h4>
          <p>Status: {status.Status}</p>
          {status.Volume > 0 && (
            <>
              <p>Volume: {status.Volume} L</p>
              <p>Amount: ${status.Amount}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Reports & Analytics APIs

### 1. Shift Reports

```javascript
// report-service.js

/**
 * Get detailed shift report
 */
export async function getShiftReport(shiftId) {
  try {
    const response = await api.get(`/reports/shifts/${shiftId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching shift report:', error);
    throw error;
  }
}

/**
 * Get shift reconciliation report
 */
export async function getShiftReconciliation(shiftId) {
  try {
    const response = await api.get(`/reports/shifts/${shiftId}/reconciliation`);
    return response.data;
  } catch (error) {
    console.error('Error fetching reconciliation:', error);
    throw error;
  }
}
```

**React Component:**
```jsx
// ShiftReportViewer.jsx
import React, { useState, useEffect } from 'react';
import { getShiftReport, getShiftReconciliation } from './report-service';

export function ShiftReportViewer({ shiftId }) {
  const [report, setReport] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [shiftId]);

  async function loadReports() {
    setLoading(true);
    try {
      const [reportData, reconData] = await Promise.all([
        getShiftReport(shiftId),
        getShiftReconciliation(shiftId),
      ]);
      setReport(reportData);
      setReconciliation(reconData);
    } catch (error) {
      alert('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading reports...</div>;

  return (
    <div className="shift-report">
      <h2>Shift Report</h2>
      
      {/* Shift Information */}
      <section className="shift-info">
        <h3>Shift Details</h3>
        <div className="info-grid">
          <div>Employee: {report.shift.employee_name}</div>
          <div>Start: {new Date(report.shift.start_time).toLocaleString()}</div>
          <div>End: {new Date(report.shift.end_time).toLocaleString()}</div>
          <div>Duration: {report.shift.duration_hours?.toFixed(2)} hours</div>
        </div>
      </section>

      {/* Transaction Summary */}
      <section className="transaction-summary">
        <h3>Transaction Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="label">Transactions</div>
            <div className="value">{report.summary.transaction_count}</div>
          </div>
          <div className="summary-card">
            <div className="label">Total Volume</div>
            <div className="value">{parseFloat(report.summary.total_volume).toFixed(2)} L</div>
          </div>
          <div className="summary-card">
            <div className="label">Total Amount</div>
            <div className="value">${parseFloat(report.summary.total_amount).toFixed(2)}</div>
          </div>
          <div className="summary-card">
            <div className="label">Avg Price</div>
            <div className="value">${parseFloat(report.summary.average_price).toFixed(2)}/L</div>
          </div>
        </div>
      </section>

      {/* Reconciliation */}
      <section className="reconciliation">
        <h3>Cash Reconciliation</h3>
        <div className="cash-flow">
          <div className="flow-item">
            <span>Opening Cash:</span>
            <span>${reconciliation.cash_flow.opening_cash.toFixed(2)}</span>
          </div>
          <div className="flow-item">
            <span>Sales Amount:</span>
            <span>+${reconciliation.cash_flow.sales_amount.toFixed(2)}</span>
          </div>
          <div className="flow-item expected">
            <span>Expected Closing:</span>
            <span>${reconciliation.cash_flow.expected_closing.toFixed(2)}</span>
          </div>
          <div className="flow-item actual">
            <span>Actual Closing:</span>
            <span>${reconciliation.cash_flow.actual_closing.toFixed(2)}</span>
          </div>
          <div className={`flow-item variance ${reconciliation.reconciliation.status}`}>
            <span>Variance:</span>
            <span>
              {reconciliation.cash_flow.variance >= 0 ? '+' : ''}
              ${reconciliation.cash_flow.variance.toFixed(2)}
              ({reconciliation.reconciliation.variance_percentage}%)
            </span>
          </div>
        </div>
        
        <div className={`status-badge ${reconciliation.reconciliation.status}`}>
          {reconciliation.reconciliation.status.toUpperCase()}
        </div>
      </section>

      {/* Transaction List */}
      <section className="transactions-list">
        <h3>All Transactions</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Pump</th>
              <th>Volume (L)</th>
              <th>Amount ($)</th>
              <th>Price/L</th>
            </tr>
          </thead>
          <tbody>
            {report.transactions.map(txn => (
              <tr key={txn.id}>
                <td>{new Date(txn.transaction_datetime).toLocaleTimeString()}</td>
                <td>{txn.pump_number}</td>
                <td>{parseFloat(txn.volume).toFixed(2)}</td>
                <td>{parseFloat(txn.amount).toFixed(2)}</td>
                <td>{parseFloat(txn.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

### 2. Attendant Performance Reports

```javascript
/**
 * Get attendant performance report
 */
export async function getAttendantPerformance(employeeId, startDate, endDate) {
  try {
    const response = await api.get(
      `/reports/attendants/${employeeId}?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching attendant performance:', error);
    throw error;
  }
}
```

**React Component:**
```jsx
// AttendantPerformance.jsx
import React, { useState, useEffect } from 'react';
import { getAttendantPerformance } from './report-service';

export function AttendantPerformance({ employeeId }) {
  const [performance, setPerformance] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadPerformance();
  }, [employeeId, dateRange]);

  async function loadPerformance() {
    try {
      const data = await getAttendantPerformance(
        employeeId,
        dateRange.start,
        dateRange.end
      );
      setPerformance(data);
    } catch (error) {
      alert('Failed to load performance data');
    }
  }

  if (!performance) return <div>Loading...</div>;

  return (
    <div className="attendant-performance">
      <h2>
        Performance Report: {performance.employee.first_name} {performance.employee.last_name}
      </h2>

      <div className="date-range-selector">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
        />
        <span>to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
        />
      </div>

      <div className="performance-overview">
        <div className="metric-card">
          <h4>Shifts Worked</h4>
          <p className="metric-value">{performance.shifts.total_shifts}</p>
          <p className="metric-detail">
            Avg: {parseFloat(performance.shifts.avg_shift_hours).toFixed(1)} hours
          </p>
        </div>

        <div className="metric-card">
          <h4>Transactions</h4>
          <p className="metric-value">{performance.transactions.total_transactions}</p>
          <p className="metric-detail">
            Avg: ${parseFloat(performance.transactions.avg_transaction_amount).toFixed(2)}
          </p>
        </div>

        <div className="metric-card">
          <h4>Total Sales</h4>
          <p className="metric-value">
            ${parseFloat(performance.transactions.total_sales).toFixed(2)}
          </p>
          <p className="metric-detail">
            {parseFloat(performance.transactions.total_volume).toFixed(2)} L
          </p>
        </div>
      </div>

      <div className="pump-breakdown">
        <h3>Performance by Pump</h3>
        <table>
          <thead>
            <tr>
              <th>Pump</th>
              <th>Transactions</th>
              <th>Volume (L)</th>
              <th>Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            {performance.pump_breakdown.map(pump => (
              <tr key={pump.pump_number}>
                <td>Pump {pump.pump_number}</td>
                <td>{pump.transaction_count}</td>
                <td>{parseFloat(pump.total_volume).toFixed(2)}</td>
                <td>{parseFloat(pump.total_amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 3. Daily Shifts Summary

```javascript
/**
 * Get daily shifts summary for a station
 */
export async function getDailyShiftsSummary(stationId, date) {
  try {
    const response = await api.get(
      `/reports/daily-shifts?station_id=${stationId}&date=${date}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    throw error;
  }
}
```

**React Component:**
```jsx
// DailyShiftsSummary.jsx
import React, { useState, useEffect } from 'react';
import { getDailyShiftsSummary } from './report-service';

export function DailyShiftsSummary({ stationId }) {
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    loadSummary();
  }, [stationId, selectedDate]);

  async function loadSummary() {
    try {
      const data = await getDailyShiftsSummary(stationId, selectedDate);
      setSummary(data);
    } catch (error) {
      alert('Failed to load daily summary');
    }
  }

  if (!summary) return <div>Loading...</div>;

  return (
    <div className="daily-summary">
      <h2>Daily Shifts Summary</h2>
      
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <div className="daily-stats">
        <div className="stat-card">
          <h4>Total Shifts</h4>
          <p>{summary.summary.total_shifts}</p>
        </div>
        <div className="stat-card">
          <h4>Unique Employees</h4>
          <p>{summary.summary.unique_employees}</p>
        </div>
        <div className="stat-card">
          <h4>Total Transactions</h4>
          <p>{summary.summary.total_transactions}</p>
        </div>
        <div className="stat-card">
          <h4>Total Sales</h4>
          <p>${parseFloat(summary.summary.total_sales).toFixed(2)}</p>
        </div>
      </div>

      <div className="shifts-table">
        <h3>Individual Shifts</h3>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Transactions</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {summary.shifts.map(shift => (
              <tr key={shift.id}>
                <td>{shift.employee_name}</td>
                <td>{new Date(shift.start_time).toLocaleTimeString()}</td>
                <td>
                  {shift.end_time 
                    ? new Date(shift.end_time).toLocaleTimeString()
                    : 'Active'}
                </td>
                <td>{shift.transaction_count}</td>
                <td>${shift.transaction_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Complete Working Example

Here's a complete working example that ties everything together:

```jsx
// CompleteWorkflowApp.jsx
import React, { useState } from 'react';
import { AttendantSelector } from './AttendantSelector';
import { PumpAuthorizationPanel } from './PumpAuthorizationPanel';
import { TransactionMonitor } from './TransactionMonitor';
import { TransactionCompletion } from './TransactionCompletion';
import { ShiftReportViewer } from './ShiftReportViewer';
import { ensureActiveShift } from './shift-service';
import { closeTransaction } from './transaction-service';

export function CompleteWorkflowApp() {
  const [step, setStep] = useState('select-attendant'); // select-attendant, authorize-pump, monitor, complete, report
  const [attendant, setAttendant] = useState(null);
  const [shift, setShift] = useState(null);
  const [currentPump, setCurrentPump] = useState(null);
  const [finalTransaction, setFinalTransaction] = useState(null);
  
  const stationId = 'your-station-id'; // Replace with actual station ID

  async function handleAttendantSelected(attendantData) {
    setAttendant(attendantData);
    
    // Ensure shift is active
    try {
      const activeShift = await ensureActiveShift(
        attendantData.employee.id,
        stationId
      );
      setShift(activeShift);
      setStep('authorize-pump');
    } catch (error) {
      alert('Failed to ensure active shift');
    }
  }

  function handlePumpAuthorized(pumpData) {
    setCurrentPump(pumpData);
    setStep('monitor');
  }

  function handleTransactionComplete(transactionData) {
    setFinalTransaction(transactionData);
    setStep('complete');
  }

  async function handleFinalize(savedTransaction) {
    // Transaction is now saved in database
    console.log('Transaction saved:', savedTransaction);
    
    // Option 1: Go back to authorize another pump
    setStep('authorize-pump');
    setCurrentPump(null);
    setFinalTransaction(null);
    
    // Option 2: View shift report
    // setStep('report');
  }

  function handleViewReport() {
    setStep('report');
  }

  function handleNewTransaction() {
    setStep('authorize-pump');
    setCurrentPump(null);
    setFinalTransaction(null);
  }

  return (
    <div className="workflow-app">
      <header>
        <h1>Tactivo Fuel Management</h1>
        {attendant && (
          <div className="attendant-header">
            <span>
              Attendant: {attendant.employee.first_name} {attendant.employee.last_name}
            </span>
            <button onClick={handleViewReport}>View Shift Report</button>
          </div>
        )}
      </header>

      <main>
        {step === 'select-attendant' && (
          <AttendantSelector
            stationId={stationId}
            onAttendantSelected={handleAttendantSelected}
          />
        )}

        {step === 'authorize-pump' && (
          <PumpAuthorizationPanel
            attendant={attendant}
            shift={shift}
            stationId={stationId}
            onPumpAuthorized={handlePumpAuthorized}
          />
        )}

        {step === 'monitor' && (
          <TransactionMonitor
            pumpNumber={currentPump.pumpNumber}
            onTransactionComplete={handleTransactionComplete}
          />
        )}

        {step === 'complete' && (
          <TransactionCompletion
            pumpNumber={currentPump.pumpNumber}
            finalData={finalTransaction}
            onComplete={handleFinalize}
          />
        )}

        {step === 'report' && shift && (
          <ShiftReportViewer shiftId={shift.id} />
        )}
      </main>

      <footer>
        {step !== 'select-attendant' && (
          <button onClick={handleNewTransaction}>
            New Transaction
          </button>
        )}
      </footer>
    </div>
  );
}
```

---

## Error Handling

### Comprehensive Error Handling Example

```javascript
// error-handler.js

export class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

export async function handleAPICall(apiFunction, errorMessage) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error(errorMessage, error);
    
    // Show user-friendly error message
    if (error.status === 404) {
      throw new APIError('Resource not found', 404, error.data);
    } else if (error.status === 401 || error.status === 403) {
      throw new APIError('Authentication required', error.status, error.data);
    } else if (error.status === 503) {
      throw new APIError('Service temporarily unavailable', 503, error.data);
    } else {
      throw new APIError(
        'An unexpected error occurred. Please try again.',
        error.status || 500,
        error.data
      );
    }
  }
}

// Usage
async function safeAuthorize Pump(pumpNumber, authData) {
  return handleAPICall(
    () => api.post(`/fuel/pumps/${pumpNumber}/authorize`, authData),
    'Failed to authorize pump'
  );
}
```

---

## Best Practices

### 1. State Management

Use a state management library (Redux, Zustand, etc.) for complex applications:

```javascript
// store.js (using Zustand)
import create from 'zustand';

export const useWorkflowStore = create((set) => ({
  attendant: null,
  shift: null,
  activePumps: {},
  
  setAttendant: (attendant) => set({ attendant }),
  setShift: (shift) => set({ shift }),
  
  updatePumpStatus: (pumpNumber, status) => set((state) => ({
    activePumps: {
      ...state.activePumps,
      [pumpNumber]: status,
    },
  })),
  
  reset: () => set({
    attendant: null,
    shift: null,
    activePumps: {},
  }),
}));
```

### 2. Caching

Implement caching for frequently accessed data:

```javascript
// cache-service.js
class CacheService {
  constructor(ttl = 60000) { // 60 seconds default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new CacheService();

// Usage
async function getCachedEmployees(stationId) {
  const cacheKey = `employees_${stationId}`;
  const cached = cache.get(cacheKey);
  
  if (cached) return cached;
  
  const employees = await getActiveEmployees(stationId);
  cache.set(cacheKey, employees);
  
  return employees;
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

## Summary

This integration guide provides everything you need to build a complete fuel management frontend application:

1. **Attendant Selection** - Multiple methods (click, code entry, badge scan)
2. **Pump Authorization** - Fuel type, amount, preset configuration
3. **Real-Time Monitoring** - WebSocket integration for live updates
4. **Transaction Recording** - Automatic completion and database storage
5. **Analytics & Reports** - Shift reports, performance metrics, reconciliation

### Key Endpoints Used

| Feature | Endpoint | Method |
|---------|----------|--------|
| Attendant Login | `/api/attendants/login` | POST |
| Get Employees | `/api/employees` | GET |
| Check Shift | `/api/shifts/open` | GET |
| Start Shift | `/api/shifts/start` | POST |
| Authorize Pump | `/api/fuel/pumps/:num/authorize` | POST |
| Close Transaction | `/api/fuel/pumps/:num/close-transaction` | POST |
| Shift Report | `/api/reports/shifts/:id` | GET |
| Reconciliation | `/api/reports/shifts/:id/reconciliation` | GET |
| Attendant Performance | `/api/reports/attendants/:id` | GET |
| Daily Summary | `/api/reports/daily-shifts` | GET |

### Next Steps

1. Implement authentication for your main application users
2. Add payment processing integration
3. Implement receipt printing
4. Add inventory management for shop items
5. Create mobile-responsive designs
6. Implement progressive web app (PWA) features

For complete API documentation, visit `/api-docs` on your running server.
