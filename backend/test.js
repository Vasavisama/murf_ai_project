const axios = require('axios');

async function test() {
  try {
    console.log('Testing Gemini API...');
    const resA = await axios.post('http://localhost:5000/api/interview/start', {
      sessionId: 'test_' + Date.now(),
      topic: 'React Developer'
    });
    console.log('Gemini success:', resA.data);
    
    console.log('Testing Murf TTS API...');
    const resB = await axios.post('http://localhost:5000/api/tts', {
      text: resA.data.question,
      voiceId: 'en-US-marcus'
    });
    console.log('Murf TTS success:', !!resB.data.audioUrl);
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

test();
