"""Shared pytest fixtures for LexiCard backend tests."""

from __future__ import annotations

import os
from typing import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _test_env(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("LEXICARD_API_KEY", "")
    monkeypatch.setenv("RATE_LIMIT_REQUESTS", "100")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")
    monkeypatch.setenv("MAX_REQUEST_BYTES", "4096")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "5")
    monkeypatch.setenv("LOG_LEVEL", "WARNING")

    # Ensure settings cache is cleared between tests.
    from app import config

    config.get_settings.cache_clear()
    yield
    config.get_settings.cache_clear()


@pytest.fixture
def client(_test_env: None) -> Iterator[TestClient]:
    from app.main import create_app

    application = create_app()
    with TestClient(application) as test_client:
        yield test_client


@pytest.fixture
def sample_flashcard() -> dict:
    return {
        "word": "eloquent",
        "part_of_speech": "adjective",
        "pronunciation": "/ˈel.ə.kwənt/",
        "definition": "Able to express ideas clearly and persuasively.",
        "examples": [
            {
                "context": "Movie",
                "sentence": "Her eloquent speech moved the entire courtroom.",
            },
            {
                "context": "Daily Conversation",
                "sentence": "He gave an eloquent explanation of the plan.",
            },
        ],
        "synonyms": ["articulate", "fluent", "persuasive"],
        "memory_tip": "Think of someone who speaks with elegance.",
    }
