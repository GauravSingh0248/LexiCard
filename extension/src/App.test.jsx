import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import App from "./App";

vi.mock("./services/flashcardApi", () => ({
  generateFlashcard: vi.fn(),
}));

vi.mock("./services/flashcardStorage", () => ({
  getFlashcards: vi.fn(async () => []),
  saveFlashcard: vi.fn(async (card) => [card]),
  removeFlashcard: vi.fn(async () => []),
}));

import { generateFlashcard } from "./services/flashcardApi";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async () => ({})),
          remove: vi.fn(async () => {}),
        },
      },
    };
  });

  it("shows validation error for empty input", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /generate flashcard/i }));
    expect(await screen.findByText(/please enter a word first/i)).toBeInTheDocument();
  });

  it("renders generated flashcard", async () => {
    generateFlashcard.mockResolvedValue({
      word: "wander",
      part_of_speech: "verb",
      pronunciation: "/ˈwɒn.dər/",
      definition: "To walk without a fixed destination.",
      examples: [
        { context: "General", sentence: "They wander through the forest." },
      ],
      synonyms: ["roam", "stroll"],
      memory_tip: "Wander means to walk around.",
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/enter an english word/i), {
      target: { value: "wander" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate flashcard/i }));

    await waitFor(() => {
      expect(screen.getAllByText("wander").length).toBeGreaterThan(0);
      expect(
        screen.getAllByText(/walk without a fixed destination/i).length,
      ).toBeGreaterThan(0);
    });
  });

  it("shows friendly API error messages", async () => {
    generateFlashcard.mockRejectedValue(
      new Error("Too many requests. Please wait a moment and try again."),
    );

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText(/enter an english word/i), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate flashcard/i }));

    expect(
      await screen.findByText(/too many requests/i),
    ).toBeInTheDocument();
  });
});
