-- Fix 42P17: infinite recursion in RLS policies introduced by migration 004.
--
-- The cycle was:
--   bills SELECT policy  → queries bill_participants (check if user is participant)
--   bill_participants SELECT policy → queries bills (check if user is host)
--   → Postgres detects the cycle and raises 42P17 on every bills query.
--
-- Solution: a SECURITY DEFINER function queries bill_participants directly,
-- bypassing its RLS policy. Both table policies use this function, so neither
-- policy ever triggers the other table's RLS check.

CREATE OR REPLACE FUNCTION public.is_bill_participant(p_bill_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bill_participants
    WHERE bill_id = p_bill_id AND user_id = p_user_id
  );
$$;

-- Re-create bills participant policy using the function (no bill_participants RLS triggered)
DROP POLICY IF EXISTS "Participants can view bills they joined" ON public.bills;
CREATE POLICY "Participants can view bills they joined"
  ON public.bills FOR SELECT
  USING (
    is_bill_participant(id, auth.uid())
  );

-- Re-create bill_participants policy using the function (no bills RLS triggered)
DROP POLICY IF EXISTS "Users can view bill participants" ON public.bill_participants;
CREATE POLICY "Users can view bill participants"
  ON public.bill_participants FOR SELECT
  USING (
    is_bill_participant(bill_id, auth.uid())
  );
