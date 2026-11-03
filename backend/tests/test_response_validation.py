"""LLM response validation tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.flashcard_schema import FlashcardResponse
from app.services.flashcard_service import (
    InvalidModelOutputError,
    _invoke_chain,
)
from app.schemas.flashcard_schema import FlashcardGenerateRequest


def test_valid_llm_response_accepted(sample_flashcard):
    model = FlashcardResponse(**sample_flashcard)
    assert model.word == "eloquent"
    assert len(model.examples) == 2
    assert len(model.synonyms) == 3


@pytest.mark.parametrize(
    "mutator",
    [
        lambda d: d.update({"examples": []}),
        lambda d: d.update({"synonyms": []}),
        lambda d: d.update({"definition": ""}),
        lambda d: d.update(
            {
                "examples": [
                    {"context": "Invalid", "sentence": "Bad context value."},
                ]
            }
        ),
        lambda d: d.pop("memory_tip", None),
    ],
)
def test_invalid_llm_responses_rejected(sample_flashcard, mutator):
    payload = dict(sample_flashcard)
    # Deep-ish copy for nested lists
    payload["examples"] = [dict(item) for item in sample_flashcard["examples"]]
    payload["synonyms"] = list(sample_flashcard["synonyms"])
    mutator(payload)

    with pytest.raises((ValidationError, TypeError, KeyError)):
        FlashcardResponse(**payload)


def test_invoke_chain_revalidates_dict(monkeypatch, sample_flashcard):
    class FakeChain:
        def invoke(self, _payload):
            return sample_flashcard

    class FakeStructured:
        def __or__(self, _other):
            return FakeChain()

        def __ror__(self, _other):
            return FakeChain()

    class FakeLLM:
        def with_structured_output(self, _schema):
            return FakeStructured()

    monkeypatch.setattr(
        "app.services.flashcard_service.get_llm",
        lambda: FakeLLM(),
    )
    monkeypatch.setattr(
        "app.services.flashcard_service.FLASHCARD_PROMPT",
        FakeStructured(),
    )

    result = _invoke_chain(FlashcardGenerateRequest(word="eloquent"))
    assert result.word == "eloquent"


def test_invoke_chain_rejects_unexpected_type(monkeypatch):
    class FakeChain:
        def invoke(self, _payload):
            return "not-a-flashcard"

    class FakeStructured:
        def __or__(self, _other):
            return FakeChain()

        def __ror__(self, _other):
            return FakeChain()

    class FakeLLM:
        def with_structured_output(self, _schema):
            return FakeStructured()

    monkeypatch.setattr(
        "app.services.flashcard_service.get_llm",
        lambda: FakeLLM(),
    )
    monkeypatch.setattr(
        "app.services.flashcard_service.FLASHCARD_PROMPT",
        FakeStructured(),
    )

    with pytest.raises(InvalidModelOutputError):
        _invoke_chain(FlashcardGenerateRequest(word="eloquent"))
