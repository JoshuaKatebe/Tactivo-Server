# Frontend API Integration Guide & Reference
## Tactivo Fuel Management System

**Server Base URL:** `https://tactivo-server-1.onrender.com/api`
**WebSocket URL:** `wss://tactivo-server-1.onrender.com/ws`

This guide provides a comprehensive reference for frontend developers integrating with the Tactivo backend. It includes workflow guides, detailed API references with request/response examples, and data type definitions suitable for AI code generation contexts.

---

## Table of Contents

1. [Authentication & Security](#authentication--security)
2. [Data Types (TypeScript Interfaces)](#data-types-typescript-interfaces)
3. [Core Workflows](#core-workflows)
    - [Attendant Login & Shift Start](#attendant-login--shift-start)
    - [Fuel Dispensing (Real & Demo)](#fuel-dispensing-real--demo)
    - [Handover Process](#handover-process)
    - [Shop Sales](#shop-sales)
4. [Real-time WebSocket API](#real-time-websocket-api)
5. [Full API Reference](#full-api-reference)
    - [Staff Management](#staff-management)
    - [Fuel Operations](#fuel-operations)
    - [Finance & Handovers](#finance--handovers)
    - [Reports & Analytics](#reports--analytics)

---

## Authentication & Security

Most endpoints require a valid JWT token in the `Authorization` header.

**Header Format:**
```http
Authorization: Bearer <your_jwt_token>
```

---

## Data Types (TypeScript Interfaces)

Use these definitions for type safety and AI context.

```typescript
// --- Core Entities ---

interface Employee {
  id: string; // UUID
  company_id: string;
  station_id?: string;
  first_name: string;
  last_name: string;
  employee_code: string; // Login code
  active: boolean;
}

interface FuelTransaction {
  id: string;
  station_id: string;
  pump_number: number;
  nozzle: number;
  volume: number;
  amount: number; // Total price
  price: number; // Price per unit
  transaction_datetime: string;
  authorized_by_employee_id?: string;
  synced: boolean;
}

interface Handover {
  id: string;
  station_id: string;
  employee_id: string;
  amount_expected: number;
  amount_cashed: number;
  difference: number;
  status: 'pending' | 'cleared';
  handover_time: string;
  transactions?: FuelTransaction[];
}

interface ApiResponse<T> {
  error: boolean;
  message?: string;
  data: T;
}
```

---

## Core Workflows

### Attendant Login & Shift Start

1.  **Login:**
    *   Call `POST /attendants/login` with employee code.
2.  **Check Shift:**
    *   Call `GET /shifts/open?employee_id={id}`.
3.  **Start Shift:**
    *   Call `POST /shifts/start` if no shift is open.

### Fuel Dispensing (Real & Demo)

1.  **Select Pump:** User taps a pump icon.
2.  **Authorize:** Call `POST /fuel/pumps/{id}/authorize`.
    *   **Demo Mode:** Use `POST /demo/fuel/pumps/{id}/authorize`.
3.  **Monitor:** Listen to WebSocket `pumpStatus` events.
4.  **Completion:** Backend automatically records transaction.

### Handover Process

**Business Rule:** Attendants must clear their cash after 10 transactions.

**Attendant View:**
1.  Periodically call `GET /handovers?employee_id={id}&status=pending`.
2.  If result found, prompt user to visit cashier.

**Cashier View:**
1.  Call `GET /handovers/pending?station_id={id}`.
2.  Select handover -> `GET /handovers/{id}/transactions`.
3.  Clear -> `POST /handovers/{id}/clear`.

---

## Full API Reference

### Staff Management

#### Attendant Login
**POST** `/attendants/login`

Used by POS terminals for quick attendant access.

**Request Body:**
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
    "token": "eyJhbGciOiJIUzI1NiIsInR...",
    "employee": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "first_name": "John",
      "last_name": "Doe",
      "role": "Attendant"
    }
  }
}
```

#### List Employees
**GET** `/employees`

**Query Parameters:**
*   `station_id` (optional): Filter by station UUID.
*   `active` (optional): `true` or `false`.

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "first_name": "Jane",
      "last_name": "Smith",
      "employee_code": "EMP002",
      "active": true
    }
  ]
}
```

---

### Fuel Operations

#### Authorize Pump (Real)
**POST** `/fuel/pumps/:id/authorize`

**Request Body:**
```json
{
  "nozzleNumber": 1,
  "presetType": "Amount",  // or "Volume"
  "presetDose": 50.00,
  "price": 1.65,
  "authorized_by_employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "station_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "error": false,
  "message": "Pump authorized successfully"
}
```

#### Authorize Pump (Demo)
**POST** `/demo/fuel/pumps/:id/authorize`

Simulates a pump transaction. **Crucial:** Include `employee_id` and `station_id` to link data.

**Request Body:**
```json
{
  "nozzle": 1,
  "type": "Amount",
  "dose": 20.00,
  "price": 1.65,
  "employee_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "station_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "success": true,
    "message": "Pump Authorized (Demo)"
  }
}
```

---

### Finance & Handovers

#### Get Pending Handovers (Cashier)
**GET** `/handovers/pending`

**Query Parameters:**
*   `station_id`: UUID (Required usually)
*   `limit`: Number of records (default 100)

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "employee_name": "John Doe",
      "station_name": "Main Station",
      "transaction_count": 10,
      "total_amount": 500.00,
      "amount_expected": 500.00,
      "status": "pending",
      "handover_time": "2023-10-27T10:00:00Z"
    }
  ]
}
```

#### Clear Handover
**POST** `/handovers/:id/clear`

**Request Body:**
```json
{
  "cashier_employee_id": "99999999-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "amount_cashed": 500.00,
  "payment_methods": {
    "cash": 450.00,
    "pos": 50.00
  },
  "notes": "Shift close"
}
```

**Response:**
```json
{
  "error": false,
  "message": "Handover cleared successfully",
  "data": {
    "id": "a1b2c3d4-...",
    "status": "cleared",
    "difference": 0.00
  }
}
```

---

### Reports & Analytics

#### Sales Report
**GET** `/reports/sales`

**Query Parameters:**
*   `station_id`: UUID
*   `start_date`: ISO Date (e.g., `2023-10-01`)
*   `end_date`: ISO Date
*   `group_by`: `day`, `shift`, or `employee`

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "date": "2023-10-01T00:00:00Z",
      "total_volume": 1500.50,
      "total_amount": 2475.82,
      "transaction_count": 45
    }
  ]
}
```

#### Attendant Performance
**GET** `/reports/attendants/:id`

**Query Parameters:**
*   `start_date`: ISO Date
*   `end_date`: ISO Date

**Response:**
```json
{
  "error": false,
  "data": {
    "employee": { "first_name": "John", "last_name": "Doe" },
    "transactions": {
      "total_sales": 5000.00,
      "total_volume": 3000.00,
      "total_transactions": 100
    },
    "shifts": {
      "total_shifts": 5,
      "avg_shift_hours": 8.5
    }
  }
}
```

---

## Real-time WebSocket API

**URL:** `wss://tactivo-server-1.onrender.com/ws`

**Message Format (Server -> Client):**

**Pump Status:**
```json
{
  "type": "pumpStatus",
  "data": {
    "pump": 1,
    "status": {
      "Status": "Filling", // Idle, Authorized, Filling, EndOfTransaction
      "Volume": 10.5,
      "Amount": 17.32,
      "Price": 1.65,
      "Nozzle": 1
    }
  }
}
```

**Transaction Complete:**
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
