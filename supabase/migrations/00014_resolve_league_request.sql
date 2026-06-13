-- ============================================================
-- 00014 — resolve_league_request RPC
-- Lets a league commissioner approve/decline a join request from
-- BOTH web and mobile. SECURITY DEFINER because approving inserts a
-- league_members row for ANOTHER user (RLS would block that under
-- the commissioner's own session).
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_league_request(p_request_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r  record;
  lg record;
  new_count int;
BEGIN
  SELECT * INTO r FROM league_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'PENDING' THEN RAISE EXCEPTION 'Request already resolved'; END IF;

  SELECT * INTO lg FROM online_leagues WHERE id = r.league_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'League not found'; END IF;
  IF lg.commissioner_id <> auth.uid() THEN RAISE EXCEPTION 'Only the commissioner can do that'; END IF;

  IF p_action = 'decline' THEN
    UPDATE league_requests SET status = 'DECLINED', resolved_at = now() WHERE id = p_request_id;
    RETURN;
  ELSIF p_action = 'approve' THEN
    UPDATE league_requests SET status = 'APPROVED', resolved_at = now() WHERE id = p_request_id;
    IF NOT EXISTS (SELECT 1 FROM league_members WHERE league_id = r.league_id AND user_id = r.user_id) THEN
      INSERT INTO league_members (league_id, user_id, school_id, role)
        VALUES (r.league_id, r.user_id, r.school_id, 'COACH');
      new_count := COALESCE(lg.filled_count, 1) + 1;
      UPDATE online_leagues
        SET filled_count = new_count,
            status = CASE WHEN new_count >= lg.max_users THEN 'FULL' ELSE 'RECRUITING' END
        WHERE id = lg.id;
    END IF;
    RETURN;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_league_request(uuid, text) TO authenticated;
