const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// In-memory store for MVP
// Maps sessionId -> { topic, history: [] }
const sessions = {};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Helper to call Groq AI
async function callGroq(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');

  const payload = {
    model: "llama-3.3-70b-versatile", // High power model for logic
    messages: [
      {
        role: "system",
        content: "You are a strict, highly structured mock interview engine. You must always respond ONLY with valid JSON that exactly matches the requested schema. Do not add explanations, markdown, or extra keys."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  const response = await axios.post(GROQ_API_URL, payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const textContent = response.data.choices[0].message.content;
  
  try {
    return JSON.parse(textContent);
  } catch (e) {
    // If not strict JSON, try to extract inside ```json block
    const match = textContent.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Failed to parse Groq response as JSON');
  }
}

// Start a new interview
router.post('/start', upload.single('resumeFile'), async (req, res) => {
  try {
    const { sessionId, topic, interviewerType, language } = req.body;
    
    let resume = req.body.resume || '';
    if (req.file) {
      try {
        if (req.file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(req.file.buffer);
          resume = pdfData.text;
        } else {
          resume = req.file.buffer.toString('utf8');
        }
      } catch (parseErr) {
        console.error('Failed to parse uploaded file:', parseErr);
        // Continue with empty resume or fallback
      }
    }
    if (!sessionId || !topic) {
      return res.status(400).json({ error: 'sessionId and topic are required' });
    }

    sessions[sessionId] = {
      topic,
      interviewerType: interviewerType || 'Technical Interviewer',
      language: language || 'English',
      resume: resume || null,
      detectedSkills: [],
      history: []
    };

    const isHR = sessions[sessionId].interviewerType.includes('HR');
    const isManager = sessions[sessionId].interviewerType.includes('Manager');
    
    let roleDescription = "expert technical interviewer";
    let questionFocus = "technical concepts, system design, and problem-solving abilities";
    if (isHR) {
      roleDescription = "senior HR recruiter";
      questionFocus = "behavioral aspects, cultural fit, teamwork, and past experiences";
    } else if (isManager) {
      roleDescription = "engineering manager";
      questionFocus = "leadership, decision-making, project management, and conflict resolution";
    }

    let prompt = `You are an ${roleDescription} for the role/topic: "${topic}". Your personality is ${sessions[sessionId].interviewerType}.\n`;
    prompt += `CRITICAL INSTRUCTION: You MUST generate the questions and all conversational context STRICTLY in this language: ${sessions[sessionId].language}.\n`;
    if (resume) {
      prompt += `The candidate has provided the following resume/experience:\n"""\n${resume}\n"""\n`;
      prompt += `Analyze the resume and extract their skills, technologies, and projects. Generate the first interview question specifically targeting their background with a focus on ${questionFocus}. Simulate a realistic interview from the perspective of a ${roleDescription}.\n`;
    } else {
      prompt += `Generate the first interview question to ask the candidate. It should be an introductory question focused on ${questionFocus}.\n`;
    }
    
    prompt += `Do NOT provide any greetings or conversational filler, JUST the question text itself.
Respond ONLY in this JSON format:
{
  "detectedSkills": ["Skill 1", "Skill 2"],
  "generatedQuestion": "The interview question text",
  "voiceEnabled": true
}`;

    let data;
    try {
      data = await callGroq(prompt);
    } catch (apiError) {
      console.error('Groq API failed, using fallback mock for /start:', apiError.response?.data || apiError.message);
      data = { 
        detectedSkills: resume ? ["Mock Skill 1", "Mock Skill 2"] : [],
        generatedQuestion: `Welcome! Since your Groq API key is out of quota, we are using a mock mode. Can you tell me your understanding of ${topic}?`,
        voiceEnabled: true
      };
    }
    
    if (data.detectedSkills) {
      sessions[sessionId].detectedSkills = data.detectedSkills;
    }

    // Save to history
    sessions[sessionId].history.push({ role: 'interviewer', content: data.generatedQuestion });

    res.json(data);
  } catch (error) {
    console.error('Fatal start error:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
});

// Evaluate answer and get next question
router.post('/answer', async (req, res) => {
  try {
    const { sessionId, answer, isVoiceAnswer, answerDuration } = req.body;
    
    if (!sessions[sessionId]) {
      return res.status(404).json({ error: 'Session not found. Please start a new interview.' });
    }

    const session = sessions[sessionId];
    const lastQuestion = session.history[session.history.length - 1].content;
    
    // Save user answer
    session.history.push({ role: 'candidate', content: answer });

    const totalQuestionsAsked = session.history.filter(h => h.role === 'interviewer').length;
    const isLastQuestion = totalQuestionsAsked >= 5; // End after 5 questions for MVP

    const isHR = session.interviewerType.includes('HR');
    const isManager = session.interviewerType.includes('Manager');
    
    let roleDescription = "expert technical interviewer";
    let questionFocus = "technical correctness and problem-solving depth";
    if (isHR) {
      roleDescription = "senior HR recruiter";
      questionFocus = "behavioral competencies, cultural fit, and communication skills";
    } else if (isManager) {
      roleDescription = "engineering manager";
      questionFocus = "leadership context, real-world decision impact, and team dynamics";
    }

    let prompt = `You are an ${roleDescription} for the role/topic: "${session.topic}". Your personality is ${session.interviewerType}.\n`;
    prompt += `CRITICAL INSTRUCTION: You MUST generate the feedback, confidenceFeedback, and followUpQuestion STRICTLY in this language: ${session.language}.\n`;
    
    if (session.resume) {
      prompt += `The candidate's detected skills are: ${session.detectedSkills.join(', ')}.\n`;
      prompt += `Keep their background in mind to make the interview feel personalized.\n`;
    }

    prompt += `The candidate just answered this question: "${lastQuestion}"
Their answer was: "${answer}"

Given this is question ${totalQuestionsAsked} out of 5.
Analyze the response carefully focusing on ${questionFocus}. Generate a natural follow-up interview question that is directly related to the user's answer.
- Probing deeper into their response from the perspective of a ${roleDescription}.
- If the answer is incomplete, ask a clarifying question.
- Formulate your question in the tone of a ${roleDescription}.
- Sound natural and professional like a real human interviewer.

CRITICAL SCORING INSTRUCTION: You must act as a strict technical interviewer and grade the candidate's answer accurately on a scale of 1 to 10. 
- Score 1-2: The answer is empty, punctuation-only (like ".."), nonsense, or a complete failure to answer. You MUST state the answer is invalid or completely wrong.
- Score 3-4: The answer is completely wrong or fundamentally misunderstands the concept.
- Score 5-7: The answer is partially correct but lacks depth or misses key technical details.
- Score 8-10: The answer is excellent, highly accurate, and detailed.
If the candidate's answer is just symbols, very short, or irrelevant, you MUST give a score of 1 or 2 and explicitly call out that the answer was invalid. Do not assume any correctness.

`;
    if (isVoiceAnswer) {
      prompt += `The user answered using Voice matching. Their total speaking duration was ${answerDuration || 0} seconds. 
Analyze the transcribed text for filler words (um, uh, like), hesitations, and word count. 
Estimate their "confidenceLevel" (High/Medium/Low), "speakingSpeed" (Fast/Moderate/Slow), and "hesitationsDetected" (boolean).
Generate "confidenceFeedback" addressing their speaking style (e.g., "Try reducing filler words...").\n`;
    } else {
      prompt += `The user typed their answer. You must still provide the confidence fields but set confidenceLevel to "N/A", speakingSpeed to "N/A", hesitationsDetected to false, and confidenceFeedback to "".\n`;
    }

    prompt += `Evaluate the answer and provide ONLY this JSON format:
{
  "feedback": "Technical evaluation (1-2 sentences)",
  "score": 4, // Integer from 1 to 10 assessing the answer strictly
  "followUpQuestion": "The natural follow-up question (null if question 5)",
  "isInterviewOver": false,
  "voiceEnabled": true,
  "confidenceLevel": "High",
  "speakingSpeed": "Moderate",
  "hesitationsDetected": false,
  "confidenceFeedback": "Your voice confidence feedback here..."
}`;

    let evaluatedData;
    try {
      evaluatedData = await callGroq(prompt);
    } catch (apiError) {
      console.error('Groq API failed, using fallback mock for /answer:', apiError.response?.data || apiError.message);
      evaluatedData = {
        feedback: "This is a mock evaluation because your API is failing. In a real scenario, I would provide specific feedback on your answer.",
        score: 8,
        followUpQuestion: isLastQuestion ? null : `Follow up mock question: How does ${session.topic} handle advanced logic?`,
        isInterviewOver: isLastQuestion,
        voiceEnabled: true,
        confidenceLevel: isVoiceAnswer ? "Medium" : "N/A",
        speakingSpeed: isVoiceAnswer ? "Moderate" : "N/A",
        hesitationsDetected: false,
        confidenceFeedback: isVoiceAnswer ? "Try to speak clearly and reduce any long pauses." : ""
      };
    }

    // Save evaluation and next question
    session.history.push({ role: 'evaluation', content: evaluatedData });
    if (evaluatedData.followUpQuestion) {
      session.history.push({ role: 'interviewer', content: evaluatedData.followUpQuestion });
    }

    res.json(evaluatedData);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

// Get interview summary
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = sessions[sessionId];

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Combine history for summary prompt
    let questionsAnswered = 0;
    const historyText = session.history.map(h => {
      if (h.role === 'interviewer') return `Q: ${h.content}`;
      if (h.role === 'candidate') {
        questionsAnswered++;
        return `A: ${h.content}`;
      }
      if (h.role === 'evaluation') return `Score: ${h.content.score}/10`;
      return '';
    }).join('\n');

    if (questionsAnswered === 0) {
      return res.json({
        totalScore: 0,
        maxPossibleScore: 0,
        strengths: ["No questions were answered."],
        weakAreas: ["The interview was ended before any answers were submitted."],
        suggestions: ["Take your time to answer at least one question next time!"]
      });
    }

    const maxScore = questionsAnswered * 10;

    const prompt = `You are an ${session.interviewerType || 'expert technical interviewer'}. The interview was ended early or naturally completed.
Review the following interview transcript for the role/topic: "${session.topic}". The candidate answered ${questionsAnswered} questions.

CRITICAL INSTRUCTION 1: You MUST generate the summary insights, strengths, weakAreas, and suggestions STRICTLY in this language: ${session.language}.
CRITICAL INSTRUCTION 2: Base your feedback EXCLUSIVELY on the actual candidate answers provided below. DO NOT hallucinate or invent topics, coding scenarios, or feedback about things that were not explicitly discussed in the transcript! If the transcript is short, only give feedback on what exists.

Transcript:
${historyText}

Based on the candidate's actual answers, provide an overall summary.
Respond ONLY in this strict JSON format:
{
  "totalScore": 42, // Total sum of their actual scores matching the evaluation scores (max ${maxScore})
  "maxPossibleScore": ${maxScore},
  "strengths": ["string", "string"], // 1-3 key strengths based ONLY on the transcript
  "weakAreas": ["string", "string"], // 1-3 areas that need work based ONLY on the transcript
  "suggestions": ["string", "string"] // 1-3 actionable tips based ONLY on the transcript
}`;

    let data;
    try {
      data = await callGroq(prompt);
      // Failsafe format
      if (data.maxPossibleScore === undefined) data.maxPossibleScore = maxScore;
    } catch (apiError) {
      console.error('Groq API failed, using fallback mock for /summary:', apiError.response?.data || apiError.message);
      data = {
        totalScore: questionsAnswered * 8, // mock decent score
        maxPossibleScore: maxScore,
        strengths: ["Completed the portion of the mock interview"],
        weakAreas: ["API Key needs to be upgraded for real evaluations"],
        suggestions: ["Fix API key", "Test with active quota"]
      };
    }
    res.json({
      ...data,
      detectedSkills: session.detectedSkills || []
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
