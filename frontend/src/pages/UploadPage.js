import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import './UploadPage.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function UploadPage({ pdfLoaded, setPdfLoaded, setPdfInfo, pdfInfo, setActivePage }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPdfLoaded(true);
      setPdfInfo({ name: file.name, ...res.data });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du PDF');
    } finally {
      setUploading(false);
    }
  }, [setPdfLoaded, setPdfInfo]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: uploading,
  });

  const handleReset = async () => {
    try {
      await axios.delete(`${API}/reset`);
      setPdfLoaded(false);
      setPdfInfo(null);
    } catch {}
  };

  return (
    <div className="upload-page fade-in">
      <div className="page-header">
        <h1 className="page-title">📄 Importer un Document</h1>
        <p className="page-subtitle">
          Chargez votre cours en PDF et laissez l'IA l'analyser pour vous aider à apprendre et réviser.
        </p>
      </div>

      {!pdfLoaded ? (
        <div className={`dropzone ${isDragActive ? 'drag-active' : ''} ${uploading ? 'loading' : ''}`} {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="dropzone-content">
            {uploading ? (
              <>
                <div className="spinner" />
                <p className="dz-title">Analyse en cours...</p>
                <p className="dz-sub">Mistral AI traite votre document 🧠</p>
              </>
            ) : isDragActive ? (
              <>
                <div className="dz-icon">🎯</div>
                <p className="dz-title">Déposez le fichier ici !</p>
              </>
            ) : (
              <>
                <div className="dz-icon">📚</div>
                <p className="dz-title">Glissez-déposez votre PDF ici</p>
                <p className="dz-sub">ou cliquez pour sélectionner un fichier</p>
                <div className="dz-formats">PDF uniquement · Taille max recommandée : 20 MB</div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="success-card fade-in">
          <div className="success-icon">✅</div>
          <div className="success-info">
            <h2 className="success-title">Document chargé avec succès !</h2>
            <p className="success-name">📄 {pdfInfo?.name}</p>
            <div className="success-stats">
              <div className="stat-badge">📑 {pdfInfo?.chunks || '?'} segments analysés</div>
              <div className="stat-badge">🧠 RAG vectorisé</div>
              <div className="stat-badge">⚡ Mistral AI prêt</div>
            </div>
          </div>
          <button className="reset-btn" onClick={handleReset}>Changer de document</button>
        </div>
      )}

      {error && <div className="error-box">⚠️ {error}</div>}

      {pdfLoaded && (
        <div className="next-steps fade-in">
          <h3 className="steps-title">Que voulez-vous faire ?</h3>
          <div className="steps-grid">
            <button className="step-card" onClick={() => setActivePage('chat')}>
              <span className="step-icon">💬</span>
              <span className="step-label">Poser des questions</span>
              <span className="step-desc">Discutez avec votre cours grâce à l'IA</span>
            </button>
            <button className="step-card" onClick={() => setActivePage('exam')}>
              <span className="step-icon">📝</span>
              <span className="step-label">Générer un examen</span>
              <span className="step-desc">Créez des questions de révision automatiquement</span>
            </button>
          </div>
        </div>
      )}

      <div className="how-it-works">
        <h3 className="hiw-title">Comment ça fonctionne ?</h3>
        <div className="hiw-steps">
          {[
            { icon: '📤', title: 'Importez', desc: 'Chargez votre cours PDF' },
            { icon: '🔍', title: 'Analyse', desc: 'Mistral AI découpe et indexe le contenu' },
            { icon: '💬', title: 'Interrogez', desc: 'Posez vos questions en langage naturel' },
            { icon: '📝', title: 'Révisez', desc: 'Générez des examens personnalisés' },
          ].map((s, i) => (
            <div className="hiw-step" key={i}>
              <div className="hiw-icon">{s.icon}</div>
              <div className="hiw-step-num">{i + 1}</div>
              <div className="hiw-step-title">{s.title}</div>
              <div className="hiw-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
