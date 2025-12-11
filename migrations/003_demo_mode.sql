-- Create demo fuel transactions table
CREATE TABLE IF NOT EXISTS demo_fuel_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID,
    pts_controller_id UUID,
    pts_transaction_id INTEGER,
    pump_number INTEGER,
    nozzle INTEGER,
    transaction_datetime TIMESTAMPTZ DEFAULT NOW(),
    volume DECIMAL(10, 2) DEFAULT 0,
    amount DECIMAL(10, 2) DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0,
    payment_form_id UUID,
    payment_methods JSONB,
    tag VARCHAR(255),
    authorized_by_employee_id UUID,
    recorded_by_terminal_id UUID,
    synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_demo_fuel_transactions_station_id ON demo_fuel_transactions(station_id);
CREATE INDEX IF NOT EXISTS idx_demo_fuel_transactions_date ON demo_fuel_transactions(transaction_datetime);
