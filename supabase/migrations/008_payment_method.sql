-- Migration 008: Add payment_method column to payment_requests
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;
