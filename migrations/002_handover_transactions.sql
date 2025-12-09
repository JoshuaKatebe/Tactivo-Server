-- Handover Transaction Tracking Migration
-- Adds support for tracking fuel transactions in handovers

-- Add status and cleared_at fields to handovers table
ALTER TABLE handovers ADD COLUMN status text DEFAULT 'pending';
ALTER TABLE handovers ADD COLUMN cleared_at timestamptz;
ALTER TABLE handovers ADD COLUMN payment_methods jsonb;

-- Add cleared fields to fuel_transactions for quick clear
ALTER TABLE fuel_transactions ADD COLUMN cleared boolean DEFAULT false;
ALTER TABLE fuel_transactions ADD COLUMN cleared_by_cashier_id uuid REFERENCES employees(id);
ALTER TABLE fuel_transactions ADD COLUMN cleared_at timestamptz;

-- Create junction table to link fuel transactions to handovers
CREATE TABLE handover_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  handover_id uuid NOT NULL REFERENCES handovers(id) ON DELETE CASCADE,
  fuel_transaction_id uuid NOT NULL REFERENCES fuel_transactions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(handover_id, fuel_transaction_id)
);

-- Create index for efficient lookups
CREATE INDEX handover_transactions_handover_idx ON handover_transactions(handover_id);
CREATE INDEX handover_transactions_fuel_tx_idx ON handover_transactions(fuel_transaction_id);

-- Create index on handovers for common queries
CREATE INDEX handovers_employee_status_idx ON handovers(employee_id, status);
CREATE INDEX handovers_station_status_idx ON handovers(station_id, status);
CREATE INDEX handovers_status_idx ON handovers(status);

-- Create index on fuel_transactions for quick clear queries
CREATE INDEX fuel_tx_cleared_employee_idx ON fuel_transactions(authorized_by_employee_id, cleared) WHERE cleared = false;
CREATE INDEX fuel_tx_station_cleared_idx ON fuel_transactions(station_id, cleared) WHERE cleared = false;

-- Add comment for documentation
COMMENT ON TABLE handover_transactions IS 'Links fuel transactions to handovers for tracking which transactions have been handed over';
COMMENT ON COLUMN handovers.status IS 'Status of handover: pending, cleared, cancelled';
COMMENT ON COLUMN handovers.cleared_at IS 'Timestamp when cashier cleared the handover';
COMMENT ON COLUMN fuel_transactions.cleared IS 'Whether transaction has been quick-cleared by cashier';
COMMENT ON COLUMN fuel_transactions.cleared_by_cashier_id IS 'Employee ID of cashier who cleared this transaction';
COMMENT ON COLUMN fuel_transactions.cleared_at IS 'Timestamp when transaction was quick-cleared';
