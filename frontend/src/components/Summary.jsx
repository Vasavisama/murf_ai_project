import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Target, TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function Summary({ session }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !session.id) {
      navigate('/');
      return;
    }

    const fetchSummary = async () => {
      try {
        const res = await axios.get(`http://localhost:5005/api/interview/summary/${session.id}`);
        setSummary(res.data);
      } catch (err) {
        console.error('Error fetching summary:', err);
        alert('Failed to load interview summary.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [session, navigate]);

  const handleRestart = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <RefreshCw size={48} className="spin" style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
        <h2>Generating Your Report...</h2>
        <p>Analyzing your answers to provide feedback.</p>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="card fade-in" style={{ maxWidth: '700px', margin: '0 auto', marginTop: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'inline-flex', padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
          <Award color="var(--success)" size={48} />
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>Interview Complete!</h1>
        <p style={{ fontSize: '1.125rem' }}>Role: <strong style={{ color: 'var(--text-primary)' }}>{session.topic}</strong></p>
        
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-color)', lineHeight: 1 }}>{summary.totalScore}</span>
          <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>/ 50</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Score</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '1rem' }}>
            <Target size={20} /> Key Strengths
          </h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summary.strengths?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)', marginBottom: '1rem' }}>
            <TrendingUp size={20} /> Areas to Improve
          </h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {summary.weakAreas?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)', marginBottom: '1rem' }}>
          <Lightbulb size={20} /> Actionable Suggestions
        </h3>
        <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {summary.suggestions?.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>

      <button onClick={handleRestart} className="btn" style={{ width: '100%', padding: '1rem' }}>
        Start a New Interview
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 2s linear infinite; }
      `}} />
    </div>
  );
}
