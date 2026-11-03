from fastapi import APIRouter, HTTPException

from app.schemas.flashcard_schema import (
    FlashcardGenerateRequest,
    FlashcardResponse
)

from app.services.flashcard_service import generate_flashcard


router = APIRouter(
    prefix="/api/v1/flashcards",
    tags=["Flashcards"]
)


@router.post(
    "/generate",
    response_model=FlashcardResponse
)
def create_flashcard(
    request: FlashcardGenerateRequest
):

    try:

        response = generate_flashcard(request)

        return response

    except ValueError as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    except Exception:

        raise HTTPException(
            status_code=502,
            detail="Unable to generate flashcard. Please try again."
        )