# Shifts & Pumping Workflow Guide

Complete operational guide for the Tactivo gas station management system covering the entire workflow from attendant login to shift close and reconciliation.

## Overview

The workflow follows this sequence:
1. 👤 **Attendant Login** - Employee identifies themselves
2. 🔓 **Shift Open** - Start working session
3. ⛽ **Pump Authorization** - Authorize pump for fueling
4. 💰 **Transaction Completion** - Record completed transaction
5. 📊 **Monitoring** - Track shift progress
6. 🔒 **Shift Close** - End session and reconcile

---

## 1. 👤 Attendant Identification & Login

Attendants can log in using three methods:

### Option A: Login by Employee Code

```http
POST /api/attendants/login
Content-Type: application/json

{
  "station_id": "550e8400-e29b-41d4-a716-446655440000",
  "employee_code": "EMP001"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "employee": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "first_name": "John",
      "last_name": "Doe",
      "employee_code": "EMP001",
      "active": true,
      "station_name": "Main Station"
    },
    "activeShift": {
      "id": "abc123...",
      "start_time": "2025-12-08T08:00:00Z",
      "status": "open"
    },
    "hasActiveShift": true
  }
}
```

### Option B: Login by Badge Tag (RFID)

```http
POST /api/attendants/login
Content-Type: application/json

{
  "station_id": "550e8400-e29b-41d4-a716-446655440000",
  "badge_tag": "BADGE123"
}
```

### Option C: Login by Card ID

```http
POST /api/attendants/login
Content-Type: application/json

{
  "station_id": "550e8400-e29b-41d4-a716-446655440000",
  "card_id": "CARD456"
}
```

---

## 2. 🔓 Open Shift

After login, if the attendant doesn't have an active shift, open a new one:

```http
POST /api/shifts/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "station_id": "550e8400-e29b-41d4-a716-446655440000",
  "employee_id": "123e4567-e89b-12d3-a456-426614174000",
  "opening_cash": 100.00
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "shift-uuid-here",
    "station_id": "550e8400-e29b-41d4-a716-446655440000",
    "employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "start_time": "2025-12-08T08:00:00Z",
    "status": "open",
    "opening_cash": 100.00,
    "created_at": "2025-12-08T08:00:00Z"
  }
}
```

---

## 3. ⛽ Pump Authorization & Operation

### Step 1: Authorize Pump with Attendant Linkage

When a customer arrives at the pump, the attendant authorizes it:

```http
POST /api/fuel/pumps/1/authorize
Authorization: Bearer {token}
Content-Type: application/json

{
  "nozzleNumber": 1,
  "presetType": "Amount",
  "presetDose": 50.00,
  "price": 1.65,
  "authorized_by_employee_id": "123e4567-e89b-12d3-a456-426614174000",
  "station_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**What Happens:**
- PTS controller receives pump authorization command
- Pending transaction is created linking pump to attendant
- Pump is activated for the customer

**Response:**
```json
{
  "error": false,
  "message": "Pump authorized successfully",
  "data": {}
}
```

### Step 2: Monitor Fueling Progress

Real-time updates are sent via WebSocket:

```javascript
// WebSocket connection at ws://your-server:3000/ws
{
  "type": "pumpStatus",
  "data": {
    "pump": 1,
    "status": {
      "Status": "Filling",
      "Transaction": 12345,
      "Nozzle": 1,
      "Volume": 15.5,
      "Amount": 25.58
    }
  }
}
```

### Step 3: Close Transaction

When fueling completes, record the transaction:

```http
POST /api/fuel/pumps/1/close-transaction
Authorization: Bearer {token}
Content-Type: application/json

{
  "pts_controller_id": "pts-controller-uuid"
}
```

**What Happens:**
- Retrieves final transaction data from PTS
- Links transaction to the attendant who authorized it
- Saves to fuel_transactions table
- Clears pending transaction

**Response:**
```json
{
  "error": false,
  "message": "Transaction completed and recorded",
  "data": {
    "id": "transaction-uuid",
    "station_id": "550e8400-e29b-41d4-a716-446655440000",
    "pump_number": 1,
    "nozzle": 1,
    "volume": 30.30,
    "amount": 50.00,
    "price": 1.65,
    "authorized_by_employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "transaction_datetime": "2025-12-08T08:15:30Z",
    "created_at": "2025-12-08T08:15:32Z"
  }
}
```

---

## 4. 📊 Monitoring Shift Progress

### Get Shift Summary

View shift summary with calculated totals at any time:

```http
GET /api/shifts/{shift-id}/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "shift-uuid",
    "employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "employee_name": "John Doe",
    "start_time": "2025-12-08T08:00:00Z",
    "status": "open",
    "summary": {
      "transaction_count": "12",
      "total_volume": "364.50",
      "total_amount": "601.43",
      "average_price": "1.65",
      "first_transaction": "2025-12-08T08:05:00Z",
      "last_transaction": "2025-12-08T14:32:00Z"
    }
  }
}
```

### Get All Shift Transactions

```http
GET /api/shifts/{shift-id}/transactions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "shift-uuid",
    "employee_name": "John Doe",
    "start_time": "2025-12-08T08:00:00Z",
    "transactions": [
      {
        "id": "txn-1",
        "pump_number": 1,
        "volume": 30.30,
        "amount": 50.00,
        "transaction_datetime": "2025-12-08T08:15:30Z"
      },
      ...
    ]
  }
}
```

### Get Transactions by Employee

```http
GET /api/fuel-transactions/by-employee/123e4567-e89b-12d3-a456-426614174000?start_date=2025-12-08&end_date=2025-12-08
Authorization: Bearer {token}
```

---

## 5. 🔒 Close Shift & Reconciliation

### Option A: Auto-Calculate Totals

Close shift with automatically calculated totals from transactions:

```http
POST /api/shifts/{shift-id}/reconcile
Authorization: Bearer {token}
Content-Type: application/json

{
  "closing_cash": 750.25,
  "cleared": true
}
```

**What Happens:**
- System queries all transactions during shift
- Calculates total volume, amount, transaction count
- Compares expected vs actual cash
- Marks shift as closed

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "shift-uuid",
    "employee_id": "123e4567-e89b-12d3-a456-426614174000",
    "start_time": "2025-12-08T08:00:00Z",
    "end_time": "2025-12-08T16:00:00Z",
    "status": "closed",
    "opening_cash": 100.00,
    "closing_cash": 750.25,
    "closing_totals": {
      "transaction_count": "15",
      "total_volume": "455.75",
      "total_amount": "752.00"
    },
    "cleared": true
  }
}
```

### Option B: Manual Close

Use the standard endpoint if you want to provide manual totals:

```http
POST /api/shifts/{shift-id}/end
Authorization: Bearer {token}
Content-Type: application/json

{
  "closing_totals": {
    "custom_field": "value"
  },
  "closing_cash": 750.25,
  "cleared": true
}
```

---

## 6. 📈 Reporting & Analytics

### Get Shift Report

```http
GET /api/shifts/{shift-id}
Authorization: Bearer {token}
```

### Get Daily Shifts for Station

```http
GET /api/shifts?station_id={station-id}&status=closed&limit=50
Authorization: Bearer {token}
```

### Get Employee Performance

```http
GET /api/fuel-transactions/by-employee/{employee-id}?start_date=2025-12-01&end_date=2025-12-31
Authorization: Bearer {token}
```

---

## Complete Workflow Example

Here's a real-world example showing the complete sequence:

### Scenario: Morning Shift

**08:00 - Attendant Arrives**
```bash
# 1. Attendant scans badge to login
curl -X POST http://localhost:3000/api/attendants/login \
  -H "Content-Type: application/json" \
  -d '{"station_id":"station-uuid","badge_tag":"BADGE001"}'

# 2. Open shift
curl -X POST http://localhost:3000/api/shifts/start \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"station_id":"station-uuid","employee_id":"emp-uuid","opening_cash":100}'
```

**08:15 - First Customer**
```bash
# 3. Authorize pump 1
curl -X POST http://localhost:3000/api/fuel/pumps/1/authorize \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nozzleNumber":1,
    "presetType":"Amount",
    "presetDose":50,
    "authorized_by_employee_id":"emp-uuid",
    "station_id":"station-uuid"
  }'

# Customer fuels...

# 4. Close transaction
curl -X POST http://localhost:3000/api/fuel/pumps/1/close-transaction \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"pts_controller_id":"pts-uuid"}'
```

**12:00 - Check Progress**
```bash
# 5. View shift summary
curl http://localhost:3000/api/shifts/{shift-id}/summary \
  -H "Authorization: Bearer {token}"
```

**16:00 - End of Shift**
```bash
# 6. Count cash and close shift
curl -X POST http://localhost:3000/api/shifts/{shift-id}/reconcile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"closing_cash":875.50,"cleared":true}'
```

---

## Key Features

### ✅ Attendant Accountability
- Every transaction is linked to the authorizing attendant
- Complete audit trail from authorization to completion
- Performance tracking per employee

### ✅ Automatic Reconciliation
- System calculates expected totals from transactions
- Compare with actual cash counts
- Identify discrepancies automatically

### ✅ Real-Time Monitoring
- WebSocket updates for pump status
- Live transaction tracking
- Immediate visibility into shift progress

### ✅ Flexible Shift Management
- Support for overlapping shifts
- Employee can only have one active shift at a time
- Shift handovers tracked

### ✅ Comprehensive Reporting
- Shift-level reports
- Employee performance reports
- Transaction history filtering
- Date range queries

---

## Data Flow Diagram

```
┌─────────────┐
│  Attendant  │
│   Arrives   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Login    │ ◄─── Employee Code, Badge, or Card
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Open Shift  │ ◄─── Creates employee_shifts record
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Authorize  │ ◄─── Customer arrives at pump
│    Pump     │
└──────┬──────┘
       │
       ├─── Creates pending_transaction (in-memory)
       ├─── Sends PumpAuthorize to PTS
       │
       ▼
┌─────────────┐
│   Fueling   │ ◄─── Real-time updates via WebSocket
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Close    │ ◄─── PumpCloseTransaction to PTS
│ Transaction │
└──────┬──────┘
       │
       ├─── Saves to fuel_transactions table
       ├─── Links to authorized_by_employee_id
       ├─── Clears pending_transaction
       │
       ▼
┌─────────────┐
│   Repeat    │ ◄─── Next customer...
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Close Shift  │ ◄─── Calculate totals, reconcile cash
└─────────────┘
```

---

## Error Handling

### No Active Shift
If attendant tries to authorize a pump without an open shift, the system will still allow it, but the transaction tracking is optimal when a shift is open.

### Pump Already Authorized
If a pump is authorized while it already has a pending transaction, the new authorization will replace the old one.

### Transaction Cleanup
Pending transactions older than 60 minutes are automatically cleared to prevent memory leaks.

### Network Failures
If the PTS controller is unreachable:
- Authorization will fail with appropriate error
- No pending transaction is created
- Retry mechanisms should be handled at client level

---

## Best Practices

1. **Always Open Shift First** - Ensures all transactions are properly tracked
2. **Close Transactions Promptly** - Record transactions immediately after fueling completes
3. **Regular Shift Summaries** - Check shift progress throughout the day
4. **Proper Cash Reconciliation** - Count cash carefully before closing shift
5 **Use Auto-Totals** - Let the system calculate expected totals from transactions
6. **Monitor WebSocket Updates** - Stay informed of pump status changes in real-time

---

## Troubleshooting

### Q: Transaction not showing up in shift summary
**A:** Ensure the transaction `authorized_by_employee_id` matches the shift's `employee_id` and the transaction datetime is within the shift period.

### Q: Cannot close shift
**A:** Check if there are any pending transactions for pumps. Close all active transactions first.

### Q: Totals don't match
**A:** Verify all transactions were properly closed. Check for manual transactions that may not have been recorded.

### Q: Attendant login fails
**A:** Verify:
- Employee exists and is active
- Employee code/badge/card matches database
- Employee is assigned to the correct station or company

---

## Security Considerations

- All endpoints require JWT authentication (except attendant login)
- Attendants can only view/modify their own shifts
- Superusers can access all shifts and transactions
- Audit logs track all shift opens/closes
- Transaction modifications are not allowed (immutable audit trail)

---

## Next Steps

After implementing this workflow:

1. **Test End-to-End** - Run through complete workflow manually
2. **Configure PTS Controller** - Ensure communication with hardware is working
3. **Train Staff** - Educate attendants on login and pump authorization process
4. **Monitor First Week** - Watch for any issues or discrepancies
5. **Review Reports** - Analyze shift data and performance metrics

---

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/attendants/login` | POST | Attendant login |
| `/api/shifts/start` | POST | Open shift |
| `/api/shifts/:id/summary` | GET | Shift summary |
| `/api/shifts/:id/transactions` | GET | Shift transactions |
| `/api/shifts/:id/reconcile` | POST | Close with auto-totals |
| `/api/fuel/pumps/:num/authorize` | POST | Authorize pump |
| `/api/fuel/pumps/:num/close-transaction` | POST | Record transaction |
| `/api/fuel-transactions/by-shift/:id` | GET | Filter by shift |
| `/api/fuel-transactions/by-employee/:id` | GET | Filter by employee |

---

For full API documentation, visit `/api-docs` on your running server.
