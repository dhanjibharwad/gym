-- Add date_of_admission column to memberships table
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS date_of_admission DATE;

-- Set default value for existing records (use start_date as default)
UPDATE memberships 
SET date_of_admission = start_date 
WHERE date_of_admission IS NULL;
