import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Mic, Briefcase, Award } from 'lucide-react';

import TopicSelection from './components/TopicSelection';
import Interview from './components/Interview';
import Summary from './components/Summary';
import './index.css';

function App() {
  // We'll manage session state here at the top level to pass it to components
  // sessionId is generated locally, and we store the role/topic.
  const [session, setSession] = useState({
    id: null,
    topic: null,
    interviewerType: null,
    language: 'English',
    firstQuestion: '',
    detectedSkills: []
  });

  return (
    <Router>
      <div className="app-container">
        <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--accent-color)', borderRadius: '12px' }}>
            <Mic color="#ffffff" size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>AI Interview Coach</h2>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Powered by Gemini & Murf Voice</p>
          </div>
        </header>
        
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<TopicSelection setSession={setSession} />} />
            <Route path="/interview" element={<Interview session={session} />} />
            <Route path="/summary" element={<Summary session={session} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
