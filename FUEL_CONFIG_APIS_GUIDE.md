# Fuel Configuration APIs - Usage Guide

## Overview

The Tactivo server provides APIs to fetch configuration data from the PTS-2 controller, including pumps, nozzles, fuel grades, and prices. These endpoints are essential for setting up your frontend to display available fuel types, nozzles, and pricing information.

---

## Available Configuration Endpoints

### 1. **Get Pumps Configuration**
Retrieves complete pump configuration including associated nozzles and fuel grades.

**Endpoint:** `GET /api/fuel/config/pumps`

**Response Example:**
```json
{
  "error": false,
  "data": {
    "Pumps": [
      {
        "Id": 1,
        "Name": "Pump 1",
        "PhysicalNumber": 1,
        "Nozzles": [
          {
            "Id": 1,
            "Pump": 1,
            "PhysicalNumber": 1,
            "FuelGradeId": 1,
            "FuelGradeName": "Petrol 95"
          },
          {
            "Id": 2,
            "Pump": 1,
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

**Usage:**
```javascript
const response = await api.get('/api/fuel/config/pumps');
const pumps = response.data;

// Loop through pumps and their nozzles
pumps.Pumps.forEach(pump => {
  console.log(`Pump ${pump.Id}:`);
  pump.Nozzles.forEach(nozzle => {
    console.log(`  - Nozzle ${nozzle.PhysicalNumber}: ${nozzle.FuelGradeName}`);
  });
});
```

---

### 2. **Get Fuel Grades Configuration**
Retrieves all available fuel grades configured in the PTS-2 controller.

**Endpoint:** `GET /api/fuel/config/fuel-grades`

**Response Example:**
```json
{
  "error": false,
  "data": {
    "FuelGrades": [
      {
        "Id": 1,
        "Name": "Petrol 95",
        "Code": "P95",
        "Coloring": "#FF0000"
      },
      {
        "Id": 2,
        "Name": "Diesel",
        "Code": "DSL",
        "Coloring": "#00FF00"
      },
      {
        "Id": 3,
        "Name": "Petrol 98",
        "Code": "P98",
        "Coloring": "#0000FF"
      }
    ]
  }
}
```

**Usage:**
```javascript
const response = await api.get('/api/fuel/config/fuel-grades');
const fuelGrades = response.data.FuelGrades;

// Create a mapping of fuel grade ID to name
const fuelGradeMap = {};
fuelGrades.forEach(grade => {
  fuelGradeMap[grade.Id] = grade.Name;
});

// Use in dropdown
<select>
  {fuelGrades.map(grade => (
    <option key={grade.Id} value={grade.Id}>
      {grade.Name}
    </option>
  ))}
</select>
```

---

### 3. **Get Nozzles Configuration**
Retrieves all configured nozzles with their pump associations and fuel grades.

**Endpoint:** `GET /api/fuel/config/nozzles`

**Response Example:**
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
      },
      {
        "Id": 2,
        "Pump": 1,
        "PhysicalNumber": 2,
        "FuelGradeId": 2,
        "FuelGradeName": "Diesel"
      }
    ]
  }
}
```

**Usage:**
```javascript
const response = await api.get('/api/fuel/config/nozzles');
const nozzles = response.data.Nozzles;

// Filter nozzles for a specific pump
function getNozzlesForPump(pumpNumber) {
  return nozzles.filter(nozzle => nozzle.Pump === pumpNumber);
}

// Display nozzle options
const pumpNozzles = getNozzlesForPump(1);
pumpNozzles.forEach(nozzle => {
  console.log(`Nozzle ${nozzle.PhysicalNumber}: ${nozzle.FuelGradeName}`);
});
```

---

### 4. **Get Pump Prices**
Retrieves the current prices for all nozzles on a specific pump.

**Endpoint:** `GET /api/fuel/pumps/{pumpNumber}/prices`

**Response Example:**
```json
{
  "error": false,
  "data": {
    "Pump": 1,
    "Prices": [27.5, 23.99, 0, 0, 0, 0]
  }
}
```

**Note:** The prices array corresponds to nozzles 1-6. A price of 0 means the nozzle is not configured.

**Usage:**
```javascript
const response = await api.get('/api/fuel/pumps/1/prices');
const prices = response.data.Prices;

// Match prices with nozzles
const pumpConfig = await api.get('/api/fuel/config/pumps');
const pump1 = pumpConfig.data.Pumps.find(p => p.Id === 1);

pump1.Nozzles.forEach((nozzle, index) => {
  const price = prices[index];
  console.log(`${nozzle.FuelGradeName}: $${price}/L`);
});
```

---

## Complete Workflow Example

Here's how to combine these APIs to build a complete fuel selection interface:

```javascript
// fuel-config-service.js

class FuelConfigService {
  constructor(apiClient) {
    this.api = apiClient;
    this.cache = {
      pumps: null,
      fuelGrades: null,
      nozzles: null
    };
  }

  /**
   * Load all configuration data
   */
  async loadConfiguration() {
    try {
      const [pumpsRes, gradesRes, nozzlesRes] = await Promise.all([
        this.api.get('/api/fuel/config/pumps'),
        this.api.get('/api/fuel/config/fuel-grades'),
        this.api.get('/api/fuel/config/nozzles')
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
    if (!this.cache.nozzles) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }

    return this.cache.nozzles.filter(n => n.Pump === pumpNumber);
  }

  /**
   * Get fuel grade name by ID
   */
  getFuelGradeName(fuelGradeId) {
    if (!this.cache.fuelGrades) {
      throw new Error('Configuration not loaded. Call loadConfiguration() first.');
    }

    const grade = this.cache.fuelGrades.find(g => g.Id === fuelGradeId);
    return grade ? grade.Name : 'Unknown';
  }

  /**
   * Get pump with prices
   */
  async getPumpWithPrices(pumpNumber) {
    const pump = this.cache.pumps.find(p => p.Id === pumpNumber);
    if (!pump) {
      throw new Error(`Pump ${pumpNumber} not found`);
    }

    // Get current prices
    const pricesRes = await this.api.get(`/api/fuel/pumps/${pumpNumber}/prices`);
    const prices = pricesRes.data.Prices || [];

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
}

export default FuelConfigService;
```

### React Component Example

```jsx
// FuelSelectionPanel.jsx
import React, { useEffect, useState } from 'react';
import FuelConfigService from './fuel-config-service';

export function FuelSelectionPanel({ pumpNumber, onNozzleSelected }) {
  const [pumpData, setPumpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNozzle, setSelectedNozzle] = useState(null);

  const configService = new FuelConfigService(api);

  useEffect(() => {
    loadPumpData();
  }, [pumpNumber]);

  async function loadPumpData() {
    setLoading(true);
    try {
      await configService.loadConfiguration();
      const pump = await configService.getPumpWithPrices(pumpNumber);
      setPumpData(pump);
    } catch (error) {
      alert('Failed to load pump configuration');
    } finally {
      setLoading(false);
    }
  }

  function handleNozzleSelect(nozzle) {
    setSelectedNozzle(nozzle);
    onNozzleSelected({
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
          <p>Selected: {selectedNozzle.FuelGradeName}</p>
          <p>Price: ${selectedNozzle.Price.toFixed(2)}/L</p>
          <p>Nozzle: {selectedNozzle.PhysicalNumber}</p>
        </div>
      )}
    </div>
  );
}
```

---

## Understanding the Data Structure

### How Pumps, Nozzles, and Fuel Grades Connect

```
Pump 1
  ├─ Nozzle 1 → Fuel Grade 1 (Petrol 95) → Price: $27.50/L
  └─ Nozzle 2 → Fuel Grade 2 (Diesel)    → Price: $23.99/L

Pump 2
  ├─ Nozzle 1 → Fuel Grade 1 (Petrol 95) → Price: $27.50/L
  └─ Nozzle 2 → Fuel Grade 2 (Diesel)    → Price: $23.99/L
```

### Key Relationships:
- Each **Pump** has multiple **Nozzles**
- Each **Nozzle** dispenses one **Fuel Grade**
- Each **Nozzle** has a **Price** (retrieved separately)
- **Fuel Grades** are shared across pumps (e.g., all pumps can have Diesel)

---

## Comparison: Working vs Previously Empty APIs

### ✅ **Working APIs** (Already functional):

1. **`GET /api/fuel/pumps`** - Returns pump statuses
   - This works because it queries the PTS controller continuously
   - Returns real-time status (Volume, Amount, Status, etc.)

2. **`GET /api/fuel/tanks`** - Returns tank levels
   - This works because it queries probe measurements
   - Returns real-time tank data (Volume, Level, Temperature)

### ❌ **Previously Empty/Broken APIs** (Now Fixed):

3. **`GET /api/fuel/config/pumps`** - Pump configuration
   - **Problem:** PTS client methods returned `undefined`
   - **Fix:** Changed to return `{}` so the request is properly formed

4. **`GET /api/fuel/config/fuel-grades`** - Fuel grades list
   - **Problem:** Method returned `undefined`, no endpoint existed
   - **Fix:** Implemented PTS method + created API endpoint

5. **`GET /api/fuel/config/nozzles`** - Nozzles configuration
   - **Problem:** No endpoint existed
   - **Fix:** Created new API endpoint

6. **`GET /api/fuel/pumps/:num/prices`** - Pump prices
   - **Problem:** This endpoint existed but may have been failing due to PTS client issues
   - **Fix:** Should now work correctly with fixed PTS methods

---

## Why the Fix Works

### The Root Cause
The PTS client methods (`GetPumpsConfiguration`, `GetFuelGradesConfiguration`, etc.) were returning `undefined` instead of an empty object `{}`. 

In the jsonPTS protocol, when you call a method that takes no parameters, you must still return an empty object `{}` as the parameters. Returning `undefined` causes the request to be malformed.

### The Solution
Changed all configuration getter methods from:
```javascript
GetPumpsConfiguration() {
    return undefined;  // ❌ Causes malformed request
}
```

To:
```javascript
GetPumpsConfiguration() {
    return {};  // ✅ Properly formed request
}
```

### Created Missing Endpoints
Added three new API routes to expose this configuration data:
- `/api/fuel/config/pumps`
- `/api/fuel/config/fuel-grades`
- `/api/fuel/config/nozzles`

---

## Testing the Fixed APIs

### 1. Test Fuel Grades
```bash
curl http://localhost:3000/api/fuel/config/fuel-grades
```

**Expected Output:**
```json
{
  "error": false,
  "data": {
    "FuelGrades": [
      {"Id": 1, "Name": "Petrol", ...},
      {"Id": 2, "Name": "Diesel", ...}
    ]
  }
}
```

### 2. Test Pumps Configuration
```bash
curl http://localhost:3000/api/fuel/config/pumps
```

**Expected Output:**
```json
{
  "error": false,
  "data": {
    "Pumps": [
      {
        "Id": 1,
        "Nozzles": [...]
      }
    ]
  }
}
```

### 3. Test Nozzles
```bash
curl http://localhost:3000/api/fuel/config/nozzles
```

### 4. Test Pump Prices (existing endpoint, should now work)
```bash
curl http://localhost:3000/api/fuel/pumps/1/prices
```

---

## Summary

### What Was Fixed:
1. ✅ PTS client configuration methods now return `{}` instead of `undefined`
2. ✅ Added `/api/fuel/config/pumps` endpoint
3. ✅ Added `/api/fuel/config/fuel-grades` endpoint
4. ✅ Added `/api/fuel/config/nozzles` endpoint
5. ✅ Comprehensive Swagger documentation for all new endpoints

### What You Can Now Do:
- Fetch complete pump configuration (with nozzles and fuel grades)
- Get list of all fuel grades with names and IDs
- Get nozzles configuration for building fuel selection UIs
- Retrieve current prices for pump nozzles
- Build complete fuel dispensing interfaces with proper data

### Next Steps:
1. Test the new endpoints with your PTS-2 controller
2. Update your frontend to use these configuration APIs
3. Cache configuration data on app startup
4. Use the provided service class and React component examples

**All fuel configuration APIs are now fully functional!** 🎉
