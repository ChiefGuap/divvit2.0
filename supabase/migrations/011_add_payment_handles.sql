-- Add Zelle and Apple Cash handles to the profiles table
-- This migration adds support for zero-fee P2P payment methods

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zelle_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apple_pay_handle TEXT;

-- Update the schema comment
COMMENT ON COLUMN profiles.zelle_handle IS 'Email or phone for Zelle transfers';
COMMENT ON COLUMN profiles.apple_pay_handle IS 'Phone or email for Apple Cash (iMessage) transfers';
