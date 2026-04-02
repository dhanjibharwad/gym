-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_modes JSONB NOT NULL DEFAULT '{"Cash": {"enabled": true, "processingFee": 0}, "UPI": {"enabled": true, "processingFee": 1.5}, "Card": {"enabled": true, "processingFee": 2.5}, "Online": {"enabled": true, "processingFee": 2.0}, "Cheque": {"enabled": true, "processingFee": 0}}'::jsonb,
    receipt_template JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);

-- Missing columns for existing databases
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_template JSONB;
