import "./Flashcard.css";

function Flashcard({ flashcard }) {
  if (!flashcard) return null;

  return (
    <div className="flashcard">
      <div className="flashcard-header">
        <div>
          <h2 className="flashcard-word">{flashcard.word}</h2>
          <span className="flashcard-pos">{flashcard.part_of_speech}</span>
        </div>

        <span className="flashcard-pronunciation">
          {flashcard.pronunciation}
        </span>
      </div>

      <div className="flashcard-section">
        <h3>Meaning</h3>
        <p>{flashcard.definition}</p>
      </div>

      <div className="flashcard-section">
        <h3>Examples</h3>

        {flashcard.examples?.map((example, index) => (
          <div className="example-item" key={index}>
            <span className="example-context">{example.context}</span>
            <p>{example.sentence}</p>
          </div>
        ))}
      </div>

      <div className="flashcard-section">
        <h3>Synonyms</h3>

        <div className="synonyms-list">
          {flashcard.synonyms?.map((synonym, index) => (
            <span className="synonym-tag" key={index}>
              {synonym}
            </span>
          ))}
        </div>
      </div>

      <div className="memory-tip">
        <h3>💡 Memory Tip</h3>
        <p>{flashcard.memory_tip}</p>
      </div>
    </div>
  );
}

export default Flashcard;
