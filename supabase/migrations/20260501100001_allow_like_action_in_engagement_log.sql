-- Allow 'like' as a third Instagram engagement action type alongside 'comment' and 'follow'.
-- The bot uses likes as low-risk engagement: no comment-text policing, looser per-cycle quota.

ALTER TABLE instagram_engagement_log
  DROP CONSTRAINT IF EXISTS valid_action;

ALTER TABLE instagram_engagement_log
  ADD CONSTRAINT valid_action
  CHECK (action_type = ANY (ARRAY['comment'::text, 'follow'::text, 'like'::text]));
