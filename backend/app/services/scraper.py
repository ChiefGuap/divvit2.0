"""
Deal Scraper Service — fetches food deals from web sources and uses
Gemini AI to extract structured deal data.

Supports multiple sources with a pluggable architecture.
Cached in memory with a 24-hour TTL to avoid hammering source sites.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 hours

DEAL_SOURCES = [
    {
        "name": "The Krazy Coupon Lady",
        "url": "https://thekrazycouponlady.com/tips/money/food-deals-near-me",
        "category": "food",
    },
]

EXTRACTION_PROMPT = """You are a data extraction assistant. Given the following HTML content from a food deals webpage, extract ALL restaurant food deals mentioned.

For each deal, extract:
- restaurant: The restaurant/chain name (e.g., "Shake Shack", "Pizza Hut")
- title: A short title for the deal (e.g., "FREE Fries with Any Purchase", "BOGO Burrito")
- description: A 1-2 sentence description of the deal
- badge: A badge/label like "Limited Time", "Today Only", "BOGO", "Free Item", "App Exclusive", etc.
- deal_type: One of: "coupon", "bogo", "free_item", "discount", "gift_card", "app_deal"
- expires_info: Any expiration date or time info mentioned (or null if not specified)

Return ONLY a JSON array of deal objects. No markdown, no code fences, just raw JSON.
Example output format:
[
    {
        "restaurant": "Shake Shack",
        "title": "$1 Sodas All Month",
        "description": "Get any fountain soda for just $1 at participating Shake Shack locations.",
        "badge": "Monthly Deal",
        "deal_type": "discount",
        "expires_info": "End of May 2026"
    }
]

Extract as many unique deals as possible. Focus on deals from national restaurant chains.
If no deals are found, return an empty array: []

Here is the HTML content:
"""


# ─── Corporate Brand Logo Resolver ────────────────────────────────────────────

RESTAURANT_DOMAINS = {
    "mcdonald's": "mcdonalds.com",
    "taco bell": "tacobell.com",
    "domino's": "dominos.com",
    "burger king": "bk.com",
    "starbucks": "starbucks.com",
    "subway": "subway.com",
    "chipotle": "chipotle.com",
    "wendy's": "wendys.com",
    "pizza hut": "pizzahut.com",
    "popeyes": "popeyes.com",
    "dunkin'": "dunkindonuts.com",
    "sonic": "sonicdrivein.com",
    "panda express": "pandaexpress.com",
    "habit burger": "habitburger.com",
    "chick-fil-a": "chick-fil-a.com",
}

import re

def get_deal_image(restaurant: str, title: str = "", description: str = "") -> str:
    """Resolve the official, crisp corporate brand logo image URL from Hunter.io."""
    rest_key = restaurant.lower().strip()
    
    # 1. Exact or keyword match from domain dictionary
    for brand, domain in RESTAURANT_DOMAINS.items():
        if brand in rest_key or rest_key in brand:
            return f"https://logos.hunter.io/{domain}"
            
    # 2. Guess the domain dynamically (clean special characters, strip common words)
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', rest_key)
    clean_name = re.sub(r'\b(restaurant|restaurants|cafe|grill|bar|kitchen|express|co|corp|corporation|inc|llc|shop|store|company)\b', '', clean_name).strip()
    words = clean_name.split()
    if words:
        domain_guess = "".join(words) + ".com"
        return f"https://logos.hunter.io/{domain_guess}"
        
    return ""


# ─── In-memory cache ─────────────────────────────────────────────────────────

_cache: Dict[str, Any] = {
    "deals": [],
    "last_scraped": 0,
    "scrape_count": 0,
}


def _cache_is_fresh() -> bool:
    """Check if cached deals are still within the TTL window."""
    return (time.time() - _cache["last_scraped"]) < CACHE_TTL_SECONDS and len(_cache["deals"]) > 0


# ─── HTML Fetching & Cleaning ────────────────────────────────────────────────

def _fetch_page(url: str) -> str:
    """Fetch a webpage and return cleaned text content for Gemini."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    # Remove script/style/nav/footer noise
    for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
        tag.decompose()

    # Extract text content — Gemini works well with clean text
    text_content = soup.get_text(separator="\n", strip=True)

    # Also grab any structured data (JSON-LD) which often has deal info
    structured_data = ""
    for script in BeautifulSoup(response.text, "lxml").find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
            structured_data += f"\n\nStructured Data: {json.dumps(data, indent=2)}"
        except (json.JSONDecodeError, TypeError):
            continue

    # Limit content size to avoid token limits (keep first ~15k chars)
    combined = text_content[:12000] + structured_data[:3000]
    return combined


# ─── Gemini Extraction ───────────────────────────────────────────────────────

async def _extract_deals_with_gemini(page_content: str, source_name: str) -> List[Dict[str, Any]]:
    """Use Gemini AI to extract structured deal data from page content.

    Tries gemini-2.5-flash first, falls back to gemini-2.0-flash on 503 errors.
    Retries up to 3 times with exponential backoff.
    """
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.error("GEMINI_API_KEY not set — cannot extract deals")
        return []

    client = genai.Client(api_key=api_key)

    prompt = EXTRACTION_PROMPT + page_content

    # Try models in order — fallback if primary is overloaded
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash"]
    max_retries = 2

    for model_name in models_to_try:
        for attempt in range(max_retries):
            try:
                logger.info(f"Trying {model_name} (attempt {attempt + 1}/{max_retries}) for {source_name}")
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model_name,
                    contents=[types.Content(parts=[types.Part.from_text(text=prompt)])],
                )

                response_text = response.text.strip()

                # Remove markdown code fences if present
                if response_text.startswith("```"):
                    lines = response_text.split("\n")
                    # Remove first and last lines (``` markers)
                    response_text = "\n".join(lines[1:-1])

                deals = json.loads(response_text)

                if not isinstance(deals, list):
                    logger.warning(f"Gemini returned non-list for {source_name}: {type(deals)}")
                    return []

                # Tag each deal with source info and generate a stable ID
                for deal in deals:
                    deal["source"] = source_name
                    # Generate stable ID from restaurant + title
                    id_seed = f"{deal.get('restaurant', '')}-{deal.get('title', '')}".lower()
                    deal["id"] = hashlib.md5(id_seed.encode()).hexdigest()[:12]
                    
                    # Resolve and attach the premium image cover
                    rest = deal.get("restaurant", "Unknown")
                    t = deal.get("title", "")
                    d = deal.get("description", "")
                    deal["image_url"] = get_deal_image(rest, t, d)

                logger.info(f"Extracted {len(deals)} deals from {source_name} using {model_name}")
                return deals

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response as JSON: {e}")
                return []
            except Exception as e:
                error_str = str(e)
                is_503 = "503" in error_str or "UNAVAILABLE" in error_str
                logger.warning(f"{model_name} attempt {attempt + 1} failed for {source_name}: {e}")

                if is_503 and attempt < max_retries - 1:
                    delay = 3 * (attempt + 1)  # 3s, 6s
                    logger.info(f"Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                elif is_503:
                    logger.info(f"{model_name} unavailable, trying next model...")
                    break  # Try next model
                else:
                    logger.error(f"Gemini extraction failed for {source_name}: {e}")
                    return []

    logger.error(f"All Gemini models failed for {source_name}")
    return []


# ─── Supabase Persistence ────────────────────────────────────────────────────

def _get_supabase_client():
    """Create a Supabase client using environment variables."""
    try:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")

        if not url or not key:
            logger.warning("Supabase credentials not set — deals won't be persisted")
            return None

        return create_client(url, key)
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


async def _upsert_deals_to_supabase(deals: List[Dict[str, Any]]) -> None:
    """Upsert scraped deals into the Supabase promotions table."""
    client = _get_supabase_client()
    if not client:
        return

    now = datetime.now(timezone.utc).isoformat()

    rows = []
    for deal in deals:
        rows.append({
            "id": deal.get("id"),
            "restaurant_name": deal.get("restaurant", "Unknown"),
            "title": deal.get("title", ""),
            "description": deal.get("description", ""),
            "badge_text": deal.get("badge", ""),
            "deal_type": deal.get("deal_type", "discount"),
            "source_url": deal.get("source", ""),
            "image_url": deal.get("image_url", ""),
            "is_national": True,
            "is_active": True,
            "scraped_at": now,
        })

    try:
        # Upsert so we don't create duplicates on re-scrape
        await asyncio.to_thread(
            lambda: client.table("promotions").upsert(rows, on_conflict="id").execute()
        )
        logger.info(f"Upserted {len(rows)} deals to Supabase")
    except Exception as e:
        logger.error(f"Failed to upsert deals to Supabase: {e}")


# ─── Public API ──────────────────────────────────────────────────────────────

async def scrape_all_deals(force: bool = False) -> List[Dict[str, Any]]:
    """
    Scrape deals from all configured sources.

    Args:
        force: If True, bypass the cache and re-scrape.

    Returns:
        List of structured deal dictionaries.
    """
    if not force and _cache_is_fresh():
        logger.info(f"Returning {len(_cache['deals'])} cached deals")
        return _cache["deals"]

    logger.info("Starting deal scrape from all sources...")
    all_deals: List[Dict[str, Any]] = []

    for source in DEAL_SOURCES:
        try:
            logger.info(f"Fetching {source['name']}: {source['url']}")
            page_content = _fetch_page(source["url"])
            deals = await _extract_deals_with_gemini(page_content, source["name"])
            all_deals.extend(deals)
        except requests.RequestException as e:
            logger.error(f"Failed to fetch {source['name']}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error scraping {source['name']}: {e}")

    if all_deals:
        # Update cache
        _cache["deals"] = all_deals
        _cache["last_scraped"] = time.time()
        _cache["scrape_count"] += 1

        # Persist to Supabase in the background
        try:
            await _upsert_deals_to_supabase(all_deals)
        except Exception as e:
            logger.error(f"Background Supabase upsert failed: {e}")
    else:
        logger.warning("No deals scraped — keeping previous cache if available")

    return _cache["deals"] if _cache["deals"] else all_deals


def get_cache_status() -> Dict[str, Any]:
    """Return current cache statistics."""
    return {
        "cached_deals": len(_cache["deals"]),
        "last_scraped": datetime.fromtimestamp(_cache["last_scraped"], tz=timezone.utc).isoformat()
        if _cache["last_scraped"] > 0
        else None,
        "cache_fresh": _cache_is_fresh(),
        "scrape_count": _cache["scrape_count"],
        "ttl_seconds": CACHE_TTL_SECONDS,
    }
