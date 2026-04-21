-- ============================================================
-- Referral System Migration
-- ============================================================

-- 1. New columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS char_limit INT DEFAULT 3000;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- 2. Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVATED')),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrals are viewable by everyone"
  ON referrals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert referrals"
  ON referrals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Seed admin_settings defaults for referral system
INSERT INTO admin_settings (key, value) VALUES
  ('referral_system_enabled', 'false'),
  ('referral_char_limits_enabled', 'false'),
  ('referral_base_char_limit', '500'),
  ('referral_xp_reward', '25'),
  ('referral_tiers', '[{"name":"Walk-On","minReferrals":0,"charLimit":500},{"name":"Recruited","minReferrals":5,"charLimit":750},{"name":"Scholarship","minReferrals":15,"charLimit":1000},{"name":"Captain","minReferrals":30,"charLimit":1500},{"name":"Coach","minReferrals":50,"charLimit":2000},{"name":"Commissioner","minReferrals":100,"charLimit":3000}]')
ON CONFLICT (key) DO NOTHING;

-- 4. Updated handle_new_user trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_code TEXT;
  random_suffix TEXT;
  final_code TEXT;
  ref_code_input TEXT;
  referrer_id UUID;
BEGIN
  -- Generate referral code: UPPER(username[0:12]) + '_' + random 4 chars
  base_code := UPPER(LEFT(
    REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'username', 'USER' || LEFT(NEW.id::TEXT, 8)),
      '[^A-Za-z0-9]', '', 'g'
    ),
    12
  ));
  random_suffix := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));
  final_code := base_code || '_' || random_suffix;

  -- Create the profile
  INSERT INTO public.profiles (id, username, display_name, avatar_url, referral_code, owner_id, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url',
    final_code,
    NEW.id,
    CASE WHEN NEW.raw_user_meta_data->>'school_id' IS NOT NULL AND NEW.raw_user_meta_data->>'school_id' != ''
      THEN (NEW.raw_user_meta_data->>'school_id')::UUID
      ELSE NULL
    END
  );

  -- Process referral code if provided
  ref_code_input := NEW.raw_user_meta_data->>'referral_code';
  IF ref_code_input IS NOT NULL AND ref_code_input != '' THEN
    -- Find the referrer (prevent self-referral)
    SELECT p.id INTO referrer_id
    FROM public.profiles p
    WHERE p.referral_code = UPPER(ref_code_input)
      AND p.id != NEW.id;

    IF referrer_id IS NOT NULL THEN
      -- Link the referral
      UPDATE public.profiles SET referred_by = referrer_id WHERE id = NEW.id;

      -- Create PENDING referral record
      INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
      VALUES (referrer_id, NEW.id, UPPER(ref_code_input), 'PENDING');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Activate referral on first post
CREATE OR REPLACE FUNCTION activate_referral_on_first_post()
RETURNS TRIGGER AS $$
DECLARE
  author_post_count INT;
  referrer UUID;
  new_referral_count INT;
  char_limits_enabled BOOLEAN;
  tiers_json JSONB;
  xp_reward INT;
  new_char_limit INT;
  tier JSONB;
BEGIN
  -- Get the author's current post count (already incremented by update_post_count trigger)
  SELECT post_count INTO author_post_count FROM profiles WHERE id = NEW.author_id;

  -- Only activate on first post
  IF author_post_count = 1 THEN
    -- Check if this user was referred (find PENDING referral)
    SELECT referrer_id INTO referrer
    FROM referrals
    WHERE referred_id = NEW.author_id
      AND status = 'PENDING';

    IF referrer IS NOT NULL THEN
      -- Activate the referral
      UPDATE referrals
      SET status = 'ACTIVATED', activated_at = NOW()
      WHERE referred_id = NEW.author_id AND status = 'PENDING';

      -- Increment referrer's referral_count
      UPDATE profiles
      SET referral_count = COALESCE(referral_count, 0) + 1
      WHERE id = referrer;

      -- Get new count
      SELECT referral_count INTO new_referral_count FROM profiles WHERE id = referrer;

      -- Read admin settings
      SELECT COALESCE(
        (SELECT value FROM admin_settings WHERE key = 'referral_char_limits_enabled'),
        'false'
      ) = 'true' INTO char_limits_enabled;

      SELECT COALESCE(
        (SELECT value::INT FROM admin_settings WHERE key = 'referral_xp_reward'),
        25
      ) INTO xp_reward;

      -- Recalculate char limit if enabled
      IF char_limits_enabled THEN
        SELECT COALESCE(
          (SELECT value::JSONB FROM admin_settings WHERE key = 'referral_tiers'),
          '[]'::JSONB
        ) INTO tiers_json;

        -- Default to base limit
        SELECT COALESCE(
          (SELECT value::INT FROM admin_settings WHERE key = 'referral_base_char_limit'),
          500
        ) INTO new_char_limit;

        -- Find the highest qualifying tier
        FOR tier IN SELECT * FROM jsonb_array_elements(tiers_json) ORDER BY (value->>'minReferrals')::INT DESC
        LOOP
          IF new_referral_count >= (tier->>'minReferrals')::INT THEN
            new_char_limit := (tier->>'charLimit')::INT;
            EXIT;
          END IF;
        END LOOP;

        UPDATE profiles SET char_limit = new_char_limit WHERE id = referrer;
      END IF;

      -- Award XP
      IF xp_reward > 0 THEN
        INSERT INTO xp_log (user_id, amount, source, reference_id, description)
        VALUES (referrer, xp_reward, 'REFERRAL_ACTIVATED', NEW.author_id, 'Referral activated');

        UPDATE profiles SET xp = COALESCE(xp, 0) + xp_reward WHERE id = referrer;
      END IF;

      -- Send notification to referrer
      INSERT INTO notifications (recipient_id, actor_id, type, data)
      VALUES (
        referrer,
        NEW.author_id,
        'REFERRAL_ACTIVATED',
        jsonb_build_object('referral_count', new_referral_count)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_first_post_activate_referral
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION activate_referral_on_first_post();

-- 6. Backfill referral codes for existing users who don't have one
DO $$
DECLARE
  r RECORD;
  base_code TEXT;
  random_suffix TEXT;
  final_code TEXT;
BEGIN
  FOR r IN SELECT id, username FROM profiles WHERE referral_code IS NULL
  LOOP
    base_code := UPPER(LEFT(
      REGEXP_REPLACE(COALESCE(r.username, 'USER' || LEFT(r.id::TEXT, 8)), '[^A-Za-z0-9]', '', 'g'),
      12
    ));
    random_suffix := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4));
    final_code := base_code || '_' || random_suffix;

    UPDATE profiles SET referral_code = final_code WHERE id = r.id;
  END LOOP;
END $$;
