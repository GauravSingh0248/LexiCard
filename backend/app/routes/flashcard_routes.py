"""Flashcard generation API routes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError

from app.schemas.flashcard_schema import (
    FlashcardGenerateRequest,
    FlashcardResponse,
)
from app.security import require_api_key
from app.services.flashcard_service import (
    ConfigurationError,
    InvalidModelOutputError,
    ProviderError,
    ProviderTimeoutError,
    generate_flashcard,
)

logger = logging.getLogger("lexicard.routes")

router = APIRouter(
    prefix="/api/v1/flashcards",
    tags=["Flashcards"],
)


@router.post(
    "/generate",
    response_model=FlashcardResponse,
    dependencies=[Depends(require_api_key)],
)
def create_flashcard(request: FlashcardGenerateRequest) -> FlashcardResponse:
    try:
        return generate_flashcard(request)

    except ConfigurationError:
        logger.error("Flashcard generation blocked by configuration error.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Flashcard service is temporarily unavailable.",
        ) from None

    except ProviderTimeoutError:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Flashcard generation timed out. Please try again.",
        ) from None

    except InvalidModelOutputError:
        logger.warning("Rejected invalid model output.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Received an invalid response from the language model.",
        ) from None

    except ProviderError as exc:
        detail = str(exc) if "rate limit" in str(exc).lower() else (
            "Unable to generate flashcard. Please try again."
        )
        status_code = (
            status.HTTP_429_TOO_MANY_REQUESTS
            if "rate limit" in str(exc).lower()
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=status_code, detail=detail) from None

    except ValidationError:
        logger.warning("Model output failed schema validation.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Received an invalid response from the language model.",
        ) from None

    except Exception:
        logger.exception("Unexpected error during flashcard generation.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again.",
        ) from None
