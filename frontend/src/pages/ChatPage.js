import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './ChatPage.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const SUGGESTIONS = [
  'Résume les points clés de ce cours',
  'Explique les concepts principaux',
  'Quelles sont les définitions importantes ?',
  'Donne-moi un plan du document',
];

export default function ChatPage({ pdfLoaded, setActivePage }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Bonjour ! Je suis votre assistant pédagogique IA. Posez-moi n\'importe quelle question sur votre document et je vous répondrai avec précision. 📚',
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/chat`, { question });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || [],
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erreur de connexion. Vérifiez que le backend est lancé.',
        sources: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!pdfLoaded) {
    return (
      <div className="no-pdf fade-in">
        <div className="no-pdf-icon">🔒</div>
        <h2>Document requis</h2>
        <p>Veuillez d'abord importer un PDF pour utiliser l'assistant.</p>
        <button onClick={() => setActivePage('upload')}>Importer un PDF</button>
      </div>
    );
  }

  return (
    <div className="chat-page fade-in">
      <div className="chat-header">
        <h1 className="page-title">💬 Assistant Pédagogique IA</h1>
        <p className="page-subtitle">Posez vos questions sur le document — l'IA répond en s'appuyant sur le contenu.</p>
      </div>

      <div className="chat-container">
        <div className="messages-area">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role} fade-in`}>
              <div className="msg-avatar">
                {msg.role === 'assistant' ? '🎓' : '👤'}
              </div>
              <div className="msg-bubble">
                <div className="msg-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="msg-sources">
                    <span className="sources-label">📌 Sources :</span>
                    {msg.sources.map((s, j) => (
                      <div key={j} className="source-snippet">{s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant fade-in">
              <div className="msg-avatar">🎓</div>
              <div className="msg-bubble">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="suggestions">
            <p className="suggestions-label">Suggestions de questions :</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-btn" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-area">
          <div className="input-row">
            <input
              className="chat-input"
              type="text"
              placeholder="Posez votre question ici..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={loading}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
