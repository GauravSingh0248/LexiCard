"""LexiCard FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import configure_logging, get_settings
from app.middleware.security import (
    RateLimitMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.routes.flashcard_routes import router as flashcard_router

logger = logging.getLogger("lexicard")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    logger.info(
        "LexiCard API starting (environment=%s, rate_limit=%s/%ss)",
        settings.environment,
        settings.rate_limit_requests,
        settings.rate_limit_window_seconds,
    )
    if not settings.groq_api_key and not settings.is_production:
        logger.warning("GROQ_API_KEY is not set. Generation requests will fail.")
    yield
    logger.info("LexiCard API shutting down.")


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title="LexiCard API",
        description="AI-powered English vocabulary flashcard generator.",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    # Middleware is applied in reverse addition order (last added = outermost).
    application.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )
    application.add_middleware(
        RequestSizeLimitMiddleware,
        max_body_size=settings.max_request_bytes,
    )
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-API-Key"],
    )

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request,
        exc: RequestValidationError,
    ):
        # Return a stable, non-leaky validation payload.
        safe_errors = []
        for err in exc.errors():
            safe_errors.append(
                {
                    "loc": err.get("loc"),
                    "msg": err.get("msg"),
                    "type": err.get("type"),
                }
            )
        return JSONResponse(
            status_code=422,
            content={"detail": safe_errors},
        )

    @application.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        logger.exception("Unhandled exception: %s", type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred. Please try again."},
        )

    application.include_router(flashcard_router)

    @application.get("/")
    def root():
        return {
            "message": "Welcome to LexiCard API",
            "status": "running",
        }

    @application.get("/health")
    def health_check():
        configured = bool(get_settings().groq_api_key)
        return {
            "status": "healthy" if configured else "degraded",
            "llm_configured": configured,
        }

    return application


app = create_app()
