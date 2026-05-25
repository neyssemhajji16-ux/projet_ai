import React, { useState } from 'react';
import axios from 'axios';
import './ExamPage.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TYPE_LABELS = { mcq: '🔤 QCM', open: '✍️ Ouverte', tf: '✅ Vrai/Faux' };

export default function ExamPage({ pdfLoaded, setActivePage }) {
  const [config, setConfig] = useState({
    num_questions: 5,
    difficulty: 'medium',
    question_type: 'mcq',
    topic: '',
    mcq_count: 4,
    open_count: 3,
    tf_count: 3,
  });
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null); // { correct, total }

  const isMixed = config.question_type === 'mixed';
  const mixedTotal = config.mcq_count + config.open_count + config.tf_count;

  const generateExam = async () => {
    if (isMixed && mixedTotal === 0) {
      setError('Veuillez sélectionner au moins une question dans le mode mixte.');
      return;
    }
    setLoading(true);
    setError('');
    setExam(null);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    try {
      const res = await axios.post(`${API}/generate-exam`, config);
      if (res.data.error) throw new Error(res.data.error);
      setExam(res.data);
    } catch (err) {
      setError(err.message || 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qid, answer) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qid]: answer }));
  };

  const submitExam = () => {
    // Questions ouvertes seules : pas de score
    if (config.question_type === 'open') {
      setSubmitted(true);
      return;
    }
    let correct = 0, scoreable = 0;
    exam.questions.forEach(q => {
      const qType = q.type || config.question_type;
      if (qType === 'open') return;
      scoreable++;
      const userAns = answers[q.id];
      const rightAns = qType === 'mcq' ? q.correct : String(q.correct);
      if (userAns === rightAns) correct++;
    });
    setScore({ correct, total: scoreable });
    setSubmitted(true);
  };

  const resetExam = () => {
    setExam(null); setAnswers({}); setSubmitted(false); setScore(null);
  };

  const isSubmitDisabled = () => {
    if (!exam) return true;
    if (config.question_type === 'open') return false;
    return exam.questions.some(q => {
      const qType = q.type || config.question_type;
      if (qType === 'open') return false;
      return !answers[q.id];
    });
  };

  if (!pdfLoaded) {
    return (
      <div className="no-pdf fade-in">
        <div className="no-pdf-icon">🔒</div>
        <h2>Document requis</h2>
        <p>Veuillez d'abord importer un PDF.</p>
        <button onClick={() => setActivePage('upload')}>Importer un PDF</button>
      </div>
    );
  }

  return (
    <div className="exam-page fade-in">
      <div className="page-header">
        <h1 className="page-title">📝 Générateur d'Examen</h1>
        <p className="page-subtitle">Créez des questions personnalisées à partir de votre document.</p>
      </div>

      {!exam && (
        <div className="config-card fade-in">
          <h2 className="config-title">⚙️ Configuration de l'examen</h2>
          <div className="config-grid">

            {/* Type de questions */}
            <div className="config-field">
              <label>Type de questions</label>
              <div className="type-btns">
                {[
                  { value: 'mcq',   label: '🔤 QCM',    desc: 'Choix multiple' },
                  { value: 'open',  label: '✍️ Ouvertes', desc: 'Réponse libre' },
                  { value: 'tf',    label: '✅ Vrai/Faux', desc: 'Binaire' },
                  { value: 'mixed', label: '🎲 Mixte',   desc: 'Composé' },
                ].map(t => (
                  <button
                    key={t.value}
                    className={`type-btn ${config.question_type === t.value ? 'active' : ''}`}
                    onClick={() => setConfig(c => ({ ...c, question_type: t.value }))}
                  >
                    <span>{t.label}</span>
                    <span className="type-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulté */}
            <div className="config-field">
              <label>Difficulté</label>
              <div className="diff-btns">
                {[
                  { value: 'easy',   label: '🟢 Facile' },
                  { value: 'medium', label: '🟡 Moyen' },
                  { value: 'hard',   label: '🔴 Difficile' },
                ].map(d => (
                  <button
                    key={d.value}
                    className={`diff-btn ${config.difficulty === d.value ? 'active' : ''}`}
                    onClick={() => setConfig(c => ({ ...c, difficulty: d.value }))}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de questions — simple ou mixte */}
            {isMixed ? (
              <div className="config-field">
                <label>Composition de l'examen <span className="total-badge">{mixedTotal} questions au total</span></label>
                <div className="mixed-config">
                  {[
                    { key: 'mcq_count',  label: '🔤 QCM' },
                    { key: 'open_count', label: '✍️ Ouvertes' },
                    { key: 'tf_count',   label: '✅ Vrai/Faux' },
                  ].map(({ key, label }) => (
                    <div className="mixed-row" key={key}>
                      <span className="mixed-label">{label}</span>
                      <input
                        type="range" min={0} max={10}
                        value={config[key]}
                        onChange={e => setConfig(c => ({ ...c, [key]: Number(e.target.value) }))}
                        className="range-input"
                      />
                      <span className="count-badge">{config[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="config-field">
                <label>Nombre de questions : <strong>{config.num_questions}</strong></label>
                <input
                  type="range" min={3} max={15}
                  value={config.num_questions}
                  onChange={e => setConfig(c => ({ ...c, num_questions: Number(e.target.value) }))}
                  className="range-input"
                />
                <div className="range-labels"><span>3</span><span>15</span></div>
              </div>
            )}

            {/* Sujet optionnel */}
            <div className="config-field">
              <label>Sujet spécifique <span className="optional">(optionnel)</span></label>
              <input
                type="text" className="topic-input"
                placeholder="Ex: les algorithmes de tri, les réseaux neuronaux..."
                value={config.topic}
                onChange={e => setConfig(c => ({ ...c, topic: e.target.value }))}
              />
            </div>
          </div>

          {error && <div className="error-box">⚠️ {error}</div>}

          <button className="generate-btn" onClick={generateExam} disabled={loading}>
            {loading ? <><span className="btn-spinner" /> Génération en cours...</> : '🚀 Générer l\'examen'}
          </button>
        </div>
      )}

      {exam && (
        <div className="exam-view fade-in">
          <div className="exam-topbar">
            <div>
              <h2 className="exam-view-title">{exam.title}</h2>
              <div className="exam-meta">
                <span>{exam.questions.length} questions</span>
                <span>·</span>
                <span>{config.difficulty === 'easy' ? '🟢 Facile' : config.difficulty === 'medium' ? '🟡 Moyen' : '🔴 Difficile'}</span>
                {isMixed && <span className="mixed-badge">🎲 Mixte</span>}
              </div>
            </div>
            <button className="new-exam-btn" onClick={resetExam}>Nouvel examen</button>
          </div>

          {submitted && score !== null && (
            <div className={`score-banner fade-in ${score.correct >= score.total * 0.7 ? 'good' : 'bad'}`}>
              <span className="score-emoji">{score.correct >= score.total * 0.7 ? '🎉' : '📚'}</span>
              <div>
                <div className="score-main">{score.correct} / {score.total} bonnes réponses</div>
                <div className="score-pct">
                  {Math.round((score.correct / score.total) * 100)}% — {score.correct >= score.total * 0.7 ? 'Excellent travail !' : 'Continuez à réviser !'}
                  {isMixed && config.open_count > 0 && ' · Questions ouvertes non comptées'}
                </div>
              </div>
            </div>
          )}

          {submitted && config.question_type === 'open' && (
            <div className="score-banner good fade-in">
              <span className="score-emoji">📖</span>
              <div>
                <div className="score-main">Réponses modèles disponibles</div>
                <div className="score-pct">Comparez vos réponses ci-dessous</div>
              </div>
            </div>
          )}

          <div className="questions-list">
            {exam.questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                q={q}
                index={i}
                type={q.type || config.question_type}
                answer={answers[q.id]}
                onAnswer={(a) => handleAnswer(q.id, a)}
                submitted={submitted}
                showTypeBadge={isMixed}
              />
            ))}
          </div>

          {!submitted && (
            <button className="submit-btn" onClick={submitExam} disabled={isSubmitDisabled()}>
              ✅ Soumettre l'examen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, index, type, answer, onAnswer, submitted, showTypeBadge }) {
  const isCorrect = submitted && (
    type === 'mcq' ? answer === q.correct :
    type === 'tf'  ? answer === String(q.correct) : null
  );

  const cardClass = submitted
    ? (isCorrect === true ? 'question-card correct' : isCorrect === false ? 'question-card wrong' : 'question-card')
    : 'question-card';

  return (
    <div className={cardClass}>
      <div className="q-header">
        <span className="q-num">Q{index + 1}</span>
        {showTypeBadge && <span className={`q-type-badge q-type-${type}`}>{TYPE_LABELS[type]}</span>}
        <span className="q-text">{type === 'tf' ? q.statement : q.question}</span>
      </div>

      {type === 'mcq' && (
        <div className="options">
          {q.options.map((opt, j) => {
            const letter = ['A', 'B', 'C', 'D'][j];
            const isSelected = answer === letter;
            const isRight = submitted && letter === q.correct;
            const isWrong = submitted && isSelected && letter !== q.correct;
            return (
              <button
                key={j}
                className={`option ${isSelected ? 'selected' : ''} ${isRight ? 'right' : ''} ${isWrong ? 'wrong-opt' : ''}`}
                onClick={() => onAnswer(letter)}
                disabled={submitted}
              >
                <span className="opt-letter">{letter}</span>
                <span>{opt.replace(/^[A-D]\.\s*/, '')}</span>
              </button>
            );
          })}
        </div>
      )}

      {type === 'tf' && (
        <div className="tf-btns">
          {['true', 'false'].map(v => {
            const label = v === 'true' ? '✅ Vrai' : '❌ Faux';
            const isSelected = answer === v;
            const isRight = submitted && v === String(q.correct);
            const isWrong = submitted && isSelected && v !== String(q.correct);
            return (
              <button
                key={v}
                className={`tf-btn ${isSelected ? 'selected' : ''} ${isRight ? 'right' : ''} ${isWrong ? 'wrong-opt' : ''}`}
                onClick={() => onAnswer(v)}
                disabled={submitted}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {type === 'open' && (
        <textarea
          className="open-answer"
          placeholder="Écrivez votre réponse ici..."
          value={answer || ''}
          onChange={e => onAnswer(e.target.value)}
          disabled={submitted}
          rows={4}
        />
      )}

      {submitted && q.explanation && (
        <div className="explanation">
          <span className="exp-label">💡 Explication :</span> {q.explanation}
        </div>
      )}

      {submitted && type === 'open' && q.model_answer && (
        <div className="model-answer">
          <div className="exp-label">📖 Réponse modèle :</div>
          <p>{q.model_answer}</p>
          {q.key_points && (
            <ul className="key-points">
              {q.key_points.map((pt, i) => <li key={i}>{pt}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
