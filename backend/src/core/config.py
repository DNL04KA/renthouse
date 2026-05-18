import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Rental Management System API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/rental_db")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "super-secret-key-123")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
