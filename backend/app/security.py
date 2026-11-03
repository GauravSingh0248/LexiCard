"""Authentication helpers for optional shared API key protection."""

from __future__ import annotations

import hmac
import logging

from fastapi import Header, HTTPException, status

from app.config import get_settings

logger = logging.getLogger("lexicard.security")


async def require_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> None:
    """
    Enforce LEXICARD_API_KEY when configured.

    When unset (typical local development), requests are allowed through and
    protected primarily by rate limiting and network exposure controls.
    """

    settings = get_settings()
    expected = settings.lexicard_api_key

    if not expected:
        return

    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        logger.warning("Rejected request with missing or invalid API key.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
