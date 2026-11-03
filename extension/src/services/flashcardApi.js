const DEFAULT_API_BASE_URL = "https://lexicard.onrender.com/api/v1";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

const API_KEY = import.meta.env.VITE_LEXICARD_API_KEY || "";

const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 50000);

function normalizeErrorDetail(detail) {
  if (!detail) {
    return "Unable to generate flashcard.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first && typeof first.msg === "string") {
      return first.msg;
    }
    return "Invalid request. Please check the word and try again.";
  }

  if (typeof detail === "object" && typeof detail.msg === "string") {
    return detail.msg;
  }

  return "Unable to generate flashcard.";
}

function mapStatusToMessage(status, detail) {
  switch (status) {
    case 400:
      return normalizeErrorDetail(detail) || "Invalid request.";
    case 401:
    case 403:
      return "This extension is not authorized to use the flashcard service.";
    case 404:
      return "Flashcard service endpoint was not found.";
    case 413:
      return "The request is too large.";
    case 422:
      return normalizeErrorDetail(detail) || "Please enter a valid English word.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 502:
    case 503:
      return "Flashcard service is temporarily unavailable. Please try again.";
    case 504:
      return "The request timed out. Please try again.";
    default:
      if (status >= 500) {
        return "Something went wrong on the server. Please try again.";
      }
      return normalizeErrorDetail(detail);
  }
}

export const generateFlashcard = async (word, mode = "general") => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (API_KEY) {
      headers["X-API-Key"] = API_KEY;
    }

    const response = await fetch(`${API_BASE_URL}/flashcards/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        word,
        mode,
        original_sentence: null,
      }),
      signal: controller.signal,
    });

    let payload = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(mapStatusToMessage(response.status, payload?.detail));
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Received an empty response from the flashcard service.");
    }

    if (!payload.word || !payload.definition) {
      throw new Error("Received an incomplete flashcard response.");
    }

    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }

    if (
      error instanceof TypeError ||
      /failed to fetch|networkerror|load failed/i.test(String(error?.message || ""))
    ) {
      throw new Error(
        "Unable to reach the flashcard service. Check your connection and try again.",
      );
    }

    throw error instanceof Error
      ? error
      : new Error("Unable to generate flashcard.");
  } finally {
    clearTimeout(timeoutId);
  }
};
