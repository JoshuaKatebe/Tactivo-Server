# Frontend API Integration Guide & Reference
## Tactivo Fuel Management System

**Server Base URL:** `https://tactivo-server-1.onrender.com/api`
**WebSocket URL:** `wss://tactivo-server-1.onrender.com/ws`

This guide provides a comprehensive reference for frontend developers integrating with the Tactivo backend. It includes workflow guides, detailed API references, and data type definitions suitable for AI code generation contexts.

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
    - [Organization & Station Management](#organization--station-management)
    - [Staff Management](#staff-management)
    - [Fuel Operations](#fuel-operations)
    - [Shop & Stock](#shop--stock)
    - [Reports & Analytics](#reports--analytics)
    - [Finance & Handovers](#finance--handovers)
    - [System Configuration](#system-configuration)

---

## Authentication & Security

Most endpoints require a valid JWT token in the `Authorization` header.

**Header Format:**
```http
Authorization: Bearer <your_jwt_token>
```

**Obtaining a Token:**
1.  **Global Users (Admins/Managers):** Use `POST /auth/login` with username/password.
2.  **Attendants (POS):** Use `POST /attendants/login` with an employee code and station ID.

---

## Data Types (TypeScript Interfaces)

Use these definitions for type safety and AI context.

```typescript
// --- Core Entities ---

interface Organization {
  id: string; // UUID
  name: string;
  created_at: string; // ISO Date
}

interface Station {
  id: string;
  company_id: string;
  name: string;
  code: string;
  address?: string;
  timezone: string;
}

interface Employee {
  id: string;
  company_id: string;
  station_id?: string;
  user_id?: string; // Linked global user
  first_name: string;
  last_name: string;
  employee_code: string; // Login code
  active: boolean;
  role?: string;
}

// --- Operations ---

interface Shift {
  id: string;
  station_id: string;
  employee_id: string;
  start_time: string;
  end_time?: string; // null if active
  status: 'open' | 'closed';
  opening_cash: number;
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

interface ShopProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock_qty: number;
}

// --- API Responses ---

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
    *   Call `POST /attendants/login` with `{ employee_code: "1234", station_id: "..." }`.
    *   Store the returned `token` and `employee` object.

2.  **Check Shift:**
    *   Call `GET /shifts/open?employee_id={id}`.
    *   If `null`, prompt to start shift.

3.  **Start Shift:**
    *   Call `POST /shifts/start` with `{ employee_id: "...", station_id: "...", opening_cash: 100 }`.

### Fuel Dispensing (Real & Demo)

**Standard Flow:**
1.  **Select Pump:** User taps a pump icon.
2.  **Get Configuration:** Call `GET /fuel/pumps/{id}` to see status (Idle/Filling) and nozzles.
3.  **Authorize:**
    *   Call `POST /fuel/pumps/{id}/authorize` with `{ nozzleNumber: 1, presetType: "Amount", presetDose: 50 }`.
    *   **Important:** Include `authorized_by_employee_id` to link the sale to the attendant.
4.  **Monitor:** Listen to WebSocket `pumpStatus` events to show progress bar.
5.  **Completion:** Backend records transaction automatically. Frontend receives `transaction` event via WebSocket.

**Demo/Training Mode:**
Use this for testing or "Training Mode" in the app.
*   Use `POST /demo/fuel/pumps/{id}/authorize` instead of the standard fuel API.
*   **Must include** `employee_id` and `station_id` in the body so the system tracks it like a real sale.
*   The system simulates the pumping physics and triggers the same WebSocket events.

### Handover Process

**Business Rule:** Attendants must clear their cash after 10 transactions.

**Attendant View:**
1.  Periodically call `GET /handovers?employee_id={id}&status=pending`.
2.  If a result is found, block new sales and show "Please visit Cashier".

**Cashier View:**
1.  Call `GET /handovers/pending?station_id={id}` to see all pending requests.
2.  Select a handover to view details (`GET /handovers/{id}/transactions`).
3.  Count physical cash from attendant.
4.  Call `POST /handovers/{id}/clear` with `{ amount_cashed: 500, payment_methods: { cash: 500 } }`.

### Shop Sales

1.  **Scan/Select Product:**
    *   Call `GET /shop/products` to list inventory.
2.  **Create Sale:**
    *   Call `POST /shop/sales` with items:
    ```json
    {
      "station_id": "...",
      "employee_id": "...",
      "items": [
        { "product_id": "...", "qty": 2, "unit_price": 1.50 }
      ],
      "payment_method": "cash"
    }
    ```

---

## Real-time WebSocket API

Connect to `wss://tactivo-server-1.onrender.com/ws`.

**Message Structure:**
```json
{
  "type": "pumpStatus", // or 'transaction', 'tankStatus'
  "data": { ... }
}
```

**Events:**
*   `pumpStatus`: Real-time updates (Volume, Amount, Status: 'Filling'|'Idle').
*   `transaction`: Sent when a transaction finalizes.
*   `tankStatus`: Fuel tank level updates.

---

## Full API Reference

### Organization & Station Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/organizations` | List all organizations |
| `GET` | `/organizations/:id` | Get organization details |
| `GET` | `/companies` | List companies (Client entities) |
| `GET` | `/stations` | List stations |
| `GET` | `/stations/:id` | Get station configuration |

### Staff Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Administrative login |
| `POST` | `/attendants/login` | POS/Attendant login (requires code) |
| `GET` | `/employees` | List employees (Filter by station/active) |
| `GET` | `/roles` | List RBAC roles |
| `GET` | `/permissions` | List available permissions |
| `GET` | `/shifts` | History of employee shifts |
| `GET` | `/shifts/open` | Check for active shift |
| `POST` | `/shifts/start` | Clock in |
| `POST` | `/shifts/:id/end` | Clock out |

### Fuel Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/fuel/pumps` | Status of all pumps |
| `GET` | `/fuel/pumps/:id` | Status of specific pump |
| `POST` | `/fuel/pumps/:id/authorize` | Authorize pump for fueling |
| `POST` | `/fuel/pumps/:id/stop` | Stop pumping |
| `POST` | `/fuel/pumps/:id/emergency-stop`| Immediate Halt |
| `GET` | `/fuel/tanks` | Tank levels |
| `GET` | `/fuel-transactions` | Transaction history |
| `POST` | `/demo/fuel/pumps/:id/authorize`| **Demo:** Simulate authorization |

### Shop & Stock
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/shop/products` | Product catalog & stock |
| `POST` | `/shop/sales` | Record retail sale |
| `GET` | `/shop/sales` | Sales history |
| `GET` | `/stock/low-stock` | Low stock alerts |
| `POST` | `/stock/stock-in` | Receive inventory |
| `POST` | `/stock/adjust` | Manual inventory adjustment |

### Reports & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/reports/sales` | Aggregated sales (by shift/day/month) |
| `GET` | `/reports/fuel` | Fuel-specific volume reports |
| `GET` | `/reports/inventory` | Stock movement reports |
| `GET` | `/reports/employee` | Attendant performance metrics |
| `GET` | `/reports/financial` | Financial reconciliation |

### Finance & Handovers
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/handovers` | List handovers |
| `GET` | `/handovers/pending` | **Cashier:** View actionable handovers |
| `GET` | `/handovers/:id/transactions`| View transactions in a handover |
| `POST` | `/handovers/:id/clear` | **Cashier:** Clear/Pay out handover |
| `GET` | `/payments` | Payment ledger |

### System Configuration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/pts-controllers` | List PTS hardware controllers |
| `GET` | `/pumps` | Configure logical pumps |
| `GET` | `/nozzles` | Configure nozzles & grades |
| `GET` | `/health` | Server status check |

---

## Error Handling

The API returns standard HTTP status codes.

*   `200 OK`: Success
*   `400 Bad Request`: Invalid input (check parameters).
*   `401 Unauthorized`: Missing or invalid token.
*   `403 Forbidden`: Valid token but insufficient permissions.
*   `404 Not Found`: Resource does not exist.
*   `500 Internal Server Error`: Server-side issue.

**Error Body Format:**
```json
{
  "error": true,
  "message": "Descriptive error message"
}
```
