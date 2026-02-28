-- Add subscription_plan_id column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER REFERENCES subscription_plans(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_subscription_plan 
ON companies(subscription_plan_id);
