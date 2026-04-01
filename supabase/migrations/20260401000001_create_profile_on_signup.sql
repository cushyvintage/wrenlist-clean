-- Migration: create_profile_on_signup.sql
-- Creates a profile automatically when a new user signs up
-- Extracts plan and full_name from auth.user.user_metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    plan,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.user_metadata->>'full_name', ''),
    COALESCE(NEW.user_metadata->>'plan', 'free'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NEW.user_metadata->>'full_name', profiles.full_name),
    plan = COALESCE(NEW.user_metadata->>'plan', profiles.plan),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
