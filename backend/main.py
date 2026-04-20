"""
Divvit Backend - FastAPI Entry Point
A stateless, containerized backend for receipt parsing and data processing.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.endpoints import receipts
from app.core.security import limiter

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
    raise RuntimeError(
        "GEMINI_API_KEY is not set in backend/.env — receipt scanning will not work."
    )

app = FastAPI(
    title="Divvit Receipt API",
    description="Backend API for receipt scanning and bill splitting",
    version="1.0.0",
)

# Trust Proxy Headers (Cloud Run sets X-Forwarded-For)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Add Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configure SlowAPI rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(receipts.router, prefix="/api/v1", tags=["receipts"])


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
