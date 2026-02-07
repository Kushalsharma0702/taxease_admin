"""
Application configuration and environment variables
"""
import os
import json
from typing import Optional, Union
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Tax Hub Dashboard API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = Field(default=False, env="DEBUG")
    
    # Database - Using same database as client backend
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:Kushal07@localhost:5432/taxease_db",
        env="DATABASE_URL"
    )
    
    # Redis
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_CACHE_TTL: int = Field(default=3600, env="REDIS_CACHE_TTL")  # 1 hour default
    
    # Security
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        env="SECRET_KEY"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440, env="ACCESS_TOKEN_EXPIRE_MINUTES")  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # CORS - Default includes port 8080 (where frontend is running)
    CORS_ORIGINS: Union[str, list[str]] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:8080"],
        env="CORS_ORIGINS"
    )
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from JSON string or keep as list"""
        if isinstance(v, str):
            # Try to parse as JSON array
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, ValueError):
                pass
            # Fallback: split by comma
            return [origin.strip().strip('"') for origin in v.split(",") if origin.strip()]
        return v
    
    # Admin Dashboard Frontend
    FRONTEND_URL: str = Field(default="http://localhost:5173", env="FRONTEND_URL")
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = Field(default=20, env="DEFAULT_PAGE_SIZE")
    MAX_PAGE_SIZE: int = Field(default=100, env="MAX_PAGE_SIZE")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()

