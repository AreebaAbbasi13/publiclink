const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
  processAIChat,
  generateSmartRecommendations,
  generateAISummary,
  generateAIPieChart
} = require('../services/aiService');

const router = express.Router();
router.use(authMiddleware);

// POST /api/ai/assistant
router.post('/assistant', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Prompt or question is required.' });
  }

  try {
    const response = await processAIChat(req.user.id, message.trim(), history);
    return res.json({ response });
  } catch (err) {
    console.error('AI Assistant error:', err);
    return res.status(500).json({ error: 'Failed to generate AI response.' });
  }
});

// GET /api/ai/recommendations
router.get('/recommendations', (req, res) => {
  try {
    const recommendations = generateSmartRecommendations(req.user.id);
    return res.json({ recommendations });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate recommendations.' });
  }
});

// GET /api/ai/summary
router.get('/summary', (req, res) => {
  try {
    const summary = generateAISummary(req.user.id);
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate AI summary.' });
  }
});

// POST /api/ai/pie-chart
router.post('/pie-chart', (req, res) => {
  const { prompt } = req.body;
  try {
    const chartData = generateAIPieChart(req.user.id, prompt || '');
    return res.json(chartData);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate dynamic pie chart.' });
  }
});

module.exports = router;
