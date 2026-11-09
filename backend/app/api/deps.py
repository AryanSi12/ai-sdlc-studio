from fastapi import Header, HTTPException, status

from app.config import get_settings


def require_bot_token(x_bot_token: str | None = Header(default=None, alias="X-Bot-Token")) -> None:
    settings = get_settings()
    if not x_bot_token or x_bot_token != settings.bot_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing X-Bot-Token")
