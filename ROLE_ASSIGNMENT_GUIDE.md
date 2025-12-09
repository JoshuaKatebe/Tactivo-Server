# Role Assignment Guide

## Overview

This guide explains how to assign roles to employees who are also users. The system uses Role-Based Access Control (RBAC) where:
- **Users** have login credentials (username/password)
- **Employees** are linked to users via `user_id`
- **Roles** contain collections of permissions
- **Employees** can have multiple roles assigned

## Quick Start: Assign Role to Employee

### Step 1: Get the Employee ID

First, find the employee you want to assign a role to:

```bash
GET /api/employees
```

Or get a specific employee:

```bash
GET /api/employees/:id
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "employee-uuid-here",
    "user_id": "user-uuid-here",
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    ...
  }
}
```

### Step 2: Get Available Roles

Get all available roles (optionally filtered by company):

```bash
GET /api/roles?company_id=company-uuid
```

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "role-uuid-1",
      "name": "Cashier",
      "description": "Cashier role",
      "company_id": "company-uuid"
    },
    {
      "id": "role-uuid-2",
      "name": "Supervisor",
      "description": "Supervisor role",
      "company_id": "company-uuid"
    }
  ]
}
```

### Step 3: Assign Role to Employee

Assign a role to an employee:

```bash
POST /api/roles/:roleId/assign/:employeeId
```

**Example:**
```bash
POST /api/roles/role-uuid-1/assign/employee-uuid-here
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "error": false,
  "message": "Role assigned successfully"
}
```

## Complete Workflow Example

### Scenario: Create a Cashier Employee with Login and Assign Cashier Role

#### 1. Create User Account

```bash
POST /api/users
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "username": "cashier1",
  "password": "Cashier123!",
  "email": "cashier1@example.com"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "user-uuid-here",
    "username": "cashier1",
    "email": "cashier1@example.com"
  }
}
```

#### 2. Create Employee and Link to User

```bash
POST /api/employees
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "company_id": "company-uuid",
  "station_id": "station-uuid",
  "user_id": "user-uuid-here",  // Link to the user created above
  "first_name": "Jane",
  "last_name": "Smith",
  "employee_code": "C001",
  "active": true
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "employee-uuid-here",
    "user_id": "user-uuid-here",
    "first_name": "Jane",
    "last_name": "Smith",
    "employee_code": "C001",
    ...
  }
}
```

#### 3. Create Cashier Role (if not exists)

First, initialize permissions (superuser only):

```bash
POST /api/permissions/initialize
Authorization: Bearer SUPERUSER_TOKEN
```

Get available permissions:

```bash
GET /api/permissions
```

Create the Cashier role with permissions:

```bash
POST /api/roles
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "company_id": "company-uuid",
  "name": "Cashier",
  "description": "Cashier with basic POS permissions",
  "permission_ids": [
    "permission-id-1",  // shop.sale.create
    "permission-id-2",  // shop.sale.view
    "permission-id-3",  // shift.start
    "permission-id-4"   // shift.end
  ]
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "id": "role-uuid-here",
    "name": "Cashier",
    "description": "Cashier with basic POS permissions",
    "company_id": "company-uuid"
  }
}
```

#### 4. Assign Role to Employee

```bash
POST /api/roles/role-uuid-here/assign/employee-uuid-here
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "error": false,
  "message": "Role assigned successfully"
}
```

#### 5. Verify Role Assignment

Get employee's roles:

```bash
GET /api/employees/employee-uuid-here/roles
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "role-uuid-here",
      "name": "Cashier",
      "description": "Cashier with basic POS permissions",
      "company_id": "company-uuid",
      "created_at": "2025-01-06T12:00:00Z"
    }
  ]
}
```

#### 6. Login as Employee

The employee can now login with their user credentials:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "cashier1",
  "password": "Cashier123!"
}
```

**Response:**
```json
{
  "error": false,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-uuid-here",
      "username": "cashier1",
      "email": "cashier1@example.com"
    },
    "employee": {
      "id": "employee-uuid-here",
      "first_name": "Jane",
      "last_name": "Smith",
      "roles": [
        {
          "id": "role-uuid-here",
          "name": "Cashier"
        }
      ],
      "permissions": [
        {
          "id": "permission-id-1",
          "code": "shop.sale.create",
          "description": "Create shop sales"
        },
        {
          "id": "permission-id-2",
          "code": "shop.sale.view",
          "description": "View shop sales"
        },
        ...
      ]
    }
  }
}
```

## API Endpoints

### Role Assignment

#### Assign Role to Employee
```bash
POST /api/roles/:roleId/assign/:employeeId
```

**Parameters:**
- `roleId` (path, required) - UUID of the role to assign
- `employeeId` (path, required) - UUID of the employee

**Response:**
```json
{
  "error": false,
  "message": "Role assigned successfully"
}
```

#### Remove Role from Employee
```bash
DELETE /api/roles/:roleId/assign/:employeeId
```

**Parameters:**
- `roleId` (path, required) - UUID of the role to remove
- `employeeId` (path, required) - UUID of the employee

**Response:**
```json
{
  "error": false,
  "message": "Role removed successfully"
}
```

### Get Employee Roles

#### Get All Roles for an Employee
```bash
GET /api/employees/:id/roles
```

**Parameters:**
- `id` (path, required) - UUID of the employee

**Response:**
```json
{
  "error": false,
  "data": [
    {
      "id": "role-uuid",
      "name": "Cashier",
      "description": "Cashier role",
      "company_id": "company-uuid",
      "created_at": "2025-01-06T12:00:00Z"
    }
  ]
}
```

## Common Use Cases

### Assign Multiple Roles to One Employee

An employee can have multiple roles. Just assign them one by one:

```bash
POST /api/roles/cashier-role-id/assign/employee-id
POST /api/roles/supervisor-role-id/assign/employee-id
POST /api/roles/manager-role-id/assign/employee-id
```

When the employee logs in, they'll have all permissions from all assigned roles.

### Update Employee's Roles

To change an employee's roles:

1. **Remove old role:**
   ```bash
   DELETE /api/roles/old-role-id/assign/employee-id
   ```

2. **Assign new role:**
   ```bash
   POST /api/roles/new-role-id/assign/employee-id
   ```

### Check Employee Permissions

After login, the employee's permissions are automatically included in the response. You can also check permissions programmatically using the authentication middleware.

## Linking Employee to User

### When Creating Employee

Include `user_id` when creating the employee:

```json
{
  "user_id": "user-uuid-here",
  "first_name": "John",
  "last_name": "Doe",
  ...
}
```

### When Updating Employee

Update the employee to link to a user:

```bash
PUT /api/employees/:id
Content-Type: application/json

{
  "user_id": "user-uuid-here",
  ...
}
```

### Important Notes

- An employee **can exist without a user** (for badge-only access)
- An employee **can be linked to a user** (for login access)
- A user **can be linked to multiple employees** (if needed)
- When an employee with `user_id` logs in, they automatically get:
  - Employee information
  - All assigned roles
  - All permissions from those roles

## Testing in Postman

### Step-by-Step Postman Workflow

1. **Login as Superuser/Admin:**
   ```
   POST /api/auth/login
   Body: { "username": "admin", "password": "..." }
   ```
   Copy the `token` from response.

2. **Get Employee ID:**
   ```
   GET /api/employees
   Headers: Authorization: Bearer {token}
   ```
   Find the employee you want to assign a role to.

3. **Get Available Roles:**
   ```
   GET /api/roles?company_id={company-id}
   Headers: Authorization: Bearer {token}
   ```
   Find the role you want to assign.

4. **Assign Role:**
   ```
   POST /api/roles/{role-id}/assign/{employee-id}
   Headers: Authorization: Bearer {token}
   ```

5. **Verify Assignment:**
   ```
   GET /api/employees/{employee-id}/roles
   Headers: Authorization: Bearer {token}
   ```

6. **Test Login:**
   ```
   POST /api/auth/login
   Body: { "username": "employee-username", "password": "..." }
   ```
   Check that `employee.roles` and `employee.permissions` are included.

## Troubleshooting

### "Failed to assign role" Error

**Possible causes:**
- Role ID doesn't exist
- Employee ID doesn't exist
- Role already assigned (this is OK, it won't duplicate)

**Solution:**
- Verify role ID: `GET /api/roles/:id`
- Verify employee ID: `GET /api/employees/:id`
- Check if role is already assigned: `GET /api/employees/:id/roles`

### Employee Not Getting Permissions After Login

**Possible causes:**
- Employee not linked to user (`user_id` is null)
- No roles assigned to employee
- Roles have no permissions

**Solution:**
1. Check employee has `user_id`: `GET /api/employees/:id`
2. Check employee has roles: `GET /api/employees/:id/roles`
3. Check role has permissions: `GET /api/roles/:id`

### Employee Can't Login

**Possible causes:**
- Employee not linked to user
- User account doesn't exist
- Wrong username/password

**Solution:**
1. Verify employee has `user_id`: `GET /api/employees/:id`
2. Verify user exists: `GET /api/users/:id`
3. Try login with correct credentials

## Best Practices

1. **Create roles first** before assigning them
2. **Assign permissions to roles** when creating roles
3. **Link employee to user** when creating employee (if login needed)
4. **Assign roles after** employee is created
5. **Use company-scoped roles** for multi-company setups
6. **Verify assignments** using `GET /api/employees/:id/roles`
7. **Test login** after role assignment to verify permissions

## Example: Complete Setup

```bash
# 1. Create user
POST /api/users
{ "username": "cashier1", "password": "Pass123!", "email": "cashier1@example.com" }
# Response: { "data": { "id": "user-123" } }

# 2. Create employee linked to user
POST /api/employees
{ "user_id": "user-123", "first_name": "Jane", "last_name": "Smith", "company_id": "company-123" }
# Response: { "data": { "id": "employee-456" } }

# 3. Create role with permissions
POST /api/roles
{ "company_id": "company-123", "name": "Cashier", "permission_ids": ["perm-1", "perm-2"] }
# Response: { "data": { "id": "role-789" } }

# 4. Assign role to employee
POST /api/roles/role-789/assign/employee-456
# Response: { "error": false, "message": "Role assigned successfully" }

# 5. Verify
GET /api/employees/employee-456/roles
# Response: { "data": [{ "id": "role-789", "name": "Cashier" }] }

# 6. Login
POST /api/auth/login
{ "username": "cashier1", "password": "Pass123!" }
# Response includes employee with roles and permissions!
```

---

**Need Help?** Check the Swagger UI at `http://localhost:3000/api-docs` for interactive API testing!



