# Report API Integration Guide

This guide details the available reporting and analytics APIs for the Tactivo Server. These endpoints provide comprehensive data on sales, fuel transactions, inventory, and employee performance.

## Base URL
All requests should be made to: `http://localhost:3000/api/reports`

## Authentication
All endpoints require a valid JWT token in the Authorization header:
`Authorization: Bearer <your_token>`

---

## 1. Sales & Revenue Reports

### 1.1 Comprehensive Sales Report
Get a combined summary of fuel and shop sales, including payment method breakdowns and daily trends.

**Endpoint:** `GET /sales`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |
| `group_by` | String | No | Grouping: `day`, `shift`, or `employee` (default: `day`) |

**Response:**
```json
{
  "error": false,
  "data": {
    "summary": {
      "total_sales": 15000.00,
      "fuel_sales": 12000.00,
      "store_sales": 3000.00,
      "transactions": 150,
      "avg_transaction": 100.00
    },
    "payment_methods": {
      "cash": { "amount": 10000.00, "percentage": 66.67 },
      "card": { "amount": 5000.00, "percentage": 33.33 }
    },
    "daily_breakdown": [
      {
        "date": "2023-10-25",
        "fuel_sales": 12000.00,
        "store_sales": 3000.00,
        "total_sales": 15000.00,
        "transactions": 150
      }
    ],
    "by_product": [
      {
        "product_id": "uuid",
        "product_name": "Soda",
        "total_qty_sold": 50,
        "total_revenue": 100.00
      }
    ]
  }
}
```

### 1.2 Itemized Shop Sales
Get detailed list of individual shop transactions with line items.

**Endpoint:** `GET /sales/itemized`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |
| `limit` | Integer | No | Max records (default: 100) |
| `offset` | Integer | No | Pagination offset (default: 0) |

**Response:**
```json
{
  "error": false,
  "data": {
    "sales": [
      {
        "id": "uuid",
        "sale_time": "2023-10-25T14:30:00Z",
        "total_amount": 25.00,
        "employee_name": "John Doe",
        "items": [
          {
            "product_name": "Chips",
            "qty": 2,
            "unit_price": 5.00,
            "line_total": 10.00
          }
        ]
      }
    ],
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

### 1.3 Financial Report
Get high-level revenue breakdown by date.

**Endpoint:** `GET /financial`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |

**Response:**
```json
{
  "error": false,
  "data": {
    "daily_collections": [
      {
        "date": "2023-10-25",
        "fuel_revenue": 12000.00,
        "shop_revenue": 3000.00,
        "total_revenue": 15000.00
      }
    ],
    "summary": {
      "total_fuel_revenue": 12000.00,
      "total_shop_revenue": 3000.00,
      "total_revenue": 15000.00
    }
  }
}
```

---

## 2. Fuel Reports

### 2.1 Fuel Sales Summary
Get fuel sales grouped by pump and fuel grade.

**Endpoint:** `GET /fuel`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |
| `grade` | Integer | No | Filter by fuel grade ID |

**Response:**
```json
{
  "error": false,
  "data": {
    "by_pump": [
      {
        "pump_number": 1,
        "nozzle": 1,
        "transaction_count": 50,
        "total_volume": 1000.00,
        "total_amount": 2500.00,
        "avg_price": 2.50
      }
    ],
    "by_grade": [
      {
        "fuel_grade_id": 1,
        "transaction_count": 100,
        "total_volume": 2000.00,
        "total_amount": 5000.00
      }
    ]
  }
}
```

### 2.2 Itemized Fuel Transactions
Get detailed list of individual fuel transactions.

**Endpoint:** `GET /fuel/itemized`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |
| `limit` | Integer | No | Max records (default: 100) |
| `offset` | Integer | No | Pagination offset (default: 0) |

**Response:**
```json
{
  "error": false,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "pump_number": 1,
        "nozzle": 1,
        "transaction_datetime": "2023-10-25T10:00:00Z",
        "volume": 20.00,
        "amount": 50.00,
        "price": 2.50,
        "pump_name": "Pump 1",
        "authorized_by_name": "John Doe"
      }
    ],
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

### 2.3 Pump Readings Report
Get history of electronic and totalizer readings.

**Endpoint:** `GET /pump-readings`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |
| `pump_id` | Integer | No | Filter by pump |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |

---

## 3. Inventory & Stock

### 3.1 Inventory Report
Get current stock levels and value.

**Endpoint:** `GET /inventory`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `station_id` | UUID | No | Filter by station |

**Response:**
```json
{
  "error": false,
  "data": {
    "stock": [
      {
        "id": "uuid",
        "name": "Coca Cola",
        "sku": "123456",
        "current_stock": 100,
        "price": 2.50,
        "stock_value": 250.00
      }
    ],
    "summary": {
      "total_products": 1,
      "total_stock_value": 250.00,
      "low_stock_items": 0
    }
  }
}
```

---

## 4. Employee & Shift Reports

### 4.1 Employee Performance
Get general employee performance metrics.

**Endpoint:** `GET /employee`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `employee_id` | UUID | No | Filter by employee |
| `station_id` | UUID | No | Filter by station |
| `start_date` | Date (ISO) | No | Start of period |
| `end_date` | Date (ISO) | No | End of period |

### 4.2 Attendant Specific Report
Get detailed performance metrics for a specific attendant.

**Endpoint:** `GET /attendants/{employeeId}`

**Path Parameters:**
- `employeeId`: UUID (Required)

**Query Parameters:**
- `start_date`: Date (Required)
- `end_date`: Date (Required)

**Response:**
```json
{
  "error": false,
  "data": {
    "employee": { ... },
    "fuel_sales": { "total_volume": 500, "total_amount": 1250 },
    "shifts_worked": 5
  }
}
```

### 4.3 Detailed Shift Report
Get comprehensive data for a specific shift.

**Endpoint:** `GET /shifts/{shiftId}`

**Path Parameters:**
- `shiftId`: UUID (Required)

### 4.4 Shift Reconciliation
Get cash reconciliation (expected vs actual) for a shift.

**Endpoint:** `GET /shifts/{shiftId}/reconciliation`

**Path Parameters:**
- `shiftId`: UUID (Required)

### 4.5 Daily Shifts Summary
Get a summary of all shifts for a specific date.

**Endpoint:** `GET /daily-shifts`

**Query Parameters:**
- `station_id`: UUID (Required)
- `date`: YYYY-MM-DD (Required)

---

## 5. Other Reports

### 5.1 Credit Sales Report
Get report on sales made on credit/account.

**Endpoint:** `GET /credit-sales`

**Query Parameters:**
- `station_id`
- `debtor_id`
- `start_date`
- `end_date`
- `status` (paid/unpaid)
