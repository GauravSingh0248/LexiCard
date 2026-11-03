"""Application configuration loaded from environment variables."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("lexicard")


def _parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_csv(value: str | None) -> list[str]:
    if not value or not value.strip():
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    """Runtime settings for the LexiCard API."""

    groq_api_key: str
    groq_model: str
    environment: str
    cors_origins: list[str]
    cors_origin_regex: str | None
    lexicard_api_key: str | None
    rate_limit_requests: int
    rate_limit_window_seconds: int
    max_request_bytes: int
    llm_timeout_seconds: float
    log_level: str

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Load and validate settings once per process."""

    environment = os.getenv("ENVIRONMENT", "development").strip() or "development"
    groq_api_key = (os.getenv("GROQ_API_KEY") or "").strip().strip('"').strip("'")

    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    cors_origins = _parse_csv(os.getenv("CORS_ORIGINS")) or default_origins

    # Allow Chrome extension origins by default. Pin via EXTENSION_ORIGIN_REGEX
    # or leave empty to disable regex matching in production if preferred.
    default_regex = r"chrome-extension://[a-p]{32}"
    cors_origin_regex_raw = os.getenv("EXTENSION_ORIGIN_REGEX")
    if cors_origin_regex_raw is None:
        cors_origin_regex = default_regex
    else:
        cors_origin_regex = cors_origin_regex_raw.strip() or None

    lexicard_api_key = (os.getenv("LEXICARD_API_KEY") or "").strip() or None

    try:
        rate_limit_requests = int(os.getenv("RATE_LIMIT_REQUESTS", "20"))
        rate_limit_window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        max_request_bytes = int(os.getenv("MAX_REQUEST_BYTES", "4096"))
        llm_timeout_seconds = float(os.getenv("LLM_TIMEOUT_SECONDS", "45"))
    except ValueError as exc:
        raise RuntimeError("Invalid numeric configuration value in environment.") from exc

    if rate_limit_requests < 1 or rate_limit_window_seconds < 1:
        raise RuntimeError("Rate limit configuration must be positive.")

    if max_request_bytes < 256:
        raise RuntimeError("MAX_REQUEST_BYTES must be at least 256.")

    if llm_timeout_seconds < 5:
        raise RuntimeError("LLM_TIMEOUT_SECONDS must be at least 5.")

    if environment.lower() == "production" and not groq_api_key:
        raise RuntimeError("GROQ_API_KEY must be configured in production.")

    if environment.lower() == "production" and not lexicard_api_key:
        logger.warning(
            "LEXICARD_API_KEY is unset in production. "
            "The generate endpoint will rely on rate limiting only."
        )

    return Settings(
        groq_api_key=groq_api_key,
        groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip(),
        environment=environment,
        cors_origins=cors_origins,
        cors_origin_regex=cors_origin_regex,
        lexicard_api_key=lexicard_api_key,
        rate_limit_requests=rate_limit_requests,
        rate_limit_window_seconds=rate_limit_window_seconds,
        max_request_bytes=max_request_bytes,
        llm_timeout_seconds=llm_timeout_seconds,
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
    )


def configure_logging(level: str) -> None:
    """Configure application logging once."""

    root = logging.getLogger()
    if not root.handlers:
        logging.basicConfig(
            level=getattr(logging, level, logging.INFO),
            format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
    logging.getLogger("lexicard").setLevel(getattr(logging, level, logging.INFO))
