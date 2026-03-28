-- =============================================================================
-- Migration 004: Guest RLS policies for the party/session flow
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Allow bill participants (guests) to SELECT bills they have joined.
--    Without this policy:
--      • Supabase Realtime will NOT deliver bill UPDATE events to guests
--        (Realtime uses RLS to filter events per client).
--      • The REST fetch in [id].tsx returns an empty array for guests,
--        so they see an empty bill editor.
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants can view bills they joined"
  ON bills FOR SELECT
  USING (
    id IN (
      SELECT bill_id FROM bill_participants WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Expand the bill_participants SELECT policy so that ALL members of a bill
--    can see ALL other members (not just the host and themselves).
--    Drop the existing too-narrow policy first, then recreate it.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view bill participants" ON bill_participants;

CREATE POLICY "Users can view bill participants"
  ON bill_participants FOR SELECT
  USING (
    -- Hosts can see all participants on their bills
    bill_id IN (SELECT id FROM bills WHERE host_id = auth.uid())
    OR
    -- Guests can see all participants on bills they have joined
    bill_id IN (SELECT bill_id FROM bill_participants WHERE user_id = auth.uid())
  );
