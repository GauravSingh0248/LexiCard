"""Pydantic schemas for flashcard generation requests and responses."""

from __future__ import annotations

import re
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

ALLOWED_WORD_PATTERN = re.compile(r"^[\w\s\-']+$", re.UNICODE)

MAX_WORD_LENGTH = 100
MAX_SENTENCE_LENGTH = 500
MAX_DEFINITION_LENGTH = 1000
MAX_MEMORY_TIP_LENGTH = 500
MAX_POS_LENGTH = 50
MAX_PRONUNCIATION_LENGTH = 100
MAX_SYNONYM_LENGTH = 50
MAX_EXAMPLES = 5
MAX_SYNONYMS = 10


class ExampleSentence(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    context: Literal["Movie", "Daily Conversation", "General"]
    sentence: str = Field(
        ...,
        min_length=1,
        max_length=MAX_SENTENCE_LENGTH,
        description="A natural example sentence using the vocabulary word.",
    )


class FlashcardGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    word: str = Field(
        ...,
        min_length=1,
        max_length=MAX_WORD_LENGTH,
        description="English vocabulary word to explain.",
    )

    mode: Literal["general", "movie", "conversation", "advanced"] = "general"

    original_sentence: Optional[str] = Field(
        default=None,
        max_length=MAX_SENTENCE_LENGTH,
        description="Optional untrusted context sentence from a webpage.",
    )

    @field_validator("word")
    @classmethod
    def validate_word(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Word cannot be empty or whitespace only.")
        if not ALLOWED_WORD_PATTERN.fullmatch(cleaned):
            raise ValueError(
                "Word contains unsupported characters. "
                "Use letters, numbers, spaces, hyphens, or apostrophes."
            )
        # Reject multi-paragraph / injection-style payloads even within length.
        if "\n" in cleaned or "\r" in cleaned:
            raise ValueError("Word must be a single line.")
        return cleaned

    @field_validator("original_sentence")
    @classmethod
    def validate_original_sentence(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        return cleaned


class FlashcardResponse(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    word: str = Field(..., min_length=1, max_length=MAX_WORD_LENGTH)
    part_of_speech: str = Field(..., min_length=1, max_length=MAX_POS_LENGTH)
    pronunciation: str = Field(..., min_length=1, max_length=MAX_PRONUNCIATION_LENGTH)
    definition: str = Field(..., min_length=1, max_length=MAX_DEFINITION_LENGTH)
    examples: List[ExampleSentence] = Field(..., min_length=1, max_length=MAX_EXAMPLES)
    synonyms: List[str] = Field(..., min_length=1, max_length=MAX_SYNONYMS)
    memory_tip: str = Field(..., min_length=1, max_length=MAX_MEMORY_TIP_LENGTH)

    @field_validator("synonyms")
    @classmethod
    def validate_synonyms(cls, value: List[str]) -> List[str]:
        cleaned: list[str] = []
        for item in value:
            synonym = item.strip()
            if not synonym:
                raise ValueError("Synonyms cannot contain empty values.")
            if len(synonym) > MAX_SYNONYM_LENGTH:
                raise ValueError(
                    f"Synonym exceeds {MAX_SYNONYM_LENGTH} characters."
                )
            cleaned.append(synonym)
        return cleaned
