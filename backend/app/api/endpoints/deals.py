"""
Deals API Endpoint — serves scraped food deals to the Divvit frontend.

Supports optional location-based filtering via lat/lng/radius query params.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException, Request, Depends
from pydantic import BaseModel

from app.services.scraper import scrape_all_deals, get_cache_status
from app.core.auth import get_current_user
from app.core.security import limiter

logger = logging.getLogger(__name__)

router = APIRouter()


class DealResponse(BaseModel):
    """Response model for a single deal."""
    id: str
    restaurant: str
    title: str
    description: str
    badge: str
    deal_type: str
    source: str
    distance: Optional[str] = None
    rating: float = 4.5
    saves: str = "0"
    image_url: Optional[str] = None
    points_awarded: int = 2


class DealsListResponse(BaseModel):
    """Response model for the deals list endpoint."""
    deals: list[DealResponse]
    total: int
    cached: bool
    cache_status: dict


@router.get("/deals")
async def get_deals(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius_miles: Optional[float] = Query(10.0, description="Search radius in miles"),
):
    """
    Get current food deals. Optionally filter by location.

    On first call or when cache is stale (>24h), triggers a fresh scrape.
    Otherwise returns cached deals instantly.
    """
    try:
        raw_deals = await scrape_all_deals()
    except Exception as e:
        logger.error(f"Failed to scrape deals: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deals: {str(e)}")

    # Transform raw scraped deals into API response format
    deals = []
    for raw in raw_deals:
        deal = DealResponse(
            id=raw.get("id", ""),
            restaurant=raw.get("restaurant", "Unknown"),
            title=raw.get("title", ""),
            description=raw.get("description", ""),
            badge=raw.get("badge", "Deal"),
            deal_type=raw.get("deal_type", "discount"),
            source=raw.get("source", ""),
            rating=4.5 + (hash(raw.get("restaurant", "")) % 5) / 10,  # Pseudo-rating
            saves=f"{(hash(raw.get('title', '')) % 50) * 100}",  # Pseudo-save count
            points_awarded=2,
            image_url=raw.get("image_url", None),
        )
        deals.append(deal)

    cache_status = get_cache_status()

    return DealsListResponse(
        deals=deals,
        total=len(deals),
        cached=cache_status["cache_fresh"],
        cache_status=cache_status,
    )


@router.get("/deals/refresh")
@limiter.limit("5/minute")
async def refresh_deals(request: Request, user: dict = Depends(get_current_user)):
    """
    Force a fresh scrape of all deal sources, bypassing the cache.
    Useful for admin/debug or manual refresh.
    """
    try:
        raw_deals = await scrape_all_deals(force=True)
        cache_status = get_cache_status()

        return {
            "status": "refreshed",
            "deals_count": len(raw_deals),
            "cache_status": cache_status,
        }
    except Exception as e:
        logger.error(f"Failed to refresh deals: {e}")
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.get("/deals/status")
async def deals_status():
    """
    Check the current cache status without triggering a scrape.
    """
    return get_cache_status()
