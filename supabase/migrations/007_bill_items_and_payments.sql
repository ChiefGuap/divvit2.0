-- =============================================================================
-- Migration 007: bill_items table + payment_requests table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- Ensure the set_updated_at() helper exists (may not have been applied from 001)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 1. bill_items — individual line items with per-item assignment for realtime sync
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bill_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id     UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 1,
  assigned_to UUID,  -- references bill_participants.id (nullable = unclaimed)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Hosts can see items on their bills; participants can see items on bills they joined
CREATE POLICY "bill_items_select" ON public.bill_items FOR SELECT
USING (
  bill_id IN (SELECT id FROM public.bills WHERE host_id = auth.uid())
  OR is_bill_participant(bill_id, auth.uid())
);

-- Only host can insert items
CREATE POLICY "bill_items_insert" ON public.bill_items FOR INSERT
WITH CHECK (
  bill_id IN (SELECT id FROM public.bills WHERE host_id = auth.uid())
);

-- Any participant can update items (for claiming / unclaiming)
CREATE POLICY "bill_items_update" ON public.bill_items FOR UPDATE
USING (
  bill_id IN (SELECT id FROM public.bills WHERE host_id = auth.uid())
  OR is_bill_participant(bill_id, auth.uid())
);

-- Only host can delete items
CREATE POLICY "bill_items_delete" ON public.bill_items FOR DELETE
USING (
  bill_id IN (SELECT id FROM public.bills WHERE host_id = auth.uid())
);

-- Enable realtime so all participants receive assignment changes instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_items;

CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);

-- auto-update updated_at
CREATE TRIGGER bill_items_updated_at
  BEFORE UPDATE ON public.bill_items
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. payment_requests — tracks who owes whom and payment status
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id      UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id   UUID REFERENCES auth.users(id),
  amount       DECIMAL(10,2) NOT NULL,
  status       TEXT DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'confirmed')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Sender or receiver can view their payment requests
CREATE POLICY "payment_requests_select" ON public.payment_requests FOR SELECT
USING (
  auth.uid() = from_user_id
  OR auth.uid() = to_user_id
);

-- Only the bill host can create payment requests
CREATE POLICY "payment_requests_insert" ON public.payment_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bills
    WHERE id = payment_requests.bill_id
    AND host_id = auth.uid()
  )
);

-- Sender or receiver can update status (mark as sent / confirmed)
CREATE POLICY "payment_requests_update" ON public.payment_requests FOR UPDATE
USING (
  auth.uid() = from_user_id
  OR auth.uid() = to_user_id
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;

-- auto-update updated_at
CREATE TRIGGER payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Add apple_pay_enabled to profiles
--    (venmo_handle and cashapp_handle already exist from migration 001)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS apple_pay_enabled BOOLEAN DEFAULT FALSE;
