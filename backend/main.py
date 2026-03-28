"""
Divvit Backend - FastAPI Entry Point
A stateless, containerized backend for receipt parsing and data processing.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import receipts
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
