-- Tactivo Database Schema
-- PostgreSQL Migration Script

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations (top-level)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Companies (clients)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Stations
CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  timezone text NOT NULL DEFAULT 'UTC',
  pts_hostname text,
  pts_port integer DEFAULT 80,
  config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX stations_company_code_idx ON stations(company_id, code);

-- 4. Terminals (Electron instances)
CREATE TABLE terminals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name text,
  hostname text,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. Users (global login accounts)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email text,
  is_superuser boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Employees (linked to station/company; may have a user login or not)
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id),
  station_id uuid REFERENCES stations(id),
  user_id uuid REFERENCES users(id),
  first_name text NOT NULL,
  last_name text,
  badge_tag text,
  card_id text,
  phone text,
  employee_code text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX employees_company_idx ON employees(company_id);
CREATE INDEX employees_station_idx ON employees(station_id);
CREATE UNIQUE INDEX employees_station_badge_unique ON employees(station_id, badge_tag) WHERE badge_tag IS NOT NULL;

-- 7. Roles & Permissions (simple RBAC)
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES companies(id),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  description text
);

CREATE TABLE role_permissions (
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE employee_roles (
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, role_id)
);

-- 8. PTS controllers / Pumps / Nozzles (basic registry)
CREATE TABLE pts_controllers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  identifier text,
  hostname text,
  port int DEFAULT 80,
  http_auth jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE pumps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pts_id uuid REFERENCES pts_controllers(id) ON DELETE CASCADE,
  pump_number int NOT NULL,
  name text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX pumps_ptsnumber_idx ON pumps(pts_id, pump_number);

CREATE TABLE nozzles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pump_id uuid REFERENCES pumps(id) ON DELETE CASCADE,
  nozzle_number int NOT NULL,
  fuel_grade_id int,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX nozzles_pump_nozzle_idx ON nozzles(pump_id, nozzle_number);

-- 9. Station Shifts (PTS hardware shifts)
CREATE TABLE station_shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  pts_shift_number bigint,
  date_time_start timestamptz,
  date_time_end timestamptz,
  opened_by_employee_id uuid REFERENCES employees(id),
  configuration_id text,
  uploaded boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX station_shifts_station_idx ON station_shifts(station_id);

-- 10. Employee shifts (your app-level shifts)
CREATE TABLE employee_shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_shift_id uuid REFERENCES station_shifts(id),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  status text DEFAULT 'open',
  opening_totals jsonb,
  closing_totals jsonb,
  opening_cash numeric(12,2) DEFAULT 0,
  closing_cash numeric(12,2),
  cleared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX employee_shifts_employee_idx ON employee_shifts(employee_id);

-- 11. Fuel transactions (pump transactions uploaded from PTS)
CREATE TABLE fuel_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  pts_controller_id uuid REFERENCES pts_controllers(id),
  pts_transaction_id bigint,
  pump_number int,
  nozzle int,
  transaction_datetime timestamptz,
  volume numeric(12,3),
  amount numeric(12,2),
  price numeric(12,4),
  payment_form_id int,
  payment_methods jsonb,
  tag text,
  authorized_by_employee_id uuid REFERENCES employees(id),
  recorded_by_terminal_id uuid REFERENCES terminals(id),
  synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX fuel_tx_station_dt_idx ON fuel_transactions(station_id, transaction_datetime);
CREATE UNIQUE INDEX fuel_tx_pts_unique ON fuel_transactions(pts_controller_id, pts_transaction_id) WHERE pts_controller_id IS NOT NULL AND pts_transaction_id IS NOT NULL;

-- 12. Sales: Shop POS
CREATE TABLE shop_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  sku text,
  name text NOT NULL,
  price numeric(12,2) NOT NULL,
  cost numeric(12,2),
  unit text,
  stock_qty numeric(12,3) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE shop_sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  employee_id uuid REFERENCES employees(id),
  terminal_id uuid REFERENCES terminals(id),
  sale_time timestamptz DEFAULT now(),
  total_amount numeric(12,2) NOT NULL,
  payments jsonb,
  synced boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shop_sale_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id uuid REFERENCES shop_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES shop_products(id),
  qty numeric(12,3),
  unit_price numeric(12,2),
  line_total numeric(12,2)
);

-- 13. Payments (global payment ledger)
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  employee_id uuid REFERENCES employees(id),
  source text NOT NULL,
  source_ref uuid,
  amount numeric(12,2) NOT NULL,
  payment_type text NOT NULL,
  details jsonb,
  payment_time timestamptz DEFAULT now(),
  reconciled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 14. Handover / Cash Clearance
CREATE TABLE handovers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  employee_id uuid REFERENCES employees(id),
  cashier_employee_id uuid REFERENCES employees(id),
  employee_shift_id uuid REFERENCES employee_shifts(id),
  amount_expected numeric(12,2),
  amount_cashed numeric(12,2),
  difference numeric(12,2),
  handover_time timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 15. Audit log / event log
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  user_id uuid REFERENCES users(id),
  employee_id uuid REFERENCES employees(id),
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- 16. Sync queue (for offline uploads)
CREATE TABLE sync_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_id uuid REFERENCES stations(id),
  object_type text NOT NULL,
  object_id uuid NOT NULL,
  attempts int DEFAULT 0,
  last_attempt timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

