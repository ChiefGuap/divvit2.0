-- =============================================================================
-- Migration 012: Fix payment_requests RLS — split update policy by role
-- 
-- PROBLEM: The current policy lets EITHER sender or receiver update status
-- to ANY value. A guest could mark their own payment as "confirmed" without
-- the host verifying they actually received the money.
--
-- FIX: 
--   - Sender (from_user_id) can only set status to 'sent'
--   - Receiver/Host (to_user_id) can set status to 'sent' or 'confirmed'
-- =============================================================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "payment_requests_update" ON public.payment_requests;

-- Sender can only mark as 'sent' (they're saying "I paid")
CREATE POLICY "payment_requests_sender_update" ON public.payment_requests
FOR UPDATE USING (auth.uid() = from_user_id)
WITH CHECK (status = 'sent');

-- Receiver (host) can mark as 'confirmed' or reset to 'sent'
CREATE POLICY "payment_requests_receiver_update" ON public.payment_requests
FOR UPDATE USING (auth.uid() = to_user_id)
WITH CHECK (status IN ('sent', 'confirmed'));
