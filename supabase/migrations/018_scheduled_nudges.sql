-- Table to track scheduled nudges
CREATE TABLE IF NOT EXISTS public.scheduled_nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  -- 12 hours after bill completion
  sent_at TIMESTAMPTZ,
  -- null = not sent yet
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_nudges_status
  ON public.scheduled_nudges(status, scheduled_for);

ALTER TABLE public.scheduled_nudges
  ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write nudges
-- (backend uses service role key)

-- Store push tokens for users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
  -- This is set by the app when user grants notification permission

-- Trigger: when bill status becomes 'completed', 
-- schedule a nudge for 12 hours later
CREATE OR REPLACE FUNCTION public.schedule_payment_nudge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.scheduled_nudges (bill_id, scheduled_for)
    VALUES (
      NEW.id,
      NOW() + INTERVAL '12 hours'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bill_completed_nudge ON public.bills;
CREATE TRIGGER on_bill_completed_nudge
  AFTER UPDATE OF status ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_payment_nudge();
