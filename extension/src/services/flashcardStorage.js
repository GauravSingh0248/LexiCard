const STORAGE_KEY = "flashcards";
const MAX_SAVED_FLASHCARDS = 200;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeExample(example) {
  if (!isPlainObject(example)) {
    return null;
  }

  const context =
    typeof example.context === "string" ? example.context.slice(0, 50) : "";
  const sentence =
    typeof example.sentence === "string" ? example.sentence.slice(0, 500) : "";

  if (!sentence) {
    return null;
  }

  return { context, sentence };
}

export function sanitizeFlashcard(raw) {
  if (!isPlainObject(raw)) {
    return null;
  }

  const word = typeof raw.word === "string" ? raw.word.trim() : "";
  if (!word || word.length > 100) {
    return null;
  }

  const examples = Array.isArray(raw.examples)
    ? raw.examples.map(sanitizeExample).filter(Boolean).slice(0, 5)
    : [];

  const synonyms = Array.isArray(raw.synonyms)
    ? raw.synonyms
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim().slice(0, 50))
        .slice(0, 10)
    : [];

  return {
    word: word.slice(0, 100),
    part_of_speech:
      typeof raw.part_of_speech === "string"
        ? raw.part_of_speech.slice(0, 50)
        : "",
    pronunciation:
      typeof raw.pronunciation === "string"
        ? raw.pronunciation.slice(0, 100)
        : "",
    definition:
      typeof raw.definition === "string" ? raw.definition.slice(0, 1000) : "",
    examples,
    synonyms,
    memory_tip:
      typeof raw.memory_tip === "string" ? raw.memory_tip.slice(0, 500) : "",
  };
}

async function readRawFlashcards() {
  if (!chrome?.storage?.local) {
    return [];
  }

  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [];
  } catch (error) {
    console.error("Failed to read flashcards from storage:", error);
    return [];
  }
}

async function writeFlashcards(flashcards) {
  if (!chrome?.storage?.local) {
    throw new Error("Extension storage is unavailable in this context.");
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: flashcards,
  });
}

export const getFlashcards = async () => {
  const raw = await readRawFlashcards();
  return raw.map(sanitizeFlashcard).filter(Boolean);
};

export const saveFlashcard = async (flashcard) => {
  const sanitized = sanitizeFlashcard(flashcard);

  if (!sanitized) {
    throw new Error("Cannot save an invalid flashcard.");
  }

  const existingFlashcards = await getFlashcards();

  const updatedFlashcards = existingFlashcards.filter(
    (item) => item.word.toLowerCase() !== sanitized.word.toLowerCase(),
  );

  updatedFlashcards.push(sanitized);

  // Keep storage bounded.
  while (updatedFlashcards.length > MAX_SAVED_FLASHCARDS) {
    updatedFlashcards.shift();
  }

  await writeFlashcards(updatedFlashcards);
  return updatedFlashcards;
};

export const removeFlashcard = async (word) => {
  if (typeof word !== "string" || !word.trim()) {
    return getFlashcards();
  }

  const existingFlashcards = await getFlashcards();

  const updatedFlashcards = existingFlashcards.filter(
    (item) => item.word.toLowerCase() !== word.toLowerCase(),
  );

  await writeFlashcards(updatedFlashcards);
  return updatedFlashcards;
};

export const isFlashcardSaved = async (word) => {
  if (typeof word !== "string" || !word.trim()) {
    return false;
  }

  const existingFlashcards = await getFlashcards();

  return existingFlashcards.some(
    (item) => item.word.toLowerCase() === word.toLowerCase(),
  );
};
