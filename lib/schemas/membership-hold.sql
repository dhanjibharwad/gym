-- Add hold functionality to memberships table
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS hold_start_date DATE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS hold_end_date DATE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- Update status check constraint to include 'on_hold'
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_status_check;
ALTER TABLE memberships ADD CONSTRAINT memberships_status_check 
  CHECK (status IN ('active', 'inactive', 'expired', 'suspended', 'on_hold'));

-- Create membership_holds table for tracking hold history
CREATE TABLE IF NOT EXISTS membership_holds (
    id SERIAL PRIMARY KEY,
    membership_id INTEGER REFERENCES memberships(id) ON DELETE CASCADE,
    hold_start_date DATE NOT NULL,
    hold_end_date DATE,
    hold_reason TEXT,
    days_on_hold INTEGER,
    resumed_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_membership_holds_membership_id ON membership_holds(membership_id);
