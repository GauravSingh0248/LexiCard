import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import "./Flashcard.css";

function Flashcard({ flashcard }) {
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  if (!flashcard) return null;

  const word = typeof flashcard.word === "string" ? flashcard.word : "";
  const partOfSpeech =
    typeof flashcard.part_of_speech === "string"
      ? flashcard.part_of_speech
      : "";
  const pronunciation =
    typeof flashcard.pronunciation === "string" ? flashcard.pronunciation : "";
  const definition =
    typeof flashcard.definition === "string" ? flashcard.definition : "";
  const examples = Array.isArray(flashcard.examples) ? flashcard.examples : [];
  const synonyms = Array.isArray(flashcard.synonyms) ? flashcard.synonyms : [];
  const memoryTip =
    typeof flashcard.memory_tip === "string" ? flashcard.memory_tip : "";

  const handlePronunciation = () => {
    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support speech synthesis.");
      return;
    }

    if (!word) {
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      utterance.pitch = 1;

      utterance.onerror = () => {
        alert("Unable to play pronunciation right now.");
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech synthesis failed:", error);
      alert("Unable to play pronunciation right now.");
    }
  };

  const handleDownload = async () => {
    if (!exportRef.current || exporting) return;

    try {
      setExporting(true);

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#f5e9cc",
      });

      const link = document.createElement("a");

      // Generate a safe filename using the vocabulary word.
      const safeWord =
        word
          .trim()
          .replace(/[^a-z0-9_-]/gi, "_")
          .slice(0, 40) || "word";

      // Download using the vocabulary word as the filename.
      link.download = `${safeWord}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Image download failed:", error);
      alert("Unable to download flashcard. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="flashcard">
        <div className="flashcard-header">
          <div>
            <div className="word-title-row">
              <h2 className="flashcard-word">{word}</h2>

              <button
                className="pronunciation-button"
                onClick={handlePronunciation}
                title="Listen to pronunciation"
                aria-label={`Listen to ${word} pronunciation`}
                type="button"
              >
                🔊
              </button>
            </div>

            <span className="flashcard-pos">{partOfSpeech}</span>
          </div>

          <span className="flashcard-pronunciation">{pronunciation}</span>
        </div>

        <div className="flashcard-section">
          <h3>Meaning</h3>
          <p>{definition}</p>
        </div>

        <div className="flashcard-section">
          <h3>Examples</h3>

          {examples.map((example, index) => (
            <div className="example-item" key={index}>
              <span className="example-context">
                {typeof example?.context === "string" ? example.context : ""}
              </span>
              <p>
                {typeof example?.sentence === "string" ? example.sentence : ""}
              </p>
            </div>
          ))}
        </div>

        <div className="flashcard-section">
          <h3>Synonyms</h3>

          <div className="synonyms-list">
            {synonyms.map((synonym, index) => (
              <span className="synonym-tag" key={index}>
                {synonym}
              </span>
            ))}
          </div>
        </div>

        <div className="memory-tip">
          <h3>Memory Tip</h3>
          <p>{memoryTip}</p>
        </div>
      </div>

      <button
        className="download-button"
        onClick={handleDownload}
        disabled={exporting}
        type="button"
      >
        {exporting ? "Preparing Image..." : "⬇ Download as Image"}
      </button>

      <div className="export-container" aria-hidden="true">
        <div className="export-card" ref={exportRef}>
          <div className="export-header">
            <h1>{word}</h1>
            <span>{partOfSpeech}</span>
          </div>

          <div className="export-section">
            <h3>MEANING</h3>
            <p>{definition}</p>
          </div>

          <div className="export-section">
            <h3>EXAMPLES</h3>

            {examples.map((example, index) => (
              <div className="export-example" key={index}>
                <span>
                  {typeof example?.context === "string" ? example.context : ""}
                </span>
                <p>
                  {typeof example?.sentence === "string"
                    ? example.sentence
                    : ""}
                </p>
              </div>
            ))}
          </div>

          <div className="export-footer">
            <span>Designed By Gaurav Singh</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Flashcard;
