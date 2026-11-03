const API_BASE_URL = "http://localhost:8000/api/v1";

export const generateFlashcard = async (word, mode = "general") => {
  try {
    const response = await fetch(`${API_BASE_URL}/flashcards/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        word,
        mode,
        original_sentence: null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Unable to generate flashcard.");
    }

    return await response.json();
  } catch (error) {
    console.error("Flashcard API Error:", error);
    throw error;
  }
};
