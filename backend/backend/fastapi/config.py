"""Configuration management for the FastAPI application."""

import os
from typing import List, Optional
from pydantic import BaseSettings, validator
import logging


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # API Configuration
    openai_api_key: str
    model_name: str = "gpt-4"
    temperature: float = 0.3
    max_tokens: int = 500
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    workers: int = 4
    
    # CORS Configuration
    cors_origins: List[str] = ["http://localhost:3000"]
    
    # Security
    jwt_secret_key: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # Environment
    environment: str = "development"
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    prometheus_enabled: bool = False
    
    # Database (optional)
    database_url: Optional[str] = None
    
    # Redis (optional)
    redis_url: Optional[str] = None
    
    @validator('openai_api_key')
    def validate_openai_key(cls, v):
        if not v or v == "your_openai_api_key_here":
            raise ValueError("OPENAI_API_KEY must be set to a valid API key")
        return v
    
    @validator('cors_origins', pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if not 0 <= v <= 2:
            raise ValueError("Temperature must be between 0 and 2")
        return v
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v < 1 or v > 4000:
            raise ValueError("Max tokens must be between 1 and 4000")
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of: {valid_levels}")
        return v.upper()
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


def setup_logging(settings: Settings) -> None:
    """Configure application logging."""
    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        if settings.log_format != 'json' else None
    )
    
    # Configure specific loggers
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)


# Global settings instance
settings = Settings()

# Setup logging
setup_logging(settings)
