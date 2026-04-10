-- Add flourish + soar tiers to profiles.plan CHECK constraint
-- Source of truth for plan limits: src/config/plans.ts

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'nester', 'flourish', 'forager', 'soar', 'flock'));
