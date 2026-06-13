-- ============================================================
-- Migration 00010 — Personal magazine masthead + cover content
-- The issue `title` is now the masthead (magazine name).
-- Add user-authored cover headline + subtitle.
-- Additive; safe to re-run.
-- ============================================================

ALTER TABLE game_room_issues ADD COLUMN IF NOT EXISTS cover_headline TEXT;
ALTER TABLE game_room_issues ADD COLUMN IF NOT EXISTS cover_subtitle TEXT;
