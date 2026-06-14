"""
Supabase client utility.
Creates a client using the service role key to bypass RLS for server-authoritative actions.
"""

import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    """Create and return a Supabase client with service role credentials."""
    url = settings.get_supabase_url
    key = settings.get_supabase_service_key

    if not url or not key:
        logger.error("Supabase credentials (URL/Service Role Key) are missing from configuration")
        raise RuntimeError("Supabase client not configured")

    return create_client(url, key)
