-- ============================================================
-- Migration 00009 — User-owned, curated Game Room issues
-- Issues become a user's own publication: they pick moments,
-- order them, choose the cover. New season -> new issue.
-- Additive; safe to re-run.
-- ============================================================

-- Owner of the issue (the curator). NULL = legacy/community issue.
ALTER TABLE game_room_issues ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_issues_owner ON game_room_issues(owner_id);

-- Numbering is now per-owner, not global.
DROP INDEX IF EXISTS idx_game_room_issues_number;
CREATE UNIQUE INDEX IF NOT EXISTS idx_issues_owner_number ON game_room_issues(owner_id, issue_number);

-- Let owners manage their own issues + items directly (writes also done via service role).
DROP POLICY IF EXISTS "own issues" ON game_room_issues;
CREATE POLICY "own issues" ON game_room_issues FOR ALL
  USING (owner_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = game_room_issues.owner_id AND pr.owner_id = auth.uid()))
  WITH CHECK (owner_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = game_room_issues.owner_id AND pr.owner_id = auth.uid()));

DROP POLICY IF EXISTS "own issue_items" ON game_room_issue_items;
CREATE POLICY "own issue_items" ON game_room_issue_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM game_room_issues gi JOIN profiles pr ON pr.id = gi.owner_id
    WHERE gi.id = game_room_issue_items.issue_id AND pr.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM game_room_issues gi JOIN profiles pr ON pr.id = gi.owner_id
    WHERE gi.id = game_room_issue_items.issue_id AND pr.owner_id = auth.uid()
  ));
