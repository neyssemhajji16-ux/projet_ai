import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import './CoursesPage.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function CoursesPage({ pdfLoaded, setPdfLoaded, setPdfInfo, pdfInfo, setActivePage }) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [status, setStatus] = useState('idle'); // idle, generating, loading_rag, ready
  const [courseContent, setCourseContent] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [error, setError] = useState('');
  
  // Right side panel tabs
  const [activeTab, setActiveTab] = useState('chat'); // chat, flashcards
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // If a document was already loaded from elsewhere, we can offer to reset it
  const handleReset = async () => {
    try {
      await axios.delete(`${API}/reset`);
      setPdfLoaded(false);
      setPdfInfo(null);
      setCourseContent('');
      setCourseTitle('');
      setStatus('idle');
      setChatMessages([]);
      setFlashcards([]);
    } catch (err) {
      setError('Erreur lors de la réinitialisation');
    }
  };

  const handleGenerateCourse = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError('');
    setStatus('generating');
    
    try {
      // Step 1: Generate course text
      const resGen = await axios.post(`${API}/generate-course`, { topic, level });
      const generatedText = resGen.data.content;
      setCourseContent(generatedText);
      setCourseTitle(resGen.data.topic);
      
      // Step 2: Load text into RAG system
      setStatus('loading_rag');
      const filename = `${topic.replace(/\s+/g, '_')}.md`;
      const resLoad = await axios.post(`${API}/load-text`, {
        text: generatedText,
        filename: filename
      });

      setPdfLoaded(true);
      setPdfInfo({
        name: `🎓 Cours : ${resGen.data.topic}`,
        chunks: resLoad.data.chunks,
        isGenerated: true,
        topic: resGen.data.topic,
        level: level
      });

      // Step 3: Extract or generate 4 flashcards from course content
      generateFlashcards(generatedText);

      setStatus('ready');
      setChatMessages([
        {
          sender: 'ai',
          text: `Bonjour ! J'ai rédigé et indexé le cours complet sur "${resGen.data.topic}". Vous pouvez me poser toutes vos questions à ce sujet dans cet onglet !`
        }
      ]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Une erreur est survenue lors de la génération du cours.');
      setStatus('idle');
    }
  };

  // Helper to extract keywords or build cards from course text
  const generateFlashcards = (text) => {
    // We can parse the text or simply look for definitions.
    // For a reliable demo, let's parse bold items and lines or define some fallback cards based on the topic
    const cards = [];
    
    // Look for definitions or key concepts. Let's make an LLM-like extraction or a standard list
    // If we want it bulletproof, let's scan for lists in the text or parse bold terms.
    const lines = text.split('\n');
    let conceptCount = 0;
    
    for (let line of lines) {
      if (line.includes('**') && (line.includes(':') || line.includes(' - '))) {
        const parts = line.split(/\*\*|:| - /).filter(p => p.trim());
        if (parts.length >= 2 && conceptCount < 5) {
          cards.push({
            id: conceptCount,
            front: parts[0].replace(/[*#-]/g, '').trim(),
            back: parts[1].trim()
          });
          conceptCount++;
        }
      }
    }

    // Fallback flashcards if parsing didn't find enough concepts
    if (cards.length < 3) {
      cards.push(
        { id: 1, front: "Concept Clé 1", back: `Les notions fondamentales présentées dans l'introduction du cours sur ${topic}.` },
        { id: 2, front: "Application Pratique", back: "La mise en œuvre concrète des formules ou règles décrites dans les chapitres." },
        { id: 3, front: "Synthèse", back: "La conclusion générale reprenant les objectifs d'apprentissage initiaux." }
      );
    }
    setFlashcards(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, { question: chatInput });
      const aiMsg = {
        sender: 'ai',
        text: res.data.answer,
        sources: res.data.sources
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: "Désolé, je n'ai pas pu générer de réponse à cause d'une erreur technique." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Sync state if already loaded on mount
  useEffect(() => {
    if (pdfLoaded && pdfInfo?.isGenerated) {
      setStatus('ready');
      setCourseTitle(pdfInfo.topic);
      // Retrieve text from local storage or rebuild.
      // In this setup, we can fetch health or just assume it is active.
    }
  }, [pdfLoaded, pdfInfo]);

  return (
    <div className="courses-page fade-in">
      <div className="page-header">
        <h1 className="page-title">🎓 Espace d'Étude & Cours IA</h1>
        <p className="page-subtitle">
          Générez un cours complet par IA sur n'importe quel sujet, étudiez-le et interrogez votre assistant dédié.
        </p>
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      {status === 'idle' && (
        <motion.div 
          className="course-generator-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2>🧠 Générer un nouveau cours magistral</h2>
          <form onSubmit={handleGenerateCourse} className="generator-form">
            <div className="form-group">
              <label htmlFor="topic">Sujet d'étude</label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Les réseaux de neurones, La programmation orientée objet en Python..."
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="level">Niveau pédagogique</label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="beginner">Débutant (Concepts de base & Vulgarisation)</option>
                <option value="intermediate">Intermédiaire (Approfondissement & Exemples)</option>
                <option value="advanced">Avancé (Théorie rigoureuse & Technique)</option>
              </select>
            </div>

            <button type="submit" className="generate-btn">
              ⚡ Générer le cours par IA
            </button>
          </form>
        </motion.div>
      )}

      {(status === 'generating' || status === 'loading_rag') && (
        <div className="loading-card fade-in">
          <div className="spinner" />
          <h2>
            {status === 'generating' 
              ? "Rédaction du cours par Mistral Large..." 
              : "Indexation du cours dans la base RAG..."}
          </h2>
          <p className="loading-sub">
            {status === 'generating' 
              ? "Création d'un contenu structuré, complet et de niveau universitaire..." 
              : "Découpage en paragraphes et vectorisation sémantique..."}
          </p>
        </div>
      )}

      {status === 'ready' && (
        <div className="course-study-layout fade-in">
          {/* Left panel: course text */}
          <div className="course-text-panel">
            <div className="panel-header">
              <span className="panel-badge">📚 Support de cours</span>
              <button className="change-course-btn" onClick={handleReset}>
                Changer de sujet
              </button>
            </div>
            <div className="course-markdown-body">
              {courseContent ? (
                <ReactMarkdown>{courseContent}</ReactMarkdown>
              ) : (
                <div className="empty-text">
                  <h3>Cours rechargé depuis le disque.</h3>
                  <p>Pour modifier ou rédiger un nouveau cours, cliquez sur "Changer de sujet".</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Chat / Study tool */}
          <div className="course-tools-panel">
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 Tuteur IA
              </button>
              <button 
                className={`tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
                onClick={() => setActiveTab('flashcards')}
              >
                🗂️ Cartes Mémo
              </button>
              <button 
                className="tab-btn quiz-btn"
                onClick={() => setActivePage('exam')}
              >
                📝 Lancer un Quiz
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'chat' && (
                <div className="study-chat-container">
                  <div className="chat-history">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`chat-bubble ${msg.sender}`}>
                        <div className="bubble-text">{msg.text}</div>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="sources-list">
                            <strong>Sources :</strong>
                            {msg.sources.map((s, i) => (
                              <div key={i} className="source-item">{s}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="chat-bubble ai loading">
                        <div className="typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendChatMessage} className="chat-input-form">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Posez une question sur ce cours..."
                      disabled={chatLoading}
                    />
                    <button type="submit" disabled={chatLoading || !chatInput.trim()}>
                      Envoyer
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="study-flashcards-container">
                  <h3>🃏 Cartes mémo interactives</h3>
                  <p className="flashcard-instructions">Cliquez sur la carte pour la retourner, puis passez à la suivante.</p>
                  
                  {flashcards.length > 0 ? (
                    <div className="flashcard-wrapper">
                      <div 
                        className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                        onClick={() => setIsFlipped(!isFlipped)}
                      >
                        <div className="card-face card-front">
                          <div className="card-label">CONCEPT</div>
                          <div className="card-text">{flashcards[currentCardIndex]?.front}</div>
                          <div className="card-flip-hint">🔄 Cliquer pour voir la définition</div>
                        </div>
                        <div className="card-face card-back">
                          <div className="card-label">EXPLICATION</div>
                          <div className="card-text">{flashcards[currentCardIndex]?.back}</div>
                          <div className="card-flip-hint">🔄 Cliquer pour revoir le concept</div>
                        </div>
                      </div>

                      <div className="flashcards-controls">
                        <button 
                          disabled={currentCardIndex === 0}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev - 1);
                            setIsFlipped(false);
                          }}
                        >
                          ◀ Précédente
                        </button>
                        <span className="card-counter">
                          {currentCardIndex + 1} / {flashcards.length}
                        </span>
                        <button 
                          disabled={currentCardIndex === flashcards.length - 1}
                          onClick={() => {
                            setCurrentCardIndex(prev => prev + 1);
                            setIsFlipped(false);
                          }}
                        >
                          Suivante ▶
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="no-cards">Aucun concept clé extrait.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
