-- ============================================================================
-- 012_rewards.sql — Rewards / Points System (Backend Only)
-- ----------------------------------------------------------------------------
-- Idempotent: safe to re-run.
--
-- Event types recorded in point_ledger.event_type:
--   RECURRING:
--     'daily_login'             +1pt   (max once per calendar day)
--     'split_bill'              +3pts  (per completed bill, per participant)
--     'split_with_divvit_user'  +5pts  per registered guest in the split
--     'use_promotion'           +2pts
--     'group_photo_bonus'       +5pts  (within 2 min of bill completion)
--
--   STREAKS:
--     'streak_3_day'            +15pts
--     'streak_7_day'            +45pts (replaces two 3-day bonuses; streak resets after)
--
--   ONE-TIME:
--     'first_split_bonus'       +25pts
--     'referral_signup'         +5pts  (to referrer when friend signs up)
--     'referral_first_split'    +10pts (to referrer when friend completes first split)
--
-- Real schema notes (differs from initial spec):
--   - Bill participants live in `bill_participants` (not `participants`)
--   - Non-host rows are marked `is_guest = TRUE` (no `is_host` column)
--   - Bill host column is `bills.host_id` (not `created_by`)
-- ============================================================================


-- ─── TABLE: point_ledger ────────────────────────────────────────────────────
-- Append-only ledger. User's balance = SUM(points) for that user_id.

CREATE TABLE IF NOT EXISTS public.point_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,                   -- positive = earned, negative = spent
  event_type TEXT NOT NULL,
  description TEXT,
  bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_ledger_user_id
  ON public.point_ledger(user_id);

CREATE INDEX IF NOT EXISTS idx_point_ledger_event_type
  ON public.point_ledger(user_id, event_type);

ALTER TABLE public.point_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own points" ON public.point_ledger;
CREATE POLICY "Users can view own points"
  ON public.point_ledger FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert points" ON public.point_ledger;
CREATE POLICY "Service role can insert points"
  ON public.point_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Note: server functions use SECURITY DEFINER and bypass this policy when
-- awarding points from triggers — the policy only constrains direct client
-- inserts, which are not used by this system.


-- ─── TABLE: user_rewards_state ──────────────────────────────────────────────
-- One row per user. Tracks streak, login-bonus dedup, one-time flags, referral.

CREATE TABLE IF NOT EXISTS public.user_rewards_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  current_streak_days INTEGER DEFAULT 0,
  last_split_date DATE,

  last_login_bonus_date DATE,

  has_received_first_split_bonus BOOLEAN DEFAULT FALSE,

  referred_by_user_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_rewards_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rewards state" ON public.user_rewards_state;
CREATE POLICY "Users can view own rewards state"
  ON public.user_rewards_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rewards state" ON public.user_rewards_state;
CREATE POLICY "Users can update own rewards state"
  ON public.user_rewards_state FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── TABLE: referrals ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  signup_completed BOOLEAN DEFAULT FALSE,
  first_split_completed BOOLEAN DEFAULT FALSE,
  referrer_signup_points_awarded BOOLEAN DEFAULT FALSE,
  referrer_split_points_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_user_id, referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() = referrer_user_id
    OR auth.uid() = referred_user_id
  );


-- ─── TABLE: rewards_catalog ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rewards_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  reward_type TEXT NOT NULL,                 -- 'gift_card', 'discount', 'cash_back', 'badge'
  reward_value TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rewards_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rewards" ON public.rewards_catalog;
CREATE POLICY "Anyone can view active rewards"
  ON public.rewards_catalog FOR SELECT
  USING (is_active = TRUE);

INSERT INTO public.rewards_catalog
  (name, description, points_required, reward_type, reward_value, display_order)
VALUES
  ('$5 Gift Card',  'Redeem for a $5 digital gift card',    500,  'gift_card', '$5',            1),
  ('$10 Gift Card', 'Redeem for a $10 digital gift card',   1000, 'gift_card', '$10',           2),
  ('$25 Gift Card', 'Redeem for a $25 digital gift card',   2500, 'gift_card', '$25',           3),
  ('Free Split',    'Get one free premium split feature',   200,  'discount',  'free_split',    4),
  ('Early Access',  'Get early access to new features',     150,  'badge',     'early_access',  5)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ─── get_user_points ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_points INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0)
    INTO total_points
    FROM public.point_ledger
   WHERE user_id = p_user_id;

  RETURN total_points;
END;
$$;


-- ─── award_points ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_event_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_bill_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  INSERT INTO public.point_ledger (
    user_id, points, event_type, description, bill_id, metadata
  )
  VALUES (
    p_user_id, p_points, p_event_type, p_description, p_bill_id, p_metadata
  );

  SELECT public.get_user_points(p_user_id) INTO new_balance;
  RETURN new_balance;
END;
$$;


-- ─── check_and_award_event_points ───────────────────────────────────────────
-- Dispatcher for every event type. Owns the streak / one-time / dedup logic.

CREATE OR REPLACE FUNCTION public.check_and_award_event_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_bill_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_awarded INTEGER := 0;
  v_new_balance INTEGER;
  v_rewards_state public.user_rewards_state%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_result JSONB;
BEGIN
  -- Ensure rewards_state row exists
  INSERT INTO public.user_rewards_state (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_rewards_state
    FROM public.user_rewards_state
   WHERE user_id = p_user_id;

  -- ─── DAILY LOGIN ────────────────────────────────────────────────────────
  IF p_event_type = 'daily_login' THEN
    IF v_rewards_state.last_login_bonus_date IS NULL
       OR v_rewards_state.last_login_bonus_date < v_today
    THEN
      PERFORM public.award_points(
        p_user_id, 1, 'daily_login', 'Daily login bonus'
      );
      v_points_awarded := 1;

      UPDATE public.user_rewards_state
         SET last_login_bonus_date = v_today,
             updated_at = NOW()
       WHERE user_id = p_user_id;
    END IF;

  -- ─── SPLIT BILL ─────────────────────────────────────────────────────────
  ELSIF p_event_type = 'split_bill' THEN
    -- Base
    PERFORM public.award_points(
      p_user_id, 3, 'split_bill', 'Completed a bill split', p_bill_id
    );
    v_points_awarded := 3;

    -- First-split (one-time)
    IF NOT v_rewards_state.has_received_first_split_bonus THEN
      PERFORM public.award_points(
        p_user_id, 25, 'first_split_bonus', 'First bill split bonus!', p_bill_id
      );
      v_points_awarded := v_points_awarded + 25;

      UPDATE public.user_rewards_state
         SET has_received_first_split_bonus = TRUE,
             updated_at = NOW()
       WHERE user_id = p_user_id;
    END IF;

    -- Streak logic
    IF v_rewards_state.last_split_date = v_yesterday THEN
      -- Streak continues
      UPDATE public.user_rewards_state
         SET current_streak_days = current_streak_days + 1,
             last_split_date = v_today,
             updated_at = NOW()
       WHERE user_id = p_user_id;

      SELECT * INTO v_rewards_state
        FROM public.user_rewards_state
       WHERE user_id = p_user_id;

      IF v_rewards_state.current_streak_days = 7 THEN
        PERFORM public.award_points(
          p_user_id, 45, 'streak_7_day', '7-day splitting streak!',
          p_bill_id, jsonb_build_object('streak_day', 7)
        );
        v_points_awarded := v_points_awarded + 45;

        UPDATE public.user_rewards_state
           SET current_streak_days = 0,
               updated_at = NOW()
         WHERE user_id = p_user_id;

      ELSIF v_rewards_state.current_streak_days = 3 THEN
        PERFORM public.award_points(
          p_user_id, 15, 'streak_3_day', '3-day splitting streak!',
          p_bill_id, jsonb_build_object('streak_day', 3)
        );
        v_points_awarded := v_points_awarded + 15;
        -- Do NOT reset — let streak continue toward 7
      END IF;

    ELSIF v_rewards_state.last_split_date = v_today THEN
      -- Already split today, no streak update
      NULL;

    ELSE
      -- Broken or first ever
      UPDATE public.user_rewards_state
         SET current_streak_days = 1,
             last_split_date = v_today,
             updated_at = NOW()
       WHERE user_id = p_user_id;
    END IF;

  -- ─── SPLIT WITH DIVVIT USER ─────────────────────────────────────────────
  ELSIF p_event_type = 'split_with_divvit_user' THEN
    DECLARE
      v_divvit_count INTEGER;
    BEGIN
      v_divvit_count := COALESCE((p_metadata->>'divvit_user_count')::INTEGER, 0);
      IF v_divvit_count > 0 THEN
        PERFORM public.award_points(
          p_user_id,
          5 * v_divvit_count,
          'split_with_divvit_user',
          'Split with ' || v_divvit_count || ' Divvit user(s)',
          p_bill_id,
          p_metadata
        );
        v_points_awarded := 5 * v_divvit_count;
      END IF;
    END;

  -- ─── USE PROMOTION ──────────────────────────────────────────────────────
  ELSIF p_event_type = 'use_promotion' THEN
    PERFORM public.award_points(
      p_user_id, 2, 'use_promotion', 'Used a promotion', p_bill_id, p_metadata
    );
    v_points_awarded := 2;

  -- ─── GROUP PHOTO BONUS ──────────────────────────────────────────────────
  ELSIF p_event_type = 'group_photo_bonus' THEN
    DECLARE
      v_minutes NUMERIC;
    BEGIN
      v_minutes := COALESCE((p_metadata->>'minutes_after_completion')::NUMERIC, 999);
      IF v_minutes <= 2 THEN
        PERFORM public.award_points(
          p_user_id, 5, 'group_photo_bonus',
          'Group photo taken within 2 minutes!',
          p_bill_id, p_metadata
        );
        v_points_awarded := 5;
      END IF;
    END;

  -- ─── REFERRAL SIGNUP ────────────────────────────────────────────────────
  ELSIF p_event_type = 'referral_signup' THEN
    PERFORM public.award_points(
      p_user_id, 5, 'referral_signup',
      'Friend signed up with your referral code!',
      NULL, p_metadata
    );
    v_points_awarded := 5;

  -- ─── REFERRAL FIRST SPLIT ───────────────────────────────────────────────
  ELSIF p_event_type = 'referral_first_split' THEN
    PERFORM public.award_points(
      p_user_id, 10, 'referral_first_split',
      'Your referred friend completed their first split!',
      NULL, p_metadata
    );
    v_points_awarded := 10;
  END IF;

  SELECT public.get_user_points(p_user_id) INTO v_new_balance;

  v_result := jsonb_build_object(
    'points_awarded', v_points_awarded,
    'new_balance', v_new_balance,
    'event_type', p_event_type
  );

  RETURN v_result;
END;
$$;


-- ─── generate_referral_code ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_username TEXT;
BEGIN
  SELECT username INTO v_username
    FROM public.profiles
   WHERE id = p_user_id;

  LOOP
    v_code := UPPER(
      COALESCE(LEFT(v_username, 4), 'DIVV') ||
      SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
    );

    SELECT EXISTS(
      SELECT 1 FROM public.user_rewards_state
       WHERE referral_code = v_code
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  UPDATE public.user_rewards_state
     SET referral_code = v_code,
         updated_at = NOW()
   WHERE user_id = p_user_id;

  RETURN v_code;
END;
$$;


-- ─── process_referral ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  SELECT user_id INTO v_referrer_id
    FROM public.user_rewards_state
   WHERE referral_code = UPPER(p_referral_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid referral code'
    );
  END IF;

  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot use your own referral code'
    );
  END IF;

  INSERT INTO public.referrals (
    referrer_user_id, referred_user_id, referral_code, signup_completed
  )
  VALUES (
    v_referrer_id, p_referred_user_id, UPPER(p_referral_code), TRUE
  )
  ON CONFLICT (referrer_user_id, referred_user_id) DO NOTHING;

  UPDATE public.user_rewards_state
     SET referred_by_user_id = v_referrer_id,
         updated_at = NOW()
   WHERE user_id = p_referred_user_id;

  UPDATE public.referrals
     SET referrer_signup_points_awarded = TRUE
   WHERE referrer_user_id = v_referrer_id
     AND referred_user_id = p_referred_user_id;

  PERFORM public.check_and_award_event_points(
    v_referrer_id,
    'referral_signup',
    NULL,
    jsonb_build_object('referred_user_id', p_referred_user_id)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'referrer_id', v_referrer_id
  );
END;
$$;


-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ─── On new profile: seed rewards state + referral code ─────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_rewards_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM public.generate_referral_code(NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_rewards ON public.profiles;
CREATE TRIGGER on_profile_created_rewards
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_rewards();


-- ─── On bill completed: award split-related points ──────────────────────────
-- Adapted to real schema: bill_participants.is_guest (TRUE = non-host), bills.host_id.

CREATE OR REPLACE FUNCTION public.handle_bill_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_divvit_user_count INTEGER;
  v_host_id UUID;
BEGIN
  IF NEW.status NOT IN ('completed', 'settled') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_host_id := NEW.host_id;

  -- Count registered Divvit users among the guests
  SELECT COUNT(*) INTO v_divvit_user_count
    FROM public.bill_participants p
    INNER JOIN public.profiles pr ON pr.id = p.user_id
   WHERE p.bill_id = NEW.id
     AND p.is_guest = TRUE
     AND p.user_id IS NOT NULL
     AND p.user_id <> v_host_id;

  -- Host: base split
  IF v_host_id IS NOT NULL THEN
    PERFORM public.check_and_award_event_points(
      v_host_id, 'split_bill', NEW.id
    );

    IF v_divvit_user_count > 0 THEN
      PERFORM public.check_and_award_event_points(
        v_host_id,
        'split_with_divvit_user',
        NEW.id,
        jsonb_build_object('divvit_user_count', v_divvit_user_count)
      );
    END IF;
  END IF;

  -- Each registered guest: base split
  FOR v_participant IN
    SELECT user_id
      FROM public.bill_participants
     WHERE bill_id = NEW.id
       AND is_guest = TRUE
       AND user_id IS NOT NULL
  LOOP
    PERFORM public.check_and_award_event_points(
      v_participant.user_id, 'split_bill', NEW.id
    );
  END LOOP;

  -- Referral first-split: if any guest was referred and hasn't yet hit this bonus
  FOR v_participant IN
    SELECT p.user_id, r.referrer_user_id
      FROM public.bill_participants p
      INNER JOIN public.referrals r
        ON r.referred_user_id = p.user_id
       AND r.first_split_completed = FALSE
       AND r.referrer_split_points_awarded = FALSE
     WHERE p.bill_id = NEW.id
       AND p.is_guest = TRUE
       AND p.user_id IS NOT NULL
  LOOP
    UPDATE public.referrals
       SET first_split_completed = TRUE,
           referrer_split_points_awarded = TRUE
     WHERE referred_user_id = v_participant.user_id
       AND referrer_user_id = v_participant.referrer_user_id;

    PERFORM public.check_and_award_event_points(
      v_participant.referrer_user_id,
      'referral_first_split',
      NEW.id,
      jsonb_build_object('referred_user_id', v_participant.user_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bill_completed ON public.bills;
CREATE TRIGGER on_bill_completed
  AFTER UPDATE OF status ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bill_completed();


-- ─── On group photo: award if within 2 minutes of bill completion ───────────

CREATE OR REPLACE FUNCTION public.handle_group_photo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_participant RECORD;
  v_minutes_since_completion NUMERIC;
BEGIN
  IF NEW.group_photo_url IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.group_photo_url IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('completed', 'settled') THEN
    RETURN NEW;
  END IF;

  v_minutes_since_completion :=
    EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 60.0;

  -- Host
  IF NEW.host_id IS NOT NULL THEN
    PERFORM public.check_and_award_event_points(
      NEW.host_id,
      'group_photo_bonus',
      NEW.id,
      jsonb_build_object('minutes_after_completion', v_minutes_since_completion)
    );
  END IF;

  -- Registered guests
  FOR v_participant IN
    SELECT user_id
      FROM public.bill_participants
     WHERE bill_id = NEW.id
       AND user_id IS NOT NULL
  LOOP
    PERFORM public.check_and_award_event_points(
      v_participant.user_id,
      'group_photo_bonus',
      NEW.id,
      jsonb_build_object('minutes_after_completion', v_minutes_since_completion)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_group_photo_added ON public.bills;
CREATE TRIGGER on_group_photo_added
  AFTER UPDATE OF group_photo_url ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_group_photo();
