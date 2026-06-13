-- ============================================================
-- 00013 — Share a Magazine issue to the main Feed
-- Adds an ISSUE post type and tracks which post represents an issue.
-- ============================================================

-- 1. Allow ISSUE posts (issue announcement cards in the Feed)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check CHECK (post_type IN (
  'STANDARD','RECEIPT','SIDELINE','PREDICTION','AGING_TAKE','CHALLENGE_RESULT','MOMENT','ISSUE'
));

-- 2. Link an issue to the Feed post that announces it (null = not shared yet)
ALTER TABLE game_room_issues ADD COLUMN IF NOT EXISTS feed_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;
