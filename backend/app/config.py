from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./ai_sdlc.db"
    bot_token: str = "dev-bot-token-change-me"
    orchestrator_webhook_url: str = ""
    host: str = "127.0.0.1"
    port: int = 8000
    # Comma-separated origins, or "*" for any. Vercel previews also match cors_origin_regex.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "http://localhost:3000,http://127.0.0.1:3000,"
        "https://*.vercel.app"
    )
    # Regex used when CORS_ORIGINS is not "*". Covers Vercel prod + preview URLs.
    cors_origin_regex: str = r"https://.*\.vercel\.app"

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        # FastAPI/Starlette allow_origins does not expand globs — drop "*.vercel.app" entries
        # (handled by cors_origin_regex instead).
        out = []
        for o in raw.split(","):
            o = o.strip()
            if not o or "*" in o:
                continue
            out.append(o)
        return out


@lru_cache
def get_settings() -> Settings:
    return Settings()
