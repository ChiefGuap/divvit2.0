-- Migration 017: Fix points double-firing and registered guests query issues

-- ─── On bill completed: award split-related points ──────────────────────────
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
  -- Double-firing fix: skip if transitioning between completed and settled
  IF OLD.status IN ('completed', 'settled') THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('completed', 'settled') THEN
    RETURN NEW;
  END IF;

  v_host_id := NEW.host_id;

  -- Count registered Divvit users among the guests (excluding host, removing is_guest = TRUE check since registered users are is_guest = false)
  SELECT COUNT(*) INTO v_divvit_user_count
    FROM public.bill_participants p
    INNER JOIN public.profiles pr ON pr.id = p.user_id
   WHERE p.bill_id = NEW.id
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

  -- Each registered guest: base split (removing is_guest = TRUE check)
  FOR v_participant IN
    SELECT user_id
      FROM public.bill_participants
     WHERE bill_id = NEW.id
       AND user_id IS NOT NULL
       AND user_id <> v_host_id
  LOOP
    PERFORM public.check_and_award_event_points(
      v_participant.user_id, 'split_bill', NEW.id
    );
  END LOOP;

  -- Referral first-split: if any guest was referred and hasn't yet hit this bonus (removing is_guest = TRUE check)
  FOR v_participant IN
    SELECT p.user_id, r.referrer_user_id
      FROM public.bill_participants p
      INNER JOIN public.referrals r
        ON r.referred_user_id = p.user_id
       AND r.first_split_completed = FALSE
       AND r.referrer_split_points_awarded = FALSE
     WHERE p.bill_id = NEW.id
       AND p.user_id IS NOT NULL
       AND p.user_id <> v_host_id
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

  -- Registered guests (excluding host to prevent double-award in loop)
  FOR v_participant IN
    SELECT user_id
      FROM public.bill_participants
     WHERE bill_id = NEW.id
       AND user_id IS NOT NULL
       AND user_id <> NEW.host_id
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
