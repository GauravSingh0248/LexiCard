import { useEffect, useState } from "react";
import "./App.css";

import Flashcard from "./component/Flashcard";

import { generateFlashcard } from "./services/flashcardApi";

import {
  getFlashcards,
  saveFlashcard,
  removeFlashcard,
} from "./services/flashcardStorage";

const MAX_INPUT_LENGTH = 100;

function App() {
  const [word, setWord] = useState("");
  const [flashcard, setFlashcard] = useState(null);

  const [savedFlashcards, setSavedFlashcards] = useState([]);
  const [recentWords, setRecentWords] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        if (chrome?.storage?.local) {
          const result = await chrome.storage.local.get(["pendingWord"]);

          if (typeof result.pendingWord === "string" && result.pendingWord.trim()) {
            setWord(result.pendingWord.trim().slice(0, MAX_INPUT_LENGTH));
            await chrome.storage.local.remove("pendingWord");
          }
        }

        const saved = await getFlashcards();
        setSavedFlashcards(saved);
        setRecentWords(saved.slice(-3).reverse());
      } catch (err) {
        console.error("Failed to load extension data:", err);
        setError("Unable to load saved flashcards. Local storage may be unavailable.");
      }
    };

    loadData();
  }, []);

  const handleGenerate = async () => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      setError("Please enter a word first.");
      return;
    }

    if (trimmedWord.length > MAX_INPUT_LENGTH) {
      setError(`Please enter a word with at most ${MAX_INPUT_LENGTH} characters.`);
      return;
    }

    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");
      setFlashcard(null);

      const result = await generateFlashcard(trimmedWord);
      setFlashcard(result);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFlashcard = async () => {
    if (!flashcard || loading) return;

    try {
      setError("");
      const updatedFlashcards = await saveFlashcard(flashcard);
      setSavedFlashcards(updatedFlashcards);
      setRecentWords(updatedFlashcards.slice(-3).reverse());
      setInfo("Flashcard saved.");
    } catch (err) {
      console.error("Failed to save flashcard:", err);
      setError("Unable to save this flashcard. Please try again.");
    }
  };

  const handleRemoveFlashcard = async () => {
    if (!flashcard || loading) return;

    try {
      setError("");
      const updatedFlashcards = await removeFlashcard(flashcard.word);
      setSavedFlashcards(updatedFlashcards);
      setRecentWords(updatedFlashcards.slice(-3).reverse());
      setInfo("Flashcard removed from saved words.");
    } catch (err) {
      console.error("Failed to remove flashcard:", err);
      setError("Unable to remove this flashcard. Please try again.");
    }
  };

  const isFlashcardSaved = flashcard
    ? savedFlashcards.some(
        (item) => item.word.toLowerCase() === flashcard.word.toLowerCase(),
      )
    : false;

  const handleRecentWord = (savedFlashcard) => {
    setWord(savedFlashcard.word);
    setFlashcard(savedFlashcard);
    setError("");
    setInfo("");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-icon">✦</div>

        <h1>LexiCard</h1>

        <p className="app-tagline">The Vocabulary Journal</p>

        <div className="header-divider">
          <span>✧</span>
        </div>
      </header>

      <main>
        <div className="input-section">
          <input
            type="text"
            placeholder="Enter an English word..."
            value={word}
            maxLength={MAX_INPUT_LENGTH}
            disabled={loading}
            onChange={(e) => {
              setWord(e.target.value);
              setError("");
              setInfo("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGenerate();
              }
            }}
          />

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Flashcard"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
        {info && !error && <p className="info-message">{info}</p>}

        {loading && (
          <div className="loading-message">Creating your flashcard...</div>
        )}

        {flashcard && !loading && (
          <>
            <Flashcard flashcard={flashcard} />

            <button
              className="save-button"
              onClick={
                isFlashcardSaved ? handleRemoveFlashcard : handleSaveFlashcard
              }
            >
              {isFlashcardSaved ? "Remove Saved Flashcard" : "Save Flashcard"}
            </button>
          </>
        )}

        <section className="recent-section">
          <h3>Recently Saved</h3>

          {recentWords.length > 0 ? (
            <div className="recent-words">
              {recentWords.map((item, index) => (
                <button
                  key={`${item.word}-${index}`}
                  className="recent-word"
                  onClick={() => handleRecentWord(item)}
                >
                  {item.word}
                </button>
              ))}
            </div>
          ) : (
            <p className="empty-message">Your saved words will appear here.</p>
          )}
        </section>
      </main>
      <footer className="app-footer">
        <span>Designed By Gaurav Singh</span>

        <a
          href="https://my-ai-portfolio-lake.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          title="Visit my portfolio"
        >
          🌐
        </a>
      </footer>
    </div>
  );
}

export default App;
