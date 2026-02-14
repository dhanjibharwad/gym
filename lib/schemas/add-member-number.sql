-- Add member_number column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_number INTEGER;

-- Create unique constraint for company-specific member numbers
ALTER TABLE members ADD CONSTRAINT unique_company_member_number UNIQUE (company_id, member_number);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_company_number ON members(company_id, member_number);

-- Update existing members with sequential numbers per company
WITH numbered_members AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY id) as row_num
  FROM members
  WHERE member_number IS NULL
)
UPDATE members m
SET member_number = nm.row_num
FROM numbered_members nm
WHERE m.id = nm.id;
