from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ExampleSentence(BaseModel):
    context: Literal["Movie", "Daily Conversation", "General"]
    sentence: str = Field(
        ...,
        description="A natural example sentence using the vocabulary word."
    )


class FlashcardGenerateRequest(BaseModel):
    word: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="English vocabulary word to explain."
    )

    mode: Literal[
        "general",
        "movie",
        "conversation",
        "advanced"
    ] = "general"

    original_sentence: Optional[str] = None


class FlashcardResponse(BaseModel):
    word: str
    part_of_speech: str
    pronunciation: str

    definition: str

    examples: List[ExampleSentence]

    synonyms: List[str]

    memory_tip: str