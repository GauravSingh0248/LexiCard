from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.flashcard_routes import router as flashcard_router


app = FastAPI(
    title="LexiCard API",
    description="AI-powered English vocabulary flashcard generator.",
    version="1.0.0"
)


# CORS configuration

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_origin_regex=r"chrome-extension://[a-p]{32}",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routes

app.include_router(flashcard_router)


@app.get("/")
def root():

    return {
        "message": "Welcome to LexiCard API",
        "status": "running"
    }


@app.get("/health")
def health_check():

    return {
        "status": "healthy"
    }