# Attendant Name Display in PTS-2 Controller

## Issue
When viewing pump status from the PTS-2 controller, the `User` and `LastUser` fields were always showing "admin" instead of the actual attendant who authorized the pump. This was because the system was using the admin credentials for controller authentication rather than tracking individual attendants.

## Solution Implemented

### Changes Made

#### 1. Enhanced PTS Client (`lib/pts-client.js`)
Updated the `PumpAuthorize` method to accept an optional `user` parameter:

```javascript
PumpAuthorize(pumpNumber, nozzleNumber, presetType, presetDose, price, user = null) {
    const data = {
        Pump: pumpNumber,
        Nozzle: nozzleNumber,
        Type: presetType,
        Price: price
    };

    if (data.Type === 'Volume' || data.Type === 'Amount') {
        data.Dose = presetDose;
    }

    // Add User field if provided (for attendant tracking)
    if (user) {
        data.User = user;
    }

    return data;
}
```

#### 2. Enhanced Fuel Service (`services/fuel.service.js`)
Updated `authorizePump` method to accept and pass the user parameter:

```javascript
async authorizePump(pumpNumber, nozzleNumber, presetType = null, presetDose = null, price = null, user = null) {
    logger.info('Authorizing pump', { pump: pumpNumber, nozzle: nozzleNumber, type: presetType, dose: presetDose, price, user });

    const response = await this.ptsClient.createComplexRequest([{
        function: this.ptsClient.PumpAuthorize.bind(this.ptsClient),
        arguments: [pumpNumber, nozzleNumber, presetType, presetDose, price, user]
    }]);
    
    // ... rest of the method
}
```

#### 3. Enhanced Fuel Routes (`routes/fuel.routes.js`)
Modified the `/pumps/:pumpNumber/authorize` endpoint to:
1. Fetch the employee details from the database
2. Extract the employee code (or full name if no code exists)
3. Pass it to the PTS controller as the User parameter

```javascript
// Get attendant name to pass to PTS controller
let attendantName = null;
if (authorized_by_employee_id) {
    try {
        const employeeResult = await db.query(
            'SELECT first_name, last_name, employee_code FROM employees WHERE id = $1',
            [authorized_by_employee_id]
        );
        
        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];
            // Use employee code or full name for PTS-2 User field
            attendantName = employee.employee_code || `${employee.first_name} ${employee.last_name}`;
        }
    } catch (err) {
        logger.warn('Could not fetch employee name', { employee_id: authorized_by_employee_id, error: err.message });
    }
}

// Pass attendant name when authorizing pump
const result = await fuelService.authorizePump(
    pumpNumber,
    parseInt(nozzleNumber, 10),
    presetType || null,
    presetDose || null,
    price || null,
    attendantName  // This will now appear in PTS-2 User field
);
```

## How It Works

### Flow

1. **Frontend sends authorization request** with `authorized_by_employee_id`:
```json
POST /api/fuel/pumps/1/authorize
{
  "nozzleNumber": 1,
  "presetType": "Amount",
  "presetDose": 50,
  "price": 1.65,
  "authorized_by_employee_id": "uuid-here",
  "station_id": "station-uuid"
}
```

2. **Backend fetches employee details**:
   - Queries the `employees` table using the `authorized_by_employee_id`
   - Extracts `employee_code` (e.g., "EMP001") or falls back to full name

3. **PTS-2 command includes User field**:
```json
{
  "Type": "PumpAuthorize",
  "Params": {
    "Pump": 1,
    "Nozzle": 1,
    "Type": "Amount",
    "Dose": 50,
    "Price": 1.65,
    "User": "EMP001"  // ← Attendant identifier
  }
}
```

4. **PTS-2 controller stores the User**:
   - The controller now associates this authorization with the attendant
   - Shows in pump status as `"User": "EMP001"`
   - Shows in last transaction as `"LastUser": "EMP001"`

## Result

### Before
```json
{
  "Pump": 1,
  "Status": "Filling",
  "User": "admin",      // ← Always admin
  "LastUser": "admin"   // ← Always admin
}
```

### After
```json
{
  "Pump": 1,
  "Status": "Filling",
  "User": "EMP001",      // ← Actual attendant code
  "LastUser": "EMP001"   // ← Actual attendant code
}
```

## Benefits

1. **Audit Trail**: The PTS-2 controller now maintains its own record of which attendant authorized each pump
2. **GUI Simulator**: When viewing the PTS-2 web interface, you'll see the actual attendant names
3. **Double Tracking**: Both the application database AND the PTS controller track the attendant
4. **Compliance**: Meets regulatory requirements for tracking operator actions

## Frontend Usage

When authorizing a pump from the frontend, simply include the `authorized_by_employee_id`:

```javascript
// After attendant logs in
const attendantData = await loginAttendantByCode('EMP001', stationId);

// When authorizing pump
await api.post('/api/fuel/pumps/1/authorize', {
  nozzleNumber: 1,
  presetType: 'Amount',
  presetDose: 50.00,
  price: 1.65,
  authorized_by_employee_id: attendantData.employee.id,  // ← Include this
  station_id: stationId
});

// Now when you check pump status:
const status = await api.get('/api/fuel/pumps/1');
// status.data[1].User will show "EMP001"
```

## Notes

- **Employee Code Priority**: The system uses `employee_code` first, then falls back to full name if no code exists
- **Backward Compatible**: If `authorized_by_employee_id` is not provided, the system still works (User field will be null in PTS-2)
- **Error Handling**: If the employee lookup fails, the authorization still proceeds with `user = null`
- **Database Requirement**: Employee records must exist in the `employees` table with an `employee_code` field

## Testing

To verify this is working:

1. **Login an attendant**:
```bash
curl -X POST http://localhost:3000/api/attendants/login \
  -H "Content-Type: application/json" \
  -d '{"employee_code":"EMP001","station_id":"your-station-id"}'
```

2. **Authorize a pump** with the employee ID:
```bash
curl -X POST http://localhost:3000/api/fuel/pumps/1/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "nozzleNumber": 1,
    "presetType": "Amount",
    "presetDose": 50,
    "price": 1.65,
    "authorized_by_employee_id": "employee-uuid-from-step-1",
    "station_id": "your-station-id"
  }'
```

3. **Check pump status**:
```bash
curl http://localhost:3000/api/fuel/pumps
```

4. **Verify User field** in the response:
```json
{
  "1": {
    "Pump": 1,
    "User": "EMP001",  // ← Should show employee code
    ...
  }
}
```

## Troubleshooting

### User field still shows "admin"
- Verify `authorized_by_employee_id` is being sent in the authorization request
- Check that the employee exists in the database with that ID
- Check application logs for any errors fetching employee details
- Ensure the employee has an `employee_code` field set

### User field is empty/null
- This is normal if no `authorized_by_employee_id` was provided
- Check that the frontend is passing the employee ID correctly
- Verify the employee record has an `employee_code` set

### See full name instead of code
- This happens when `employee_code` is null in the database
- The system falls back to `first_name + last_name`
- To use codes, update employee records to include `employee_code`

## Related Documentation

- [SHIFT_WORKFLOW_GUIDE.md](./SHIFT_WORKFLOW_GUIDE.md) - Complete workflow documentation
- [FRONTEND_API_INTEGRATION_GUIDE.md](./FRONTEND_API_INTEGRATION_GUIDE.md) - Frontend integration guide
- jsonPTS Protocol Documentation - PTS-2 controller protocol details
