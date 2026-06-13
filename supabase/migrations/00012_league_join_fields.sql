-- ============================================================
-- Migration 00012 — Online dynasty join credentials
-- Mirrors CFB's "Online Commissioner Settings": the in-game
-- League Name (join code), League Password, Public/Private,
-- Cross-Play. Additive; safe to re-run.
-- ============================================================

ALTER TABLE online_leagues ADD COLUMN IF NOT EXISTS join_code TEXT;
ALTER TABLE online_leagues ADD COLUMN IF NOT EXISTS join_password TEXT;
ALTER TABLE online_leagues ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE online_leagues ADD COLUMN IF NOT EXISTS cross_play BOOLEAN NOT NULL DEFAULT TRUE;
