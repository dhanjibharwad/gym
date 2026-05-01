-- ============================================================
-- FIX: Protect membership data when a plan is deleted
-- Run this once in your PostgreSQL database
-- ============================================================

-- Add ON DELETE RESTRICT so database itself blocks plan deletion
-- if ANY membership (active or expired) references it
ALTER TABLE memberships
  DROP CONSTRAINT IF EXISTS memberships_plan_id_fkey;

ALTER TABLE memberships
  ADD CONSTRAINT memberships_plan_id_fkey
  FOREIGN KEY (plan_id)
  REFERENCES membership_plans(id)
  ON DELETE RESTRICT;

-- Done! Now even if someone bypasses the API,
-- the database will block deleting a plan that has any membership history.
