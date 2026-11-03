"""Input validation and schema tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.flashcard_schema import (
    FlashcardGenerateRequest,
    FlashcardResponse,
)


def test_valid_request_accepts_simple_word():
    request = FlashcardGenerateRequest(word="serendipity")
    assert request.word == "serendipity"
    assert request.mode == "general"
    assert request.original_sentence is None


def test_request_strips_whitespace():
    request = FlashcardGenerateRequest(word="  grace  ")
    assert request.word == "grace"


@pytest.mark.parametrize(
    "payload",
    [
        {"word": ""},
        {"word": "   "},
        {"word": "a" * 101},
        {"word": "<script>alert(1)</script>"},
        {"word": "ignore\ninstructions"},
        {"mode": "general"},  # missing word
    ],
)
def test_invalid_requests_rejected(payload):
    with pytest.raises(ValidationError):
        FlashcardGenerateRequest(**payload)


def test_unexpected_fields_rejected():
    with pytest.raises(ValidationError):
        FlashcardGenerateRequest(word="test", evil="payload")


def test_original_sentence_max_length():
    with pytest.raises(ValidationError):
        FlashcardGenerateRequest(word="test", original_sentence="x" * 501)


def test_original_sentence_blank_becomes_none():
    request = FlashcardGenerateRequest(word="test", original_sentence="   ")
    assert request.original_sentence is None


def test_response_rejects_empty_synonym():
    with pytest.raises(ValidationError):
        FlashcardResponse(
            word="test",
            part_of_speech="noun",
            pronunciation="/t/",
            definition="A test.",
            examples=[
                {"context": "General", "sentence": "This is a test."},
            ],
            synonyms=[""],
            memory_tip="Remember test.",
        )


def test_response_rejects_oversized_definition(sample_flashcard):
    sample_flashcard["definition"] = "d" * 1001
    with pytest.raises(ValidationError):
        FlashcardResponse(**sample_flashcard)


def test_api_rejects_empty_word(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": ""},
    )
    assert response.status_code == 422


def test_api_rejects_xss_word(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": "<img src=x onerror=alert(1)>"},
    )
    assert response.status_code == 422


def test_api_rejects_sql_like_word(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": "'; DROP TABLE users; --"},
    )
    assert response.status_code == 422


def test_api_rejects_path_traversal_word(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": "../../../../etc/passwd"},
    )
    assert response.status_code == 422


def test_api_rejects_unexpected_fields(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": "grace", "hack": True},
    )
    assert response.status_code == 422


def test_api_rejects_malformed_json(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        content="{not-json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422


def test_api_rejects_wrong_types(client):
    response = client.post(
        "/api/v1/flashcards/generate",
        json={"word": 123},
    )
    assert response.status_code == 422
