import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [word, setWord] = useState("");
  const [recentWords, setRecentWords] = useState([]);

  useEffect(() => {
    // Retrieve selected word from Chrome context menu

    chrome.storage.local.get(["pendingWord", "flashcards"], (result) => {
      if (result.pendingWord) {
        setWord(result.pendingWord);

        chrome.storage.local.remove("pendingWord");
      }

      const cards = result.flashcards || [];

      setRecentWords(cards.slice(-3).reverse());
    });
  }, []);

  const handleGenerate = () => {
    if (!word.trim()) return;

    console.log("Generating flashcard for:", word);

    // AI integration will come in the next stage
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">L</span>

          <div>
            <h2>LexiCard</h2>
            <p>Expand your vocabulary</p>
          </div>
        </div>
      </header>

      <main>
        <section className="search-section">
          <h3>Discover a new word.</h3>

          <p>Turn unfamiliar words into knowledge.</p>

          <input
            type="text"
            placeholder="Enter an English word..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
          />

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={!word.trim()}
          >
            ✨ Generate Flashcard
          </button>
        </section>

        <section className="recent-section">
          <div className="section-heading">
            <h3>Recently Saved</h3>

            <span>View all</span>
          </div>

          {recentWords.length === 0 ? (
            <div className="empty-state">
              <span>📚</span>

              <p>No words saved yet.</p>

              <small>Your vocabulary collection will appear here.</small>
            </div>
          ) : (
            recentWords.map((card, index) => (
              <div className="word-item" key={index}>
                <strong>{card.word}</strong>

                <span>{card.definition}</span>
              </div>
            ))
          )}
        </section>
      </main>

      <footer>Made for curious minds. ✨</footer>
    </div>
  );
}

export default App;
