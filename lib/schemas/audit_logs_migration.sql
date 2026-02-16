-- Migration: Add user_id and ip_address to audit_logs table
-- Run this if your audit_logs table already exists

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    END IF;
END $$;

-- Add ip_address column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45);
    END IF;
END $$;

-- Add action index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
