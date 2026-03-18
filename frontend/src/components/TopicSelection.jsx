import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function TopicSelection({ setSession }) {
  const [topic, setTopic] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [interviewerType, setInterviewerType] = useState('Technical Interviewer');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const sessionId = `req_${Date.now()}`;
      // Initialize the session on backend
      
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('topic', topic.trim());
      formData.append('interviewerType', interviewerType);
      formData.append('language', language);
      if (resumeFile) {
        formData.append('resumeFile', resumeFile);
      }

      const res = await axios.post('http://localhost:5005/api/interview/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Save session info
      setSession({
        id: sessionId,
        topic: topic.trim(),
        interviewerType,
        language,
        firstQuestion: res.data.generatedQuestion || res.data.question
      });

      navigate('/interview');
    } catch (error) {
      console.error(error);
      const urlHit = error.config?.url;
      const errorData = error.response?.data ? JSON.stringify(error.response.data) : (error.message || 'Unknown network error');
      alert(`URL failed: ${urlHit}\nRaw Data: ${errorData}`);
    } finally {
      setLoading(false);
    }
  };

  const commonTopics = [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Data Scientist', 'Product Manager', 'HR Behavioral'
  ];

  return (
    <div className="card fade-in" style={{ maxWidth: '500px', margin: '0 auto', marginTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
          <Briefcase color="var(--accent-color)" size={32} />
        </div>
        <h1>Choose a Role</h1>
        <p>What position or topic would you like to interview for?</p>
      </div>

      <form onSubmit={handleStart}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Target Role / Topic *</label>
          <input
            type="text"
            placeholder="e.g. React Developer, Data Analyst..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Upload Resume (Optional PDF / TXT file)</label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setResumeFile(e.target.files[0])}
            disabled={loading}
            style={{ 
              padding: '1rem', 
              border: '1px dashed var(--accent-color)', 
              borderRadius: '8px', 
              width: '100%',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-primary)'
            }}
          />
          {resumeFile && <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '0.5rem' }}>Attached: {resumeFile.name}</p>}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Interviewer Persona *</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['HR Interviewer', 'Technical Interviewer', 'Manager Interviewer'].map(type => (
              <label 
                key={type} 
                className="btn-secondary"
                style={{ 
                  flex: '1 1 calc(33.333% - 0.5rem)', 
                  padding: '0.75rem', 
                  border: `2px solid ${interviewerType === type ? 'var(--accent-color)' : 'transparent'}`,
                  backgroundColor: interviewerType === type ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: interviewerType === type ? '600' : '400',
                  color: interviewerType === type ? 'var(--accent-color)' : 'var(--text-primary)',
                  transition: 'all 0.2s',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '120px'
                }}
              >
                <input 
                  type="radio" 
                  name="interviewerType" 
                  value={type} 
                  checked={interviewerType === type}
                  onChange={(e) => setInterviewerType(e.target.value)}
                  style={{ display: 'none' }} 
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Interview Language *</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['English', 'Telugu', 'Hindi'].map(lang => (
              <label 
                key={lang} 
                className="btn-secondary"
                style={{ 
                  flex: '1 1 calc(33.333% - 0.5rem)', 
                  padding: '0.75rem', 
                  border: `2px solid ${language === lang ? 'var(--accent-color)' : 'transparent'}`,
                  backgroundColor: language === lang ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: language === lang ? '600' : '400',
                  color: language === lang ? 'var(--accent-color)' : 'var(--text-primary)',
                  transition: 'all 0.2s',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '100px'
                }}
              >
                <input 
                  type="radio" 
                  name="language" 
                  value={lang} 
                  checked={language === lang}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{ display: 'none' }} 
                />
                {lang}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
          {commonTopics.map((t) => (
            <button
              key={t}
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: '20px', cursor: 'pointer' }}
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <button 
          type="submit" 
          className="btn" 
          disabled={!topic.trim() || loading}
          style={{ width: '100%', padding: '1rem' }}
        >
          {loading ? 'Preparing Interview...' : (
            <>Start Interview <ArrowRight size={18} /></>
          )}
        </button>
      </form>
    </div>
  );
}
