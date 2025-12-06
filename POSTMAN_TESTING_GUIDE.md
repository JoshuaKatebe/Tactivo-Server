# Postman Testing Guide

## Quick Setup Checklist

✅ **Environment Variables:**
- `baseUrl` = `http://localhost:3000`
- `token` = (auto-saved after login)
- `ORG_ID`, `COMPANY_ID`, `STATION_ID` = (auto-saved)

✅ **Collection Authorization:**
- Type: `Bearer Token`
- Token: `{{token}}`

✅ **Login Request Tests Tab:**
```javascript
const json = pm.response.json();
if (!json.error && json.data && json.data.token) {
    pm.environment.set("token", json.data.token);
    console.log("✅ Token saved");
}
```

---

## Testing Workflow

### Phase 1: Setup (One-time)

1. **Login** → Token auto-saves
2. **Initialize Permissions** → `POST /api/permissions/initialize`
3. **Create Organization** → `POST /api/organizations` → Saves `ORG_ID`
4. **Create Company** → `POST /api/companies` → Saves `COMPANY_ID`
5. **Create Station** → `POST /api/stations` → Saves `STATION_ID`
6. **Create PTS Controller** → `POST /api/pts-controllers`
7. **Create Pumps** → `POST /api/pumps` (with nozzles)

### Phase 2: Users & Employees

8. **Create Admin User** → `POST /api/users` → Saves `ADMIN_USER_ID`
9. **Create Employee** → `POST /api/employees` (link to user)
10. **Create Role** → `POST /api/roles` (with permissions)
11. **Assign Role** → `POST /api/roles/:roleId/assign/:employeeId`

### Phase 3: Operations

12. **Start Shift** → `POST /api/shifts/start`
13. **Create Shop Product** → `POST /api/shop/products`
14. **Create Sale** → `POST /api/shop/sales`
15. **Create Handover** → `POST /api/handovers`

### Phase 4: Reports

16. **Sales Report** → `GET /api/reports/sales?station_id={{STATION_ID}}&start_date=2025-12-01&end_date=2025-12-03`
17. **Fuel Report** → `GET /api/reports/fuel?station_id={{STATION_ID}}`
18. **Financial Report** → `GET /api/reports/financial?station_id={{STATION_ID}}`

---

## Key Endpoints to Test

### Reports

**Sales Report:**
```
GET {{baseUrl}}/api/reports/sales?station_id={{STATION_ID}}&start_date=2025-12-01&end_date=2025-12-03&group_by=day
```

**Fuel Report:**
```
GET {{baseUrl}}/api/reports/fuel?station_id={{STATION_ID}}&start_date=2025-12-01&end_date=2025-12-03
```

**Employee Performance:**
```
GET {{baseUrl}}/api/reports/employee?station_id={{STATION_ID}}&start_date=2025-12-01&end_date=2025-12-03
```

### Handovers

**Create Handover:**
```json
POST {{baseUrl}}/api/handovers
{
  "station_id": "{{STATION_ID}}",
  "employee_id": "{{EMPLOYEE_ID}}",
  "cashier_employee_id": "{{CASHIER_ID}}",
  "amount_expected": 5000.00,
  "amount_cashed": 5020.50,
  "notes": "Shift handover"
}
```

### PTS Controllers

**Create PTS Controller:**
```json
POST {{baseUrl}}/api/pts-controllers
{
  "station_id": "{{STATION_ID}}",
  "identifier": "PTS-001",
  "hostname": "192.168.1.117",
  "port": 443,
  "http_auth": {
    "username": "admin",
    "password": "admin"
  }
}
```

### Pumps

**Create Pump with Nozzles:**
```json
POST {{baseUrl}}/api/pumps
{
  "pts_id": "{{PTS_CONTROLLER_ID}}",
  "pump_number": 1,
  "name": "Pump 1",
  "active": true,
  "nozzles": [
    { "nozzle_number": 1, "fuel_grade_id": 1 },
    { "nozzle_number": 2, "fuel_grade_id": 2 }
  ]
}
```

### Station Shifts

**Start PTS Shift:**
```json
POST {{baseUrl}}/api/station-shifts/start
{
  "station_id": "{{STATION_ID}}",
  "pts_shift_number": 12345,
  "opened_by_employee_id": "{{EMPLOYEE_ID}}"
}
```

### Stock Management

**Stock In (Restock):**
```json
POST {{baseUrl}}/api/stock/stock-in
{
  "station_id": "{{STATION_ID}}",
  "items": [
    { "product_id": "{{PRODUCT_ID}}", "quantity": 50 }
  ],
  "receipt_number": "REC-001",
  "notes": "Restock delivery"
}
```

**Get Low Stock:**
```
GET {{baseUrl}}/api/stock/low-stock?station_id={{STATION_ID}}&threshold=10
```

---

## Testing Employee Login

1. **Create User:**
```json
POST {{baseUrl}}/api/users
{
  "username": "cashier1",
  "password": "Cashier123!",
  "email": "cashier1@example.com",
  "is_superuser": false
}
```

2. **Create Employee (linked to user):**
```json
POST {{baseUrl}}/api/employees
{
  "user_id": "{{USER_ID}}",
  "station_id": "{{STATION_ID}}",
  "first_name": "Jane",
  "last_name": "Cashier",
  "badge_tag": "CASH001"
}
```

3. **Login as Employee:**
```json
POST {{baseUrl}}/api/auth/login
{
  "username": "cashier1",
  "password": "Cashier123!"
}
```

**Response includes:**
```json
{
  "token": "...",
  "user": { ... },
  "employee": {
    "id": "...",
    "first_name": "Jane",
    "roles": [ ... ],
    "permissions": [ "fuel.authorize", "shift.start", ... ]
  }
}
```

---

## Common Test Scenarios

### Scenario 1: Complete Sale Flow
1. Start shift
2. Create shop sale
3. End shift
4. Create handover
5. View reports

### Scenario 2: Fuel Transaction Flow
1. Authorize pump
2. Transaction completes (via PTS)
3. View fuel transaction
4. View fuel report

### Scenario 3: Stock Management
1. Create products
2. Stock in (restock)
3. Create sale (reduces stock)
4. Check low stock
5. View inventory report

---

## Error Testing

Test error handling:
- Invalid IDs (404)
- Missing required fields (400)
- Unauthorized access (401)
- Permission denied (403)
- Invalid data formats (400)

---

## Tips

1. **Use Environment Variables** - Saves IDs automatically
2. **Test Scripts** - Auto-save IDs in Tests tab
3. **Collection Variables** - Share common values
4. **Folders** - Organize requests by module
5. **Examples** - Save example responses

---

All endpoints are ready for testing! 🚀

