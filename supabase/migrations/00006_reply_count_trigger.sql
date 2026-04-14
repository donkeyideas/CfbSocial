-- ============================================================
-- TRIGGER: Update denormalized reply_count on parent post
-- ============================================================

CREATE OR REPLACE FUNCTION update_reply_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_reply_change
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_reply_counts();

-- Backfill existing reply counts
UPDATE posts p
SET reply_count = (
  SELECT COUNT(*) FROM posts r
  WHERE r.parent_id = p.id AND r.status = 'PUBLISHED'
)
WHERE p.parent_id IS NULL;
