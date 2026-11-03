import { useEffect, useState } from "react";
import "./App.css";

import Flashcard from "./component/Flashcard";
import { generateFlashcard } from "./services/flashcardApi";

function App() {
  const [word, setWord] = useState("");
  const [flashcard, setFlashcard] = useState(null);

  const [recentWords, setRecentWords] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load previously saved words and selected context-menu word
  useEffect(() => {
    chrome.storage.local.get(["pendingWord", "flashcards"], (result) => {
      if (result.pendingWord) {
        setWord(result.pendingWord);

        chrome.storage.local.remove("pendingWord");
      }

      const savedFlashcards = result.flashcards || [];

      setRecentWords(savedFlashcards.slice(-3).reverse());
    });
  }, []);

  // Generate a flashcard using the backend API
  const handleGenerate = async () => {
    const trimmedWord = word.trim();

    if (!trimmedWord) {
      setError("Please enter a word first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setFlashcard(null);

      const result = await generateFlashcard(trimmedWord);

      setFlashcard(result);

      // Save generated flashcard in Chrome storage
      chrome.storage.local.get(["flashcards"], (storageResult) => {
        const existingFlashcards = storageResult.flashcards || [];

        // Remove an older entry for the same word
        const updatedFlashcards = existingFlashcards.filter(
          (item) => item.word.toLowerCase() !== result.word.toLowerCase(),
        );

        updatedFlashcards.push(result);

        chrome.storage.local.set({
          flashcards: updatedFlashcards,
        });

        setRecentWords(updatedFlashcards.slice(-3).reverse());
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Select a recently saved word
  const handleRecentWord = (savedFlashcard) => {
    setWord(savedFlashcard.word);
    setFlashcard(savedFlashcard);
    setError("");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>LexiCard</h1>
        <p>Your AI Vocabulary Companion</p>
      </header>

      <main>
        <div className="input-section">
          <input
            type="text"
            placeholder="Enter an English word..."
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              setError("");
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

        {loading && (
          <div className="loading-message">Creating your flashcard...</div>
        )}

        {flashcard && <Flashcard flashcard={flashcard} />}

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
    </div>
  );
}

export default App;
