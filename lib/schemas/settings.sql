-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_modes JSONB NOT NULL DEFAULT '{"Cash": {"enabled": true, "processingFee": 0}, "UPI": {"enabled": true, "processingFee": 1.5}, "Card": {"enabled": true, "processingFee": 2.5}, "Online": {"enabled": true, "processingFee": 2.0}, "Cheque": {"enabled": true, "processingFee": 0}}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id)
);

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
