import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getFlashcards,
  removeFlashcard,
  sanitizeFlashcard,
  saveFlashcard,
} from "./flashcardStorage";

describe("flashcardStorage", () => {
  beforeEach(() => {
    const store = {};

    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            const key = Array.isArray(keys) ? keys[0] : keys;
            return { [key]: store[key] };
          }),
          set: vi.fn(async (values) => {
            Object.assign(store, values);
          }),
        },
      },
    };
  });

  it("sanitizes valid flashcards", () => {
    const result = sanitizeFlashcard({
      word: "  grace ",
      part_of_speech: "noun",
      pronunciation: "/ɡreɪs/",
      definition: "Simple elegance.",
      examples: [{ context: "General", sentence: "She moved with grace." }],
      synonyms: ["elegance", "poise"],
      memory_tip: "Think graceful dancer.",
    });

    expect(result.word).toBe("grace");
    expect(result.examples).toHaveLength(1);
  });

  it("drops corrupted records", () => {
    expect(sanitizeFlashcard(null)).toBeNull();
    expect(sanitizeFlashcard({ word: "" })).toBeNull();
    expect(sanitizeFlashcard({ word: "x".repeat(120) })).toBeNull();
  });

  it("saves and retrieves flashcards", async () => {
    const card = {
      word: "lucid",
      part_of_speech: "adjective",
      pronunciation: "/ˈluː.sɪd/",
      definition: "Clear and easy to understand.",
      examples: [{ context: "General", sentence: "She gave a lucid answer." }],
      synonyms: ["clear", "coherent"],
      memory_tip: "Lucid sounds like clear light.",
    };

    await saveFlashcard(card);
    const saved = await getFlashcards();
    expect(saved).toHaveLength(1);
    expect(saved[0].word).toBe("lucid");
  });

  it("ignores malicious html-like fields safely", async () => {
    await saveFlashcard({
      word: "safe",
      part_of_speech: "noun",
      pronunciation: "/seɪf/",
      definition: "<script>alert(1)</script>",
      examples: [
        {
          context: "General",
          sentence: "<img src=x onerror=alert(1)>",
        },
      ],
      synonyms: ["secure"],
      memory_tip: "Remember safety.",
    });

    const saved = await getFlashcards();
    expect(saved[0].definition).toContain("<script>");
    // Content is stored as plain text; React will escape on render.
    expect(typeof saved[0].definition).toBe("string");
  });

  it("removes flashcards by word", async () => {
    await saveFlashcard({
      word: "ephemeral",
      part_of_speech: "adjective",
      pronunciation: "/əˈfem.ər.əl/",
      definition: "Lasting a short time.",
      examples: [{ context: "General", sentence: "Fame can be ephemeral." }],
      synonyms: ["fleeting"],
      memory_tip: "Ephemeral moments fade.",
    });

    const updated = await removeFlashcard("ephemeral");
    expect(updated).toHaveLength(0);
  });

  it("handles corrupted storage arrays", async () => {
    chrome.storage.local.get = vi.fn(async () => ({
      flashcards: [{ bad: true }, null, "x"],
    }));

    const saved = await getFlashcards();
    expect(saved).toEqual([]);
  });
});
