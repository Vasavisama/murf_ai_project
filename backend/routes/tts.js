const express = require('express');
const router = express.Router();
const axios = require('axios');

// Proxy to Murf API to avoid CORS issues and keep API key hidden
router.post('/', async (req, res) => {
  try {
    const { text, language, voiceId: providedVoiceId } = req.body;
    
    let voiceId = providedVoiceId;
    if (!voiceId) {
      if (language === 'Telugu') voiceId = 'en-IN-isha'; // Fallback to Indian English as Telugu native voice unavailable
      else if (language === 'Hindi') voiceId = 'hi-IN-ayushi';
      else voiceId = 'en-US-marcus';
    }
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const apiKey = process.env.MURF_API_KEY;
    if (!apiKey) throw new Error('MURF_API_KEY is not configured in backend');

    // Make request to Murf API
    // Replace with correct Murf URL when user provides key/details.
    // Example format:
    const response = await axios.post('https://api.murf.ai/v1/speech/generate', {
      voiceId: voiceId,
      style: "Conversational",
      text: text,
      rate: 0,
      pitch: 0,
      sampleRate: 48000,
      format: "MP3",
      channelType: "MONO"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    });

    // Murf returns audioFile URL
    res.json({ audioUrl: response.data.audioFile });
  } catch (error) {
    console.error('Error with Murf TTS API, using fallback:', error?.response?.data || error.message);
    // Return empty audio to avoid crushing the flow, since UI handles missing audioUrl gracefully
    res.json({ audioUrl: null });
  }
});

module.exports = router;
