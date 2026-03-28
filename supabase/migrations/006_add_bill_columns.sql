-- Add total_amount column (code uses total_amount; schema originally only had total)
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2);

-- Backfill from existing total column so old rows aren't blank
UPDATE public.bills
  SET total_amount = total
  WHERE total_amount IS NULL AND total IS NOT NULL;

-- Add details JSONB column for storing items, scannedTip, etc.
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
