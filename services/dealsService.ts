/**
 * Deals Service — fetches real food deals from Supabase and the backend scraper.
 *
 * Architecture:
 * 1. Primary: Query Supabase `promotions` table directly (fast, cached by Supabase)
 * 2. Fallback: Call backend `/api/v1/deals` which triggers scraping if needed
 * 3. The backend scrapes sources + upserts to Supabase on a 24-hour cycle
 */

import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Deal = {
  id: string;
  restaurant: string;
  title: string;
  description: string;
  distance: string;
  rating: number;
  saves: string;
  badge: string;
  imageUrl: string | null;
  pointsAwarded: number;
  dealType: string;
  source: string;
};

type SupabasePromotion = {
  id: string;
  restaurant_name: string;
  title: string;
  description: string | null;
  badge_text: string | null;
  deal_type: string | null;
  source_url: string | null;
  image_url: string | null;
  is_national: boolean;
  is_active: boolean;
  scraped_at: string | null;
};

// ─── Backend API URL ────────────────────────────────────────────────────────

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

// ─── Supabase → Deal Mapper ─────────────────────────────────────────────────

function mapSupabaseToDeal(row: SupabasePromotion): Deal {
  // Generate pseudo-rating and saves from the deal ID for consistency
  const hash = row.id
    .split('')
    .reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);

  return {
    id: row.id,
    restaurant: row.restaurant_name,
    title: row.title,
    description: row.description || '',
    distance: 'Nearby',  // Will be replaced by location-based distance
    rating: 4.3 + (hash % 7) / 10, // 4.3 - 4.9
    saves: `${((hash % 50) + 1) * 100}`,
    badge: row.badge_text || 'Deal',
    imageUrl: row.image_url,
    pointsAwarded: 2,
    dealType: row.deal_type || 'discount',
    source: row.source_url || '',
  };
}

// ─── Primary: Fetch from Supabase ───────────────────────────────────────────

export async function fetchDealsFromSupabase(): Promise<Deal[]> {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('scraped_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[DealsService] Supabase query error:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[DealsService] No deals in Supabase, will trigger backend scrape');
      return [];
    }

    console.log(`[DealsService] Fetched ${data.length} deals from Supabase`);
    return data.map(mapSupabaseToDeal);
  } catch (err) {
    console.error('[DealsService] Supabase fetch failed:', err);
    return [];
  }
}

// ─── Fallback: Trigger Backend Scrape ───────────────────────────────────────

export async function triggerBackendScrape(): Promise<Deal[]> {
  try {
    console.log(`[DealsService] Triggering backend scrape: ${BACKEND_URL}/api/v1/deals`);
    const response = await fetch(`${BACKEND_URL}/api/v1/deals`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error(`[DealsService] Backend scrape failed: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.deals && Array.isArray(data.deals)) {
      console.log(`[DealsService] Backend returned ${data.deals.length} deals`);
      return data.deals.map((d: any) => ({
        id: d.id,
        restaurant: d.restaurant,
        title: d.title,
        description: d.description,
        distance: d.distance || 'Nearby',
        rating: d.rating || 4.5,
        saves: d.saves || '0',
        badge: d.badge || 'Deal',
        imageUrl: d.image_url || null,
        pointsAwarded: d.points_awarded || 2,
        dealType: d.deal_type || 'discount',
        source: d.source || '',
      }));
    }

    return [];
  } catch (err) {
    console.error('[DealsService] Backend scrape error:', err);
    return [];
  }
}

// ─── Force Refresh ──────────────────────────────────────────────────────────

export async function forceRefreshDeals(): Promise<Deal[]> {
  try {
    console.log('[DealsService] Forcing deal refresh...');
    const response = await fetch(`${BACKEND_URL}/api/v1/deals/refresh`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      console.error(`[DealsService] Force refresh failed: ${response.status}`);
    }
  } catch (err) {
    console.error('[DealsService] Force refresh error:', err);
  }

  // After triggering refresh, fetch the fresh data from Supabase
  // Give Supabase a moment to receive the upsert
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return fetchDealsFromSupabase();
}

// ─── Main Fetch (Supabase-first, backend fallback) ──────────────────────────

export async function fetchDeals(): Promise<Deal[]> {
  // 1. Try Supabase first (fastest path)
  let deals = await fetchDealsFromSupabase();

  if (deals.length > 0) {
    return deals;
  }

  // 2. No deals in Supabase — trigger backend to scrape
  deals = await triggerBackendScrape();

  if (deals.length > 0) {
    return deals;
  }

  // 3. Last resort — return empty (UI will show empty state)
  console.warn('[DealsService] No deals available from any source');
  return [];
}
