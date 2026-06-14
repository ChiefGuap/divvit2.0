"""
Configuration module for loading environment variables.
Uses pydantic-settings for type-safe configuration management.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings

# Manually load .env into os.environ if present, since pydantic-settings doesn't populate os.environ
if os.path.exists(".env"):
    with open(".env", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                key_val = line.split("=", 1)
                if len(key_val) == 2:
                    k = key_val[0].strip().strip("'").strip('"')
                    v = key_val[1].strip().strip("'").strip('"')
                    if k and k not in os.environ:
                        os.environ[k] = v


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    gemini_api_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Application settings
    app_name: str = "Divvit Backend"
    debug: bool = False

    # Cloud Run settings
    port: int = 8080

    @property
    def get_supabase_url(self) -> str:
        return self.supabase_url or os.environ.get("SUPABASE_URL", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "")

    @property
    def get_supabase_service_key(self) -> str:
        return self.supabase_service_role_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("SUPABASE_SERVICE_KEY", "") or os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore Expo/frontend env vars


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Convenience access to settings
settings = get_settings()
