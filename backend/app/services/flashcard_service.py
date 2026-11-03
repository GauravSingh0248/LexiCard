import os

from dotenv import load_dotenv
from langchain_groq import ChatGroq

from app.prompts.flashcard_prompt import FLASHCARD_PROMPT
from app.schemas.flashcard_schema import (
    FlashcardGenerateRequest,
    FlashcardResponse
)


load_dotenv()


def get_llm():

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured.")

    return ChatGroq(
        model="openai/gpt-oss-20b",
        temperature=0,
        api_key=api_key
    )


def generate_flashcard(
    request: FlashcardGenerateRequest
) -> FlashcardResponse:

    llm = get_llm()

    structured_llm = llm.with_structured_output(
        FlashcardResponse
    )

    chain = FLASHCARD_PROMPT | structured_llm

    response = chain.invoke(
        {
            "word": request.word.strip(),
            "mode": request.mode,
            "original_sentence": (
                request.original_sentence
                or "Not provided"
            )
        }
    )

    return response