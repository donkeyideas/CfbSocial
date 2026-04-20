-- =============================================================================
-- Auto-check achievements when profile stats change
-- Creates check_achievements() function + trigger on profiles table
-- =============================================================================

-- Function to check and award achievements for a user
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  prof RECORD;
  ach RECORD;
  current_val INT;
  tier_num INT;
  total_new_xp INT := 0;
  new_xp INT;
  new_level INT;
  new_tier TEXT;
  xp_thresholds INT[] := ARRAY[0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600, 8200, 10000, 12500, 15500, 19000, 23000, 28000, 34000, 41000, 50000];
BEGIN
  -- Get user's profile
  SELECT * INTO prof FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Map dynasty_tier to number for tier achievements
  tier_num := CASE prof.dynasty_tier
    WHEN 'ALL_CONFERENCE' THEN 1
    WHEN 'ALL_AMERICAN' THEN 2
    WHEN 'HEISMAN' THEN 3
    WHEN 'HALL_OF_FAME' THEN 4
    ELSE 0
  END;

  -- Loop through all active achievements not yet earned by this user
  FOR ach IN
    SELECT a.id, a.name, a.requirement_type, a.requirement_value, a.xp_reward
    FROM achievements a
    WHERE a.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
      )
  LOOP
    -- Determine current value based on requirement_type
    current_val := CASE ach.requirement_type
      -- Profile column-based (fast)
      WHEN 'post_count' THEN prof.post_count
      WHEN 'td_received_count' THEN prof.touchdown_count
      WHEN 'prediction_count' THEN prof.prediction_count
      WHEN 'correct_prediction_count' THEN prof.correct_predictions
      WHEN 'challenge_win_count' THEN prof.challenge_wins
      WHEN 'follower_count' THEN prof.follower_count
      WHEN 'level' THEN prof.level
      WHEN 'tier' THEN tier_num
      ELSE NULL
    END;

    -- For requirement types not on profiles, do COUNT queries
    IF current_val IS NULL THEN
      BEGIN
        CASE ach.requirement_type
          WHEN 'receipt_verified_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM posts WHERE author_id = p_user_id AND receipt_verified = true;
          WHEN 'rivalry_vote_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM rivalry_votes WHERE user_id = p_user_id;
          WHEN 'rivalry_participation_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM rivalry_votes WHERE user_id = p_user_id;
          WHEN 'portal_claim_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM roster_claims WHERE user_id = p_user_id;
          WHEN 'correct_portal_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM roster_claims WHERE user_id = p_user_id AND is_correct = true;
          WHEN 'challenge_issued_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM challenges WHERE challenger_id = p_user_id;
          WHEN 'aging_take_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM aging_takes WHERE user_id = p_user_id;
          WHEN 'fact_check_count' THEN
            SELECT COUNT(*) INTO current_val
            FROM fact_checks WHERE requester_id = p_user_id;
          ELSE
            current_val := 0;
        END CASE;
      EXCEPTION WHEN OTHERS THEN
        current_val := 0; -- Skip if table/column doesn't exist
      END;
    END IF;

    -- Check if user meets the requirement
    IF current_val >= ach.requirement_value THEN
      -- Insert into user_achievements (ON CONFLICT for safety)
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, ach.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;

      -- Award XP if the achievement has a reward
      IF ach.xp_reward > 0 THEN
        INSERT INTO xp_log (id, user_id, amount, source, reference_id, description)
        VALUES (gen_random_uuid(), p_user_id, ach.xp_reward, 'ACHIEVEMENT_UNLOCKED', ach.id, 'Achievement: ' || ach.name);

        total_new_xp := total_new_xp + ach.xp_reward;
      END IF;

      -- Create notification
      INSERT INTO notifications (id, recipient_id, type, data, created_at)
      VALUES (
        gen_random_uuid(),
        p_user_id,
        'ACHIEVEMENT_UNLOCKED',
        jsonb_build_object('achievement_name', ach.name, 'achievement_id', ach.id::text),
        now()
      );
    END IF;
  END LOOP;

  -- If any XP was awarded, update profile and recalculate level/tier
  IF total_new_xp > 0 THEN
    UPDATE profiles SET xp = xp + total_new_xp WHERE id = p_user_id
    RETURNING xp INTO new_xp;

    -- Recalculate level
    new_level := 1;
    FOR i IN 1..ARRAY_LENGTH(xp_thresholds, 1) LOOP
      IF new_xp >= xp_thresholds[i] THEN
        new_level := i;
      END IF;
    END LOOP;

    -- Recalculate tier
    new_tier := CASE
      WHEN new_level >= 18 THEN 'HALL_OF_FAME'
      WHEN new_level >= 14 THEN 'HEISMAN'
      WHEN new_level >= 10 THEN 'ALL_AMERICAN'
      WHEN new_level >= 7 THEN 'ALL_CONFERENCE'
      WHEN new_level >= 4 THEN 'STARTER'
      ELSE 'WALK_ON'
    END;

    UPDATE profiles SET level = new_level, dynasty_tier = new_tier WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function wrapper
CREATE OR REPLACE FUNCTION trigger_check_achievements()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent recursive calls (achievement XP updates profiles which would re-trigger)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM check_achievements(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_check_achievements ON profiles;

-- Create trigger that fires when relevant stats change
CREATE TRIGGER trg_check_achievements
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (
  OLD.post_count IS DISTINCT FROM NEW.post_count
  OR OLD.touchdown_count IS DISTINCT FROM NEW.touchdown_count
  OR OLD.level IS DISTINCT FROM NEW.level
  OR OLD.dynasty_tier IS DISTINCT FROM NEW.dynasty_tier
  OR OLD.prediction_count IS DISTINCT FROM NEW.prediction_count
  OR OLD.correct_predictions IS DISTINCT FROM NEW.correct_predictions
  OR OLD.challenge_wins IS DISTINCT FROM NEW.challenge_wins
  OR OLD.follower_count IS DISTINCT FROM NEW.follower_count
  OR OLD.xp IS DISTINCT FROM NEW.xp
)
EXECUTE FUNCTION trigger_check_achievements();
