import { afterEach, describe, expect, it, vi } from "vitest";

import { generateFlashcard } from "./flashcardApi";

describe("flashcardApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns flashcard payload on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          word: "brave",
          definition: "Ready to face danger.",
        }),
      })),
    );

    const result = await generateFlashcard("brave");
    expect(result.word).toBe("brave");
  });

  it("maps 429 to a friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        headers: { get: () => "application/json" },
        json: async () => ({ detail: "Too many requests" }),
      })),
    );

    await expect(generateFlashcard("brave")).rejects.toThrow(/too many requests/i);
  });

  it("handles non-json error bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        headers: { get: () => "text/plain" },
        json: async () => {
          throw new Error("no json");
        },
      })),
    );

    await expect(generateFlashcard("brave")).rejects.toThrow(/server/i);
  });

  it("handles network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(generateFlashcard("brave")).rejects.toThrow(/unable to reach/i);
  });

  it("handles incomplete payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ word: "only-word" }),
      })),
    );

    await expect(generateFlashcard("brave")).rejects.toThrow(/incomplete/i);
  });
});
