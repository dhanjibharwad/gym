-- ============================================================
-- FIX: Soft Delete Unique Constraints for Members Table
-- Run this once in your PostgreSQL database
-- ============================================================

-- Step 1: Add deleted_at column if not already added
ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Step 2: Drop old unique constraints (these block re-adding deleted members)
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_phone_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_email_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_company_id_phone_number_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_company_id_email_key;
ALTER TABLE members DROP CONSTRAINT IF EXISTS unique_company_member_number;

-- Step 3: Drop old unique indexes if they exist
DROP INDEX IF EXISTS unique_company_member_number;
DROP INDEX IF EXISTS unique_company_phone;
DROP INDEX IF EXISTS unique_company_email;

-- Step 4: Create new partial unique indexes (only enforce on NON-deleted members)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_member_number
  ON members (company_id, member_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_member_phone
  ON members (company_id, phone_number)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_member_email
  ON members (company_id, email)
  WHERE deleted_at IS NULL AND email IS NOT NULL AND email <> '';

-- Step 5: Index for fast filtering of active members
CREATE INDEX IF NOT EXISTS idx_members_deleted_at
  ON members(deleted_at)
  WHERE deleted_at IS NULL;

-- Done! Now deleted members won't block re-registration with same details.
