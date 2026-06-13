"""
JWT Authentication dependency for FastAPI.
Verifies Supabase-issued JWTs on protected endpoints.
"""

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from "Authorization: Bearer <token>"
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate the Supabase JWT and return the decoded payload.
    
    The payload contains:
        - sub: the user's UUID
        - email: user's email
        - role: "authenticated" for logged-in users
        - exp: expiration timestamp
    """
    token = credentials.credentials

    if not settings.supabase_jwt_secret:
        logger.error("SUPABASE_JWT_SECRET is not configured — cannot verify tokens")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not configured on server",
        )

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID",
            )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired — please re-authenticate",
        )
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT received: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
