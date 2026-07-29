from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_env: str = "development"
    app_secret_key: str = "dev-secret-key-change-in-production"
    app_debug: bool = True
    frontend_url: str = "http://localhost:5173"
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ]

    # Database
    database_url: str = "sqlite+aiosqlite:///./eva.db"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_tts_model: str = "tts-1"
    openai_tts_voice: str = "nova"
    openai_stt_model: str = "whisper-1"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # JWT
    jwt_secret_key: str = "dev-jwt-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
