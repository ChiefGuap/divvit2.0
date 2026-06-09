-- Migration 016: Add from_participant_id to payment_requests and update constraints
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS from_participant_id UUID REFERENCES public.bill_participants(id) ON DELETE CASCADE;

-- Drop old unique constraint (if exists)
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_bill_from_unique;

-- Add new unique constraint on (bill_id, from_participant_id) to prevent duplicate payment requests per participant
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_bill_from_participant_unique;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_bill_from_participant_unique
  UNIQUE (bill_id, from_participant_id);
