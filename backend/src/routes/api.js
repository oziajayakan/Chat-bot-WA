import express from 'express';
import { openrouter } from '../services/openrouter.js';
import { MessageRepo } from '../database/db.js';
import { whatsapp } from '../services/whatsapp.js';
import { logger } from '../services/logger.js';

const router = express.Router();

// ============= OPENROUTER =============
router.get('/models', (req, res) => {
  res.json({ models: openrouter.getModels(), default: openrouter.defaultModel });
});

router.post('/chat', async (req, res) => {
  try {
    const { userId = 'web-user', message, model, history = [] } = req.body;

    if (!message) return res.status(400).json({ error: 'message required' });

    const messages = [...history, { role: 'user', content: message }];
    const result = await openrouter.chat(messages, { model, userId });

    MessageRepo.add(userId, 'user', message);
    MessageRepo.add(userId, 'assistant', result.content, result.model, result.tokens, result.duration);

    res.json(result);
  } catch (err) {
    logger.error('API', `/chat error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ============= STATS =============
router.get('/stats', (req, res) => {
  res.json(MessageRepo.getStats());
});

router.get('/sessions', (req, res) => {
  res.json({ sessions: MessageRepo.getAllSessions() });
});

router.get('/history/:userId', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ history: MessageRepo.getHistory(req.params.userId, limit) });
});

// ============= WHATSAPP =============
router.get('/whatsapp/status', (req, res) => {
  res.json(whatsapp.getStatus());
});

router.post('/whatsapp/reconnect', (req, res) => {
  whatsapp.initialize();
  res.json({ message: 'Reconnect triggered' });
});

router.post('/whatsapp/logout', async (req, res) => {
  try {
    await whatsapp.logout();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/whatsapp/send', async (req, res) => {
  try {
    const { jid, message } = req.body;
    if (!jid || !message) return res.status(400).json({ error: 'jid & message required' });
    await whatsapp.sendMessage(jid, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= LOGS =============
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ logs: logger.getRecent(limit) });
});

router.delete('/logs', (req, res) => {
  logger.clear();
  res.json({ success: true });
});

export default router;
