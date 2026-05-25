import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import UploadPage from './pages/UploadPage';
import CoursesPage from './pages/CoursesPage';
import ChatPage from './pages/ChatPage';
import ExamPage from './pages/ExamPage';
import './App.css';

export default function App() {
  const [activePage, setActivePage] = useState('upload');
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfInfo, setPdfInfo] = useState(null);

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} pdfLoaded={pdfLoaded} />
      <main className="app-main">
        {activePage === 'upload' && (
          <UploadPage
            pdfLoaded={pdfLoaded}
            setPdfLoaded={setPdfLoaded}
            setPdfInfo={setPdfInfo}
            pdfInfo={pdfInfo}
            setActivePage={setActivePage}
          />
        )}
        {activePage === 'courses' && (
          <CoursesPage
            pdfLoaded={pdfLoaded}
            setPdfLoaded={setPdfLoaded}
            setPdfInfo={setPdfInfo}
            pdfInfo={pdfInfo}
            setActivePage={setActivePage}
          />
        )}
        {activePage === 'chat' && <ChatPage pdfLoaded={pdfLoaded} setActivePage={setActivePage} />}
        {activePage === 'exam' && <ExamPage pdfLoaded={pdfLoaded} setActivePage={setActivePage} />}
      </main>
    </div>
  );
}
