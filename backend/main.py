"""
Divvit Backend - FastAPI Entry Point
A stateless, containerized backend for receipt parsing and data processing.
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.endpoints import receipts
from app.api.endpoints import deals
from app.services.scraper import scrape_all_deals, get_cache_status
from app.services.nudge_service import process_nudges
from app.core.security import limiter

logger = logging.getLogger(__name__)


async def run_periodic_scraper():
    """Background task worker that runs a scrape check every hour."""
    worker_logger = logging.getLogger("app.scraper_worker")
    worker_logger.info("Background deal scraper worker started.")
    
    # Wait 10 seconds after startup before the first run to allow everything to initialize
    await asyncio.sleep(10)
    
    while True:
        try:
            status = get_cache_status()
            # If the cache is expired, has never scraped, or is currently empty
            if not status.get("cache_fresh") or status.get("last_scraped") is None:
                worker_logger.info("Cache is stale or empty. Triggering automatic 24-hour deals scrape...")
                await scrape_all_deals(force=True)
                worker_logger.info("Automatic deals scrape completed successfully.")
            else:
                worker_logger.info("Cache is still fresh. Skipping periodic scrape.")
        except Exception as e:
            worker_logger.error(f"Error in background scraper worker: {e}")
        
        # Check every hour (3600 seconds)
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scraper_task = asyncio.create_task(run_periodic_scraper())
    
    # Initialize background scheduler for payment nudges
    scheduler = AsyncIOScheduler()
    scheduler.add_job(process_nudges, "interval", minutes=30, id="nudge_processor")
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("Background payment nudge scheduler started.")
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    logger.info("Background payment nudge scheduler stopped.")
    
    scraper_task.cancel()
    try:
        await scraper_task
    except asyncio.CancelledError:
        pass


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
from app.core.config import settings

if not settings.gemini_api_key:
    logging.warning(
        "⚠️  GEMINI_API_KEY is not set — receipt scanning will not work. "
        "Set the GEMINI_API_KEY env var or Cloud Run secret."
    )

app = FastAPI(
    title="Divvit Receipt API",
    description="Backend API for receipt scanning and bill splitting",
    version="1.0.0",
    lifespan=lifespan,
)

# Trust Proxy Headers (Cloud Run sets X-Forwarded-For)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Wire up rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",       # Expo dev (Metro)
        "http://localhost:19006",      # Expo web
        "https://divvit.app",          # Production (future)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(receipts.router, prefix="/api/v1", tags=["receipts"])
app.include_router(deals.router, prefix="/api/v1", tags=["deals"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "divvit-backend"}


@app.get("/health")
async def health_check():
    """Detailed health check for Cloud Run."""
    return {
        "status": "ok",
        "gemini_configured": bool(settings.gemini_api_key),
    }


@app.post("/api/v1/nudges/process")
async def trigger_nudge_processing():
    """Manually trigger the payment nudge processor job."""
    try:
        result = await process_nudges()
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Error manually processing nudges: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/v1/nudges/status")
async def get_nudge_scheduler_status():
    """Get the status of the background payment nudge scheduler."""
    try:
        scheduler = app.state.scheduler
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            })
        return {
            "scheduler_running": scheduler.running,
            "jobs": jobs
        }
    except Exception as e:
        logger.error(f"Error getting nudge scheduler status: {e}")
        return {"status": "error", "message": str(e)}
