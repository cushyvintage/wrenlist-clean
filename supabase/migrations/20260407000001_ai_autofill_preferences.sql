-- AI Auto-Fill user preferences
-- Stored as JSONB for flexibility: { enabled, title, description, category, condition, price }
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_autofill_preferences JSONB DEFAULT '{"enabled": true, "title": true, "description": true, "category": true, "condition": true, "price": true}';
