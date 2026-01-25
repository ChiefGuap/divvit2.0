"""
Configuration module for loading environment variables.
Uses pydantic-settings for type-safe configuration management.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    gemini_api_key: str = ""

    # Application settings
    app_name: str = "Divvit Backend"
    debug: bool = False

    # Cloud Run settings
    port: int = 8080

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
