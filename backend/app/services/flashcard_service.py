"""Flashcard generation via Groq through LangChain structured output."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

from langchain_groq import ChatGroq

from app.config import get_settings
from app.prompts.flashcard_prompt import FLASHCARD_PROMPT
from app.schemas.flashcard_schema import (
    FlashcardGenerateRequest,
    FlashcardResponse,
)

logger = logging.getLogger("lexicard.service")

_executor = ThreadPoolExecutor(max_workers=4)


class ConfigurationError(RuntimeError):
    """Raised when required provider configuration is missing."""


class ProviderError(RuntimeError):
    """Raised when the upstream LLM provider fails."""


class ProviderTimeoutError(RuntimeError):
    """Raised when the LLM call exceeds the configured timeout."""


class InvalidModelOutputError(RuntimeError):
    """Raised when the LLM returns data that fails schema validation."""


def get_llm() -> ChatGroq:
    settings = get_settings()

    if not settings.groq_api_key:
        raise ConfigurationError("Language model is not configured.")

    return ChatGroq(
        model=settings.groq_model,
        temperature=0,
        api_key=settings.groq_api_key,
        max_retries=1,
        timeout=settings.llm_timeout_seconds,
    )


def _invoke_chain(request: FlashcardGenerateRequest) -> FlashcardResponse:
    llm = get_llm()
    structured_llm = llm.with_structured_output(FlashcardResponse)
    chain = FLASHCARD_PROMPT | structured_llm

    raw = chain.invoke(
        {
            "word": request.word,
            "mode": request.mode,
            "original_sentence": request.original_sentence or "Not provided",
        }
    )

    # with_structured_output may return a model instance or a dict depending
    # on provider/version. Re-validate explicitly before returning.
    if isinstance(raw, FlashcardResponse):
        return FlashcardResponse.model_validate(raw.model_dump())

    if isinstance(raw, dict):
        return FlashcardResponse.model_validate(raw)

    raise InvalidModelOutputError("Model returned an unexpected response type.")


def generate_flashcard(request: FlashcardGenerateRequest) -> FlashcardResponse:
    settings = get_settings()

    future = _executor.submit(_invoke_chain, request)

    try:
        return future.result(timeout=settings.llm_timeout_seconds)
    except FuturesTimeoutError as exc:
        future.cancel()
        logger.warning("LLM request timed out after %ss", settings.llm_timeout_seconds)
        raise ProviderTimeoutError("Flashcard generation timed out.") from exc
    except ConfigurationError:
        raise
    except InvalidModelOutputError:
        raise
    except Exception as exc:
        # Avoid leaking provider/internal details to callers.
        logger.exception("Flashcard generation failed.")
        message = str(exc).lower()
        if "timeout" in message:
            raise ProviderTimeoutError("Flashcard generation timed out.") from exc
        if "rate" in message or "429" in message:
            raise ProviderError("Language model rate limit exceeded.") from exc
        if "auth" in message or "api key" in message or "401" in message:
            raise ConfigurationError("Language model authentication failed.") from exc
        raise ProviderError("Unable to generate flashcard.") from exc
