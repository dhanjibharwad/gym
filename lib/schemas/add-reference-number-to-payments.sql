-- Add reference_number column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);

-- Create index for reference_number
CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON payments(reference_number);
