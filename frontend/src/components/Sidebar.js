import React from 'react';
import './Sidebar.css';

const navItems = [
  {
    id: 'upload',
    icon: '📄',
    label: 'Importer PDF',
    desc: 'Charger un document',
  },
  {
    id: 'courses',
    icon: '🎓',
    label: 'Plateforme Cours',
    desc: 'Cours IA & Étude',
  },
  {
    id: 'chat',
    icon: '💬',
    label: 'Assistant IA',
    desc: 'Poser des questions',
  },
  {
    id: 'exam',
    icon: '📝',
    label: 'Générer Examen',
    desc: 'Créer des questions',
  },
];

export default function Sidebar({ activePage, setActivePage, pdfLoaded }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🎓</div>
        <div>
          <div className="logo-title">EduRAG</div>
          <div className="logo-sub">Assistant Pédagogique IA</div>
        </div>
      </div>

      <div className="sidebar-status">
        <div className={`status-dot ${pdfLoaded ? 'active' : ''}`} />
        <span>{pdfLoaded ? 'Document chargé ✓' : 'Aucun document'}</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''} ${
              item.id !== 'upload' && item.id !== 'courses' && !pdfLoaded ? 'disabled' : ''
            }`}
            onClick={() => {
              if (item.id === 'upload' || item.id === 'courses' || pdfLoaded) setActivePage(item.id);
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <div className="nav-text">
              <span className="nav-label">{item.label}</span>
              <span className="nav-desc">{item.desc}</span>
            </div>
            {item.id !== 'upload' && item.id !== 'courses' && !pdfLoaded && (
              <span className="nav-lock">🔒</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-badge">
          <span>⚡</span>
          <span>Propulsé par Mistral AI</span>
        </div>
        <div className="footer-info">Projet IA Générative · 2026</div>
      </div>
    </aside>
  );
}
