-- Add has_completed_onboarding column to profiles table
ALTER TABLE profiles
ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT false;
