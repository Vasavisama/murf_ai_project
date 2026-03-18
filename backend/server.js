require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const interviewRoutes = require('./routes/interview');
const ttsRoutes = require('./routes/tts');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Interview Coach Server Running' });
});

// Register routes
app.use('/api/interview', interviewRoutes);
app.use('/api/tts', ttsRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
