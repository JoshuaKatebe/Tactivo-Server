# Role-Based Access Control (RBAC) Guide

## Overview

The system now supports full RBAC with:
- **Users** - Login accounts
- **Employees** - Can be linked to users (for login)
- **Roles** - Named roles (Admin, Cashier, Supervisor, etc.)
- **Permissions** - Granular permissions (fuel.authorize, shift.start, etc.)

## How It Works

### 1. Employee Login

**Yes, employees can login!** Here's how:

1. Create a **User** account (username/password)
2. Create an **Employee** record
3. Link them: Set `user_id` on the employee to the user's ID
4. When the user logs in, they automatically get employee info, roles, and permissions

### 2. Default Permissions

The system includes these default permissions:
- `fuel.authorize` - Authorize fuel pumps
- `fuel.stop` - Stop fuel pumps
- `fuel.prices.view` - View fuel prices
- `fuel.prices.update` - Update fuel prices
- `shift.start` - Start shift
- `shift.end` - End shift
- `shift.view` - View shifts
- `shop.sale.create` - Create shop sales
- `shop.sale.view` - View shop sales
- `shop.product.manage` - Manage shop products
- `reports.view` - View reports
- `employees.manage` - Manage employees
- `config.view` - View configuration
- `config.update` - Update configuration
- `cash.reconcile` - Reconcile cash
- `handover.create` - Create handovers

### 3. Setting Up RBAC

#### Step 1: Initialize Default Permissions

```bash
POST /api/permissions/initialize
```

This creates all default permissions in the database.

#### Step 2: Create Roles

Create roles like "Admin", "Cashier", "Supervisor":

```json
POST /api/roles
{
  "company_id": "{{COMPANY_ID}}",
  "name": "Cashier",
  "description": "Cashier role with basic permissions",
  "permission_ids": [
    "permission_id_1",
    "permission_id_2"
  ]
}
```

#### Step 3: Assign Roles to Employees

```bash
POST /api/roles/:roleId/assign/:employeeId
```

#### Step 4: Link Employee to User (for login)

When creating an employee, include the `user_id`:

```json
POST /api/employees
{
  "user_id": "{{USER_ID}}",
  "company_id": "{{COMPANY_ID}}",
  "station_id": "{{STATION_ID}}",
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

## Login Response

When an employee logs in (user linked to employee), the response includes:

```json
{
  "error": false,
  "data": {
    "token": "...",
    "user": { ... },
    "employee": {
      "id": "...",
      "first_name": "John",
      "last_name": "Doe",
      "roles": [
        { "id": "...", "name": "Cashier", ... }
      ],
      "permissions": [
        "fuel.authorize",
        "shift.start",
        "shop.sale.create"
      ]
    }
  }
}
```

## Using Permissions in Routes

### Protect Routes with Permissions

```javascript
const { authenticate, requirePermission } = require('../middleware/auth');

// Require specific permission
router.post('/authorize', authenticate, requirePermission('fuel.authorize'), ...);

// Require any of multiple permissions
const { requireAnyPermission } = require('../middleware/auth');
router.get('/reports', authenticate, requireAnyPermission('reports.view', 'config.view'), ...);
```

### Check Permissions in Code

```javascript
// In your route handler
if (req.employee && req.employee.permissions.includes('fuel.authorize')) {
    // User has permission
} else {
    // User doesn't have permission
}
```

## Example: Setting Up a Cashier

1. **Create User:**
```json
POST /api/users
{
  "username": "cashier1",
  "password": "Cashier123!",
  "email": "cashier1@example.com",
  "is_superuser": false
}
```

2. **Create Employee:**
```json
POST /api/employees
{
  "user_id": "{{USER_ID}}",
  "company_id": "{{COMPANY_ID}}",
  "station_id": "{{STATION_ID}}",
  "first_name": "Jane",
  "last_name": "Cashier",
  "badge_tag": "CASH001",
  "employee_code": "C001"
}
```

3. **Create Cashier Role:**
```json
POST /api/roles
{
  "company_id": "{{COMPANY_ID}}",
  "name": "Cashier",
  "description": "Cashier with basic permissions",
  "permission_ids": [
    // Get permission IDs from GET /api/permissions
  ]
}
```

4. **Assign Role:**
```bash
POST /api/roles/{{ROLE_ID}}/assign/{{EMPLOYEE_ID}}
```

5. **Login:**
```json
POST /api/auth/login
{
  "username": "cashier1",
  "password": "Cashier123!"
}
```

Response will include employee info with roles and permissions!

## Superuser Bypass

Superusers (`is_superuser: true`) automatically bypass all permission checks. They have access to everything.

## API Endpoints

### Permissions
- `GET /api/permissions` - List all permissions
- `POST /api/permissions/initialize` - Initialize defaults (superuser only)
- `POST /api/permissions` - Create permission (superuser only)
- `GET /api/permissions/:id` - Get permission

### Roles
- `GET /api/roles` - List roles (filter: ?company_id=)
- `GET /api/roles/:id` - Get role with permissions
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:roleId/assign/:employeeId` - Assign role
- `DELETE /api/roles/:roleId/assign/:employeeId` - Remove role

## Testing in Postman

1. Initialize permissions first (as superuser)
2. Get all permissions to see their IDs
3. Create roles with selected permissions
4. Create employees linked to users
5. Assign roles to employees
6. Login as employee user
7. Check that employee info, roles, and permissions are returned

