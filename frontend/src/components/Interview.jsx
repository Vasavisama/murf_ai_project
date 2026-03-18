import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Volume2, Mic, CheckCircle, AlertCircle, Square } from 'lucide-react';
import axios from 'axios';

export default function Interview({ session }) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(session?.firstQuestion || '');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceAnswer, setIsVoiceAnswer] = useState(false);
  
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const answerDurationRef = useRef(0);

  // Redirect if no session
  useEffect(() => {
    if (!session || !session.id) {
      navigate('/');
    }
  }, [session, navigate]);

  // Handle playing TTS for new question
  useEffect(() => {
    if (question && !feedback && !evaluating && !loading) {
      playTTS(question);
    }
  }, [question]); // Only trigger when question changes and ready

  const playTTS = async (text) => {
    if (!text) return;
    try {
      const res = await axios.post('http://localhost:5005/api/tts', { 
        text, 
        language: session.language || 'English' 
      });
      if (res.data.audioUrl) {
        setAudioUrl(res.data.audioUrl);
      }
    } catch (err) {
      console.error('TTS Error:', err);
    }
  };

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio playback failed", e));
    }
  }, [audioUrl]);

  // Voice Recording Functions
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition. Try using Chrome or Edge.");
      return;
    }

    // Stop current speaking if any
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (!isVoiceAnswer) setIsVoiceAnswer(true);
    recordingStartTimeRef.current = Date.now();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const langMap = {
      'English': 'en-US',
      'Telugu': 'te-IN',
      'Hindi': 'hi-IN'
    };
    recognition.lang = langMap[session.language] || 'en-US';

    let finalTranscript = answer;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let newFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      finalTranscript += newFinal;
      setAnswer(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (recordingStartTimeRef.current) {
      answerDurationRef.current += Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      recordingStartTimeRef.current = null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    if (isRecording) {
      stopRecording();
    }

    setEvaluating(true);
    setAudioUrl(null); // stop current audio

    try {
      const res = await axios.post('http://localhost:5005/api/interview/answer', {
        sessionId: session.id,
        answer: answer.trim(),
        isVoiceAnswer,
        answerDuration: answerDurationRef.current
      });

      const { feedback: aiFeedback, score, followUpQuestion, isInterviewOver, confidenceFeedback, confidenceLevel, speakingSpeed, hesitationsDetected } = res.data;
      
      setFeedback({ 
        text: aiFeedback, 
        score, 
        isInterviewOver, 
        followUpQuestion,
        confidenceLevel,
        speakingSpeed,
        hesitationsDetected,
        confidenceFeedback
      });
      setAnswer('');
      setIsVoiceAnswer(false);
      answerDurationRef.current = 0;
      
      // Auto play technical feedback + confidence feedback voice
      await playTTS(`${aiFeedback} ${confidenceFeedback || ''}`);

    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || 'Failed to evaluate answer. Please try again.';
      alert(errorMessage);
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (feedback.isInterviewOver) {
      navigate('/summary');
    } else {
      setQuestion(feedback.followUpQuestion);
      setFeedback(null);
      setAudioUrl(null);
    }
  };

  if (!session || !session.id) return null;

  return (
    <div className="card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Topic: <strong style={{ color: 'var(--text-primary)' }}>{session.topic}</strong>
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {audioUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-color)' }}>
              <Volume2 size={18} />
              <span style={{ fontSize: '0.875rem' }}>Playing voice...</span>
            </div>
          )}
          <button 
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to end the interview early?')) {
                navigate('/summary');
              }
            }}
            style={{ 
              backgroundColor: 'transparent', 
              color: 'var(--error, #ef4444)', 
              border: '1px solid var(--error, #ef4444)',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            End Interview
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '12px', borderLeft: '4px solid var(--accent-color)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Interviewer: <span style={{ color: 'var(--accent-color)' }}>{session.interviewerType || 'Technical Interviewer'}</span>
        </h2>
        {Array.isArray(session.detectedSkills) && session.detectedSkills.length > 0 && (
          <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 500, marginRight: '0.25rem' }}>Skills from your resume:</span>
            {session.detectedSkills.join(', ')}
          </div>
        )}
        <p style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>{question}</p>
      </div>

      {feedback ? (
        <div className="fade-in" style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div className="score-badge">
              {feedback.score}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: feedback.score >= 7 ? 'var(--success)' : 'var(--accent-color)' }}>
                <CheckCircle size={20} /> Evaluation Feedback
              </h3>
              <p className="feedback-box" style={{ marginBottom: '1rem' }}>{feedback.text}</p>
              
              {feedback.confidenceLevel && feedback.confidenceLevel !== 'N/A' && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Mic size={16} /> Confidence Analyzer
                  </h4>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <span className="badge" style={{ backgroundColor: feedback.confidenceLevel === 'High' ? 'var(--success)' : feedback.confidenceLevel === 'Medium' ? 'var(--accent-color)' : '#ef4444' }}>Level: {feedback.confidenceLevel}</span>
                    <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>Speed: {feedback.speakingSpeed}</span>
                    {feedback.hesitationsDetected && <span className="badge" style={{ backgroundColor: '#f59e0b' }}>Hesitations Detected</span>}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{feedback.confidenceFeedback}</p>
                </div>
              )}
            </div>
          </div>
          
          <button onClick={handleNext} className="btn" style={{ width: '100%', padding: '1rem' }}>
            {feedback.isInterviewOver ? 'See Final Dashboard' : 'Next Question'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Your Answer:</label>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                // If they manually type, it's mostly no longer purely a voice answer
                if (e.target.value.length > answer.length + 10) setIsVoiceAnswer(false);
              }}
              placeholder="Type your answer here or click 'Answer with Voice'..."
              disabled={evaluating}
              style={{ minHeight: '200px' }}
              autoFocus
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className={`btn-secondary ${isRecording ? 'recording-pulse' : ''}`} 
              style={{ padding: '1rem', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
              disabled={evaluating}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <><Square size={18} fill="currentColor" style={{ marginRight: '0.5rem' }} /> Stop Recording</>
              ) : (
                <><Mic size={18} style={{ marginRight: '0.5rem' }} /> Answer with Voice</>
              )}
            </button>
            <button type="submit" className="btn" style={{ padding: '1rem', flex: 2 }} disabled={!answer.trim() || evaluating}>
              {evaluating ? 'Evaluating...' : (
                <>Submit Answer <Send size={18} /></>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Hidden audio element for autoplay */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls style={{ display: 'none' }} />
      )}
    </div>
  );
}
