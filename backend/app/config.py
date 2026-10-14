import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "LeadNova CRM"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://postgres:root@localhost:5432/crm_db"

    # JWT / Auth
    SECRET_KEY: str = "leadnova_super_secure_jwt_secret_key_2026_dev_prod_auth"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Resend API
    RESEND_API_KEY: str = ""
    SENDER_EMAIL: str = "notifications@leadnova.com"

    # IMAP Configuration
    IMAP_EMAIL: str = ""
    IMAP_PASSWORD: str = ""
    IMAP_SERVER: str = "imap.gmail.com"
    IMAP_PORT: int = 993
    EMAIL_FETCH_INTERVAL_MINUTES: int = 15

    # SMTP Configuration
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "notifications@leadnova.com"

    # CORS & Storage
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
