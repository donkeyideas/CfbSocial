-- ============================================================
-- Migration 00008 — Game Room
-- Video-game tie-in: Moments (screenshots), Dynasty Saves,
-- Online League Finder, and the weekly Game Room issue.
-- Additive only — no drops of existing data.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Allow the new MOMENT post type
-- ------------------------------------------------------------
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_post_type_check CHECK (post_type IN (
  'STANDARD','RECEIPT','SIDELINE','PREDICTION','AGING_TAKE','CHALLENGE_RESULT','MOMENT'
));

-- ------------------------------------------------------------
-- 2. Dynasty saves (a user's in-game franchise)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dynasty_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  is_team_builder BOOLEAN NOT NULL DEFAULT FALSE,
  team_builder_name TEXT,
  current_year INT NOT NULL DEFAULT 1,
  current_season_label TEXT,
  record TEXT,
  national_titles INT NOT NULL DEFAULT 0,
  follower_count INT NOT NULL DEFAULT 0,
  moment_count INT NOT NULL DEFAULT 0,
  game_version TEXT NOT NULL DEFAULT 'CFB 27',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dynasty_saves_owner ON dynasty_saves(owner_id);

-- ------------------------------------------------------------
-- 3. Game moments (1:1 companion to a MOMENT post — keeps posts lean)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  save_id UUID REFERENCES dynasty_saves(id) ON DELETE SET NULL,
  school_id UUID REFERENCES schools(id),
  opponent TEXT,
  our_score INT,
  opp_score INT,
  week TEXT,
  season_label TEXT,
  result TEXT,                       -- e.g. 'W 28-24', 'TIE', 'FINAL'
  game_state TEXT,                   -- e.g. 'FINAL', 'Q4', '1ST'
  is_team_builder BOOLEAN NOT NULL DEFAULT FALSE,
  moment_tags TEXT[] DEFAULT '{}',   -- TOUCHDOWN, UPSET, GAME_WINNER, ...
  game_version TEXT NOT NULL DEFAULT 'CFB 27',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_game_moments_post ON game_moments(post_id);
CREATE INDEX IF NOT EXISTS idx_game_moments_save ON game_moments(save_id);
CREATE INDEX IF NOT EXISTS idx_game_moments_school ON game_moments(school_id);

-- Keep dynasty_saves.moment_count in sync
CREATE OR REPLACE FUNCTION bump_save_moment_count() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') AND NEW.save_id IS NOT NULL THEN
    UPDATE dynasty_saves SET moment_count = moment_count + 1 WHERE id = NEW.save_id;
  ELSIF (TG_OP = 'DELETE') AND OLD.save_id IS NOT NULL THEN
    UPDATE dynasty_saves SET moment_count = GREATEST(0, moment_count - 1) WHERE id = OLD.save_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_bump_save_moment_count ON game_moments;
CREATE TRIGGER trg_bump_save_moment_count
  AFTER INSERT OR DELETE ON game_moments
  FOR EACH ROW EXECUTE FUNCTION bump_save_moment_count();

-- ------------------------------------------------------------
-- 4. Online leagues (the League Finder)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS online_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commissioner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'PS5',         -- PS5 / Xbox / PC
  max_users INT NOT NULL DEFAULT 32,
  filled_count INT NOT NULL DEFAULT 1,
  sim_schedule TEXT,
  style TEXT NOT NULL DEFAULT 'COMPETITIVE',     -- COMPETITIVE / CASUAL / FILLING_FAST
  rules TEXT,
  tags TEXT[] DEFAULT '{}',                       -- POWER_4, G5_ONLY, CFB27_LAUNCH, ...
  open_schools TEXT,
  status TEXT NOT NULL DEFAULT 'RECRUITING'       -- RECRUITING / FULL / ACTIVE / CLOSED
    CHECK (status IN ('RECRUITING','FULL','ACTIVE','CLOSED')),
  game_version TEXT NOT NULL DEFAULT 'CFB 27',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_online_leagues_status ON online_leagues(status);
CREATE INDEX IF NOT EXISTS idx_online_leagues_commish ON online_leagues(commissioner_id);

CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES online_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  role TEXT NOT NULL DEFAULT 'COACH'              -- COMMISSIONER / COACH
    CHECK (role IN ('COMMISSIONER','COACH')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_league_members_league ON league_members(league_id);

CREATE TABLE IF NOT EXISTS league_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES online_leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  preferred_school TEXT,
  platform TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'          -- PENDING / APPROVED / DECLINED
    CHECK (status IN ('PENDING','APPROVED','DECLINED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (league_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_league_requests_league ON league_requests(league_id, status);
CREATE INDEX IF NOT EXISTS idx_league_requests_user ON league_requests(user_id);

-- ------------------------------------------------------------
-- 5. Weekly Game Room issue (the magazine)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_room_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number INT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Game Room Weekly',
  cover_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_room_issues_number ON game_room_issues(issue_number);

CREATE TABLE IF NOT EXISTS game_room_issue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES game_room_issues(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  save_id UUID REFERENCES dynasty_saves(id) ON DELETE SET NULL,
  page_label TEXT,
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_issue_items_issue ON game_room_issue_items(issue_id, position);

-- ------------------------------------------------------------
-- 6. Storage bucket for moment screenshots (public read)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('moments', 'moments', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 7. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE dynasty_saves        ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_leagues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_room_issues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_room_issue_items ENABLE ROW LEVEL SECURITY;

-- Public read for everything user-facing
CREATE POLICY "read dynasty_saves"  ON dynasty_saves        FOR SELECT USING (true);
CREATE POLICY "read game_moments"   ON game_moments         FOR SELECT USING (true);
CREATE POLICY "read online_leagues" ON online_leagues       FOR SELECT USING (true);
CREATE POLICY "read league_members" ON league_members       FOR SELECT USING (true);
CREATE POLICY "read issues"         ON game_room_issues      FOR SELECT USING (true);
CREATE POLICY "read issue_items"    ON game_room_issue_items FOR SELECT USING (true);

-- Owner-scoped writes
CREATE POLICY "own dynasty_saves"   ON dynasty_saves   FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
-- game_moments writes allowed when the parent post belongs to a profile the user owns
CREATE POLICY "own game_moments"    ON game_moments    FOR ALL
  USING (EXISTS (
    SELECT 1 FROM posts p JOIN profiles pr ON pr.id = p.author_id
    WHERE p.id = game_moments.post_id AND pr.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM posts p JOIN profiles pr ON pr.id = p.author_id
    WHERE p.id = game_moments.post_id AND pr.owner_id = auth.uid()
  ));

-- Leagues: commissioner manages the league; anyone authed can create
CREATE POLICY "create online_leagues" ON online_leagues FOR INSERT WITH CHECK (auth.uid() = commissioner_id);
CREATE POLICY "manage online_leagues" ON online_leagues FOR UPDATE USING (auth.uid() = commissioner_id);

-- Members: a user can see/manage their own membership; commissioners managed via service role / RPC
CREATE POLICY "join league_members"  ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Requests: a user creates their own; commissioner reads via league join (handled app-side / service role)
CREATE POLICY "request league_requests" ON league_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read own league_requests" ON league_requests FOR SELECT USING (true);
