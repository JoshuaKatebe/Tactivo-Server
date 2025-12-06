# API Routes Documentation

## Authentication
- `POST /api/auth/login` - Login user (returns employee info if linked)
- `GET /api/auth/me` - Get current user info

## Organizations
- `GET /api/organizations` - Get all organizations
- `GET /api/organizations/:id` - Get organization by ID
- `POST /api/organizations` - Create organization (superuser only)
- `PUT /api/organizations/:id` - Update organization (superuser only)
- `DELETE /api/organizations/:id` - Delete organization (superuser only)

## Companies
- `GET /api/companies` - Get all companies (filter: ?organization_id=)
- `GET /api/companies/:id` - Get company by ID
- `POST /api/companies` - Create company
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

## Stations
- `GET /api/stations` - Get all stations (filter: ?company_id=)
- `GET /api/stations/:id` - Get station by ID
- `POST /api/stations` - Create station
- `PUT /api/stations/:id` - Update station
- `DELETE /api/stations/:id` - Delete station

## Users
- `GET /api/users` - Get all users (superuser only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (superuser only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (superuser only)

## Employees
- `GET /api/employees` - Get all employees (filters: ?company_id=, ?station_id=, ?active=)
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

## Shifts
- `GET /api/shifts` - Get all shifts (filters: ?station_id=, ?employee_id=, ?status=)
- `GET /api/shifts/open` - Get open shift (query: ?station_id=, ?employee_id=)
- `GET /api/shifts/:id` - Get shift by ID
- `POST /api/shifts/start` - Start a new shift
- `POST /api/shifts/:id/end` - End a shift
- `PUT /api/shifts/:id` - Update shift

## Fuel Transactions
- `GET /api/fuel-transactions` - Get all transactions (filters: ?station_id=, ?start_date=, ?end_date=, ?synced=)
- `GET /api/fuel-transactions/summary` - Get transaction summary (query: ?station_id=, ?start_date=, ?end_date=)
- `GET /api/fuel-transactions/:id` - Get transaction by ID
- `POST /api/fuel-transactions` - Create transaction
- `POST /api/fuel-transactions/:id/sync` - Mark transaction as synced

## Shop
### Products
- `GET /api/shop/products` - Get all products (filters: ?station_id=, ?active=)
- `GET /api/shop/products/:id` - Get product by ID
- `POST /api/shop/products` - Create product
- `PUT /api/shop/products/:id` - Update product
- `DELETE /api/shop/products/:id` - Delete product

### Sales
- `GET /api/shop/sales` - Get all sales (filters: ?station_id=, ?employee_id=, ?start_date=, ?end_date=)
- `GET /api/shop/sales/:id` - Get sale by ID (with items)
- `POST /api/shop/sales` - Create sale
- `POST /api/shop/sales/:id/sync` - Mark sale as synced

## Fuel (PTS Controller)
- `GET /api/fuel/pumps` - Get all pump statuses
- `GET /api/fuel/pumps/:pumpNumber` - Get pump status
- `POST /api/fuel/pumps/:pumpNumber/authorize` - Authorize pump
- `POST /api/fuel/pumps/:pumpNumber/stop` - Stop pump
- `POST /api/fuel/pumps/:pumpNumber/emergency-stop` - Emergency stop
- `GET /api/fuel/pumps/:pumpNumber/totals` - Get pump totals
- `GET /api/fuel/pumps/:pumpNumber/prices` - Get pump prices
- `POST /api/fuel/pumps/:pumpNumber/prices` - Set pump prices
- `GET /api/fuel/tanks` - Get all tank statuses

## Reports
- `GET /api/reports/sales` - Sales report (query: station_id, start_date, end_date, group_by)
- `GET /api/reports/fuel` - Fuel report (query: station_id, start_date, end_date, grade)
- `GET /api/reports/inventory` - Inventory report (query: station_id, start_date, end_date)
- `GET /api/reports/financial` - Financial report (query: station_id, start_date, end_date)
- `GET /api/reports/employee` - Employee performance (query: employee_id, station_id, start_date, end_date)
- `GET /api/reports/pump-readings` - Pump readings (query: station_id, pump_id, start_date, end_date)
- `GET /api/reports/credit-sales` - Credit sales (query: station_id, debtor_id, start_date, end_date, status)

## Handovers
- `GET /api/handovers` - Get all handovers (filters: station_id, employee_id, shift_id, start_date, end_date)
- `GET /api/handovers/:id` - Get handover by ID
- `POST /api/handovers` - Create handover
- `PUT /api/handovers/:id` - Update handover
- `DELETE /api/handovers/:id` - Delete handover

## Payments (Placeholders)
- `GET /api/payments` - Get all payments (placeholder)
- `GET /api/payments/:id` - Get payment (placeholder)
- `POST /api/payments` - Create payment (placeholder)
- `GET /api/payments/summary` - Payment summary (placeholder)

## PTS Controllers
- `GET /api/pts-controllers` - Get all controllers (filter: ?station_id=)
- `GET /api/pts-controllers/:id` - Get controller by ID
- `POST /api/pts-controllers` - Create controller
- `PUT /api/pts-controllers/:id` - Update controller
- `DELETE /api/pts-controllers/:id` - Delete controller

## Pumps
- `GET /api/pumps` - Get all pumps with nozzles (filters: ?station_id=, ?active=)
- `GET /api/pumps/:id` - Get pump with nozzles
- `POST /api/pumps` - Create pump (with optional nozzles)
- `PUT /api/pumps/:id` - Update pump
- `DELETE /api/pumps/:id` - Delete pump

## Nozzles
- `GET /api/nozzles` - Get all nozzles (filters: ?pump_id=, ?station_id=)
- `GET /api/nozzles/:id` - Get nozzle by ID
- `POST /api/nozzles` - Create nozzle
- `PUT /api/nozzles/:id` - Update nozzle
- `DELETE /api/nozzles/:id` - Delete nozzle

## Station Shifts (PTS Hardware)
- `GET /api/station-shifts` - Get all shifts (filters: ?station_id=, ?status=, ?start_date=, ?end_date=)
- `GET /api/station-shifts/open` - Get open shift (query: ?station_id=)
- `GET /api/station-shifts/:id` - Get shift by ID
- `POST /api/station-shifts/start` - Start new PTS shift
- `POST /api/station-shifts/:id/end` - End PTS shift
- `PUT /api/station-shifts/:id` - Update shift

## Debtors (Placeholders)
- `GET /api/debtors` - Get all debtors (placeholder)
- `GET /api/debtors/:id` - Get debtor (placeholder)
- `GET /api/debtors/:id/balance` - Get balance (placeholder)
- `GET /api/debtors/:id/transactions` - Get transactions (placeholder)
- `POST /api/debtors` - Create debtor (placeholder)
- `PUT /api/debtors/:id` - Update debtor (placeholder)
- `DELETE /api/debtors/:id` - Delete debtor (placeholder)
- `POST /api/debtors/:id/payments` - Record payment (placeholder)

## Stock Management
- `GET /api/stock/products` - Get products with stock (filters: ?station_id=, ?category=, ?active=, ?low_stock=)
- `GET /api/stock/low-stock` - Get low stock items (query: ?station_id=, ?threshold=)
- `POST /api/stock/stock-in` - Record stock in (restock)
- `GET /api/stock/movements` - Get stock movements (filters: ?product_id=, ?station_id=, ?start_date=, ?end_date=, ?type=)
- `POST /api/stock/adjust` - Manual stock adjustment

## Roles & Permissions
- `GET /api/roles` - List roles (filter: ?company_id=)
- `GET /api/roles/:id` - Get role with permissions
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:roleId/assign/:employeeId` - Assign role to employee
- `DELETE /api/roles/:roleId/assign/:employeeId` - Remove role from employee
- `GET /api/permissions` - List permissions
- `POST /api/permissions/initialize` - Initialize default permissions (superuser only)
- `POST /api/permissions` - Create permission (superuser only)

## Health
- `GET /api/health` - Server health check
