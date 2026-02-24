from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # CORS Settings
    CORS_ORIGINS: str
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: str
    CORS_ALLOW_HEADERS: str

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def cors_methods_list(self) -> List[str]:
        """Convert CORS_ALLOW_METHODS string to list."""
        return [method.strip() for method in self.CORS_ALLOW_METHODS.split(",")]


settings = Settings()

