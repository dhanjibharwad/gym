-- Alter member_number column from INTEGER to VARCHAR to support alphanumeric values
-- Drop the old unique constraint and index first
ALTER TABLE members DROP CONSTRAINT IF EXISTS unique_company_member_number;
DROP INDEX IF EXISTS idx_members_company_number;

-- Alter the column type to VARCHAR
ALTER TABLE members ALTER COLUMN member_number TYPE VARCHAR(50);

-- Recreate the unique constraint with the new type
ALTER TABLE members ADD CONSTRAINT unique_company_member_number UNIQUE (company_id, member_number);

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_members_company_number ON members(company_id, member_number);
