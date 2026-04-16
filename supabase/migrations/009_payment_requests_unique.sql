-- Migration 009: Add unique constraint on payment_requests(bill_id, from_user_id)
-- Required for upsert operations to prevent duplicate payment requests per participant
ALTER TABLE public.payment_requests
  DROP CONSTRAINT IF EXISTS payment_requests_bill_from_unique;

ALTER TABLE public.payment_requests
  ADD CONSTRAINT payment_requests_bill_from_unique
  UNIQUE (bill_id, from_user_id);
