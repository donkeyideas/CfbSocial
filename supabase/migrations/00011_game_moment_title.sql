-- ============================================================
-- Migration 00011 — Moment page title
-- A short headline for the magazine page, separate from the
-- caption (body copy). Additive; safe to re-run.
-- ============================================================

ALTER TABLE game_moments ADD COLUMN IF NOT EXISTS title TEXT;
