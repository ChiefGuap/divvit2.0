-- ============================================================================
-- 013_point_events_catalog.sql
-- ----------------------------------------------------------------------------
-- Move point values out of the function body into an editable table so a
-- non-engineer can change rewards through the Supabase UI.
--
-- After this runs:
--   - `point_events_catalog` lists every event_type, its points value,
--     description, category, active flag, and notes.
--   - `check_and_award_event_points` reads from this table instead of using
--     hardcoded numbers.
--   - To change a reward: edit the `points`, `description`, or `is_active`
--     column for that row in the Supabase Table Editor. Effective immediately.
--   - To DISABLE an event entirely: set `is_active = FALSE` for that row.
--     No points will be awarded; state-tracking side-effects (streak counter,
--     login dedup, first-split flag) still run.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ─── TABLE: point_events_catalog ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.point_events_catalog (
  event_type TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT,                             -- 'recurring', 'streak', 'one_time'
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,                                -- internal notes for the team
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.point_events_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view event catalog" ON public.point_events_catalog;
CREATE POLICY "Authenticated can view event catalog"
  ON public.point_events_catalog FOR SELECT
  USING (auth.role() = 'authenticated');
-- Writes only happen through the Supabase dashboard (service role) — no
-- INSERT/UPDATE/DELETE policy means clients cannot modify.


-- ─── updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.point_events_catalog_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS point_events_catalog_updated_at ON public.point_events_catalog;
CREATE TRIGGER point_events_catalog_updated_at
  BEFORE UPDATE ON public.point_events_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.point_events_catalog_set_updated_at();


-- ─── Seed values ────────────────────────────────────────────────────────────

INSERT INTO public.point_events_catalog
  (event_type, points, description, category, notes)
VALUES
  ('daily_login',             1,  'Daily login bonus',
   'recurring', 'Awarded at most once per calendar day on sign-in.'),

  ('split_bill',              3,  'Completed a bill split',
   'recurring', 'Awarded per completed bill, to host AND every registered guest.'),

  ('split_with_divvit_user',  5,  'Split with another Divvit user',
   'recurring', 'Per registered guest in the split. Awarded to host only. Total = points × guest_count.'),

  ('use_promotion',           2,  'Used a promotion',
   'recurring', 'Hook for future promo redemptions; not wired up yet.'),

  ('group_photo_bonus',       5,  'Group photo taken within 2 minutes!',
   'recurring', 'Only fires if group photo is added within 2 min of bill completion.'),

  ('streak_3_day',           15,  '3-day splitting streak!',
   'streak',    'Auto-awarded on day 3 of consecutive daily splits. Streak continues toward day 7.'),

  ('streak_7_day',           45,  '7-day splitting streak!',
   'streak',    'Auto-awarded on day 7. Streak counter resets to 0 after.'),

  ('first_split_bonus',      25,  'First bill split bonus!',
   'one_time',  'Once per user, on their first ever completed split.'),

  ('referral_signup',         5,  'Friend signed up with your referral code!',
   'one_time',  'Awarded to referrer when a referred friend completes signup.'),

  ('referral_first_split',   10,  'Your referred friend completed their first split!',
   'one_time',  'Awarded to referrer when a referred friend completes their first split.')
ON CONFLICT (event_type) DO NOTHING;


-- ─── Helper: award_catalog_event ────────────────────────────────────────────
-- Looks up an event in the catalog and inserts a ledger row if active.
-- Returns the number of points actually awarded (0 if inactive/missing/zero).
-- p_multiplier handles the "5 × N divvit users" case.

CREATE OR REPLACE FUNCTION public.award_catalog_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_bill_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_multiplier INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config public.point_events_catalog%ROWTYPE;
  v_total INTEGER;
BEGIN
  SELECT * INTO v_config
    FROM public.point_events_catalog
   WHERE event_type = p_event_type;

  IF NOT FOUND OR NOT v_config.is_active OR v_config.points = 0 THEN
    RETURN 0;
  END IF;

  v_total := v_config.points * p_multiplier;

  PERFORM public.award_points(
    p_user_id,
    v_total,
    p_event_type,
    v_config.description,
    p_bill_id,
    p_metadata
  );

  RETURN v_total;
END;
$$;


-- ─── Rewrite check_and_award_event_points to use the catalog ────────────────
-- Same state/streak/dedup logic as in 012, but every points value now comes
-- from `point_events_catalog`.

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
      v_points_awarded := public.award_catalog_event(
        p_user_id, 'daily_login'
      );

      UPDATE public.user_rewards_state
         SET last_login_bonus_date = v_today,
             updated_at = NOW()
       WHERE user_id = p_user_id;
    END IF;

  -- ─── SPLIT BILL ─────────────────────────────────────────────────────────
  ELSIF p_event_type = 'split_bill' THEN
    v_points_awarded := public.award_catalog_event(
      p_user_id, 'split_bill', p_bill_id
    );

    -- First-split (one-time)
    IF NOT v_rewards_state.has_received_first_split_bonus THEN
      v_points_awarded := v_points_awarded + public.award_catalog_event(
        p_user_id, 'first_split_bonus', p_bill_id
      );

      UPDATE public.user_rewards_state
         SET has_received_first_split_bonus = TRUE,
             updated_at = NOW()
       WHERE user_id = p_user_id;
    END IF;

    -- Streak logic
    IF v_rewards_state.last_split_date = v_yesterday THEN
      UPDATE public.user_rewards_state
         SET current_streak_days = current_streak_days + 1,
             last_split_date = v_today,
             updated_at = NOW()
       WHERE user_id = p_user_id;

      SELECT * INTO v_rewards_state
        FROM public.user_rewards_state
       WHERE user_id = p_user_id;

      IF v_rewards_state.current_streak_days = 7 THEN
        v_points_awarded := v_points_awarded + public.award_catalog_event(
          p_user_id, 'streak_7_day', p_bill_id,
          jsonb_build_object('streak_day', 7)
        );

        UPDATE public.user_rewards_state
           SET current_streak_days = 0,
               updated_at = NOW()
         WHERE user_id = p_user_id;

      ELSIF v_rewards_state.current_streak_days = 3 THEN
        v_points_awarded := v_points_awarded + public.award_catalog_event(
          p_user_id, 'streak_3_day', p_bill_id,
          jsonb_build_object('streak_day', 3)
        );
        -- Do NOT reset — let streak continue toward 7
      END IF;

    ELSIF v_rewards_state.last_split_date = v_today THEN
      NULL;

    ELSE
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
        v_points_awarded := public.award_catalog_event(
          p_user_id, 'split_with_divvit_user', p_bill_id, p_metadata, v_divvit_count
        );
      END IF;
    END;

  -- ─── USE PROMOTION ──────────────────────────────────────────────────────
  ELSIF p_event_type = 'use_promotion' THEN
    v_points_awarded := public.award_catalog_event(
      p_user_id, 'use_promotion', p_bill_id, p_metadata
    );

  -- ─── GROUP PHOTO BONUS ──────────────────────────────────────────────────
  ELSIF p_event_type = 'group_photo_bonus' THEN
    DECLARE
      v_minutes NUMERIC;
    BEGIN
      v_minutes := COALESCE((p_metadata->>'minutes_after_completion')::NUMERIC, 999);
      IF v_minutes <= 2 THEN
        v_points_awarded := public.award_catalog_event(
          p_user_id, 'group_photo_bonus', p_bill_id, p_metadata
        );
      END IF;
    END;

  -- ─── REFERRAL SIGNUP ────────────────────────────────────────────────────
  ELSIF p_event_type = 'referral_signup' THEN
    v_points_awarded := public.award_catalog_event(
      p_user_id, 'referral_signup', NULL, p_metadata
    );

  -- ─── REFERRAL FIRST SPLIT ───────────────────────────────────────────────
  ELSIF p_event_type = 'referral_first_split' THEN
    v_points_awarded := public.award_catalog_event(
      p_user_id, 'referral_first_split', NULL, p_metadata
    );
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
