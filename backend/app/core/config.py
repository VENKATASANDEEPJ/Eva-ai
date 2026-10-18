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

    # OpenAI (optional — paid, used for TTS/STT if key present)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_tts_model: str = "tts-1"
    openai_tts_voice: str = "nova"
    openai_stt_model: str = "whisper-1"

    # Groq — FREE tier, no billing ever
    # Get key: https://console.groq.com/keys
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Google Gemini — FREE tier
    # Get key: https://aistudio.google.com/app/apikey  (must start with AIza)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

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

    @property
    def ai_provider(self) -> str:
        """Returns which AI provider to use, in priority order."""
        if self.groq_api_key:
            return "groq"
        if self.gemini_api_key and self.gemini_api_key.startswith("AIza"):
            return "gemini"
        if self.openai_api_key:
            return "openai"
        return "none"

    @property
    def ai_available(self) -> bool:
        return self.ai_provider != "none"

    @property
    def use_gemini(self) -> bool:
        return self.ai_provider == "gemini"

    @property
    def use_groq(self) -> bool:
        return self.ai_provider == "groq"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
