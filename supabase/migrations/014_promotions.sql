-- ─── Promotions / Deals table ───────────────────────────────────────────────
-- Stores scraped food deals from various sources (KCL, etc.).
-- Used by the promotions swipe-card UI in the Divvit app.

CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY,                       -- stable MD5 hash from restaurant+title
    restaurant_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    badge_text TEXT DEFAULT 'Deal',
    deal_type TEXT DEFAULT 'discount',          -- coupon, bogo, free_item, discount, gift_card, app_deal
    source_url TEXT,
    image_url TEXT,
    is_national BOOLEAN DEFAULT true,           -- true = available at all chain locations
    latitude DOUBLE PRECISION,                  -- for location-specific deals
    longitude DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for active deals query (most common frontend query)
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (is_active)
    WHERE is_active = true;

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_promotions_location ON public.promotions (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ─── RLS Policies ───────────────────────────────────────────────────────────
-- Everyone can read promotions (they're public deals)
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anonymous users to read promotions
CREATE POLICY "Anyone can read promotions"
    ON public.promotions FOR SELECT
    USING (true);

-- Only service role (backend) can insert/update/delete
-- This is automatically enforced by using the service role key in the backend.
-- No explicit policy needed for insert/update/delete since RLS blocks them
-- for anon/authenticated users by default.

-- Grant read access to anon and authenticated roles
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT ON public.promotions TO authenticated;
