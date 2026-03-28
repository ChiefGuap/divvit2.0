-- =============================================================================
-- Migration 001: profiles table, RLS policies, and new-user trigger
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  country       TEXT,
  date_of_birth DATE,
  avatar_url    TEXT,
  venmo_handle  TEXT,
  cashapp_handle TEXT,
  has_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. bills table (required by 002_bill_participants.sql)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  total       NUMERIC(10,2),
  tax         NUMERIC(10,2),
  tip         NUMERIC(10,2),
  subtotal    NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills    ENABLE ROW LEVEL SECURITY;

-- profiles: each user can only read and write their own row
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- bills: hosts own their bills; participants can view bills they're part of
CREATE POLICY "Users can view own bills"
  ON bills FOR SELECT
  USING (host_id = auth.uid());

CREATE POLICY "Users can create bills"
  ON bills FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their bills"
  ON bills FOR UPDATE
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their bills"
  ON bills FOR DELETE
  USING (host_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. Auto-create profile row when a new user signs up
--    This fires for BOTH email and OAuth (Google/Apple) sign-ups.
--    Without this trigger, OAuth users never get a profile row and
--    hasOnboarded stays false forever.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, has_onboarded, created_at, updated_at)
  VALUES (NEW.id, false, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop first in case it already exists with a different definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. Helper: automatically update updated_at on any profile change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
