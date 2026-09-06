import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import './database/db.js';
import { setupSockets } from './sockets/index.js';
import apiRoutes from './routes/api.js';
import { logger } from './services/logger.js';
import { whatsapp } from './services/whatsapp.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// ============ MIDDLEWARES ============
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow semua Railway internal & frontend domains
    const allowed = process.env.CORS_ORIGIN?.split(',') || [];
    if (!origin || allowed.includes('*') || allowed.some(o => origin.includes(o))) {
      callback(null, true);
    } else {
      callback(null, true); // permissive untuk development; tighten di production
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  logger.info('HTTP', `${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  message: { error: 'Too many requests' }
});
app.use('/api/', limiter);

// ============ ROUTES ============
app.get('/', (_req, res) => {
  res.json({
    name: 'Chatbot Assistant API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/api/models', '/api/chat', '/api/stats', '/api/whatsapp/status', '/api/logs']
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    whatsapp: whatsapp.getStatus().status
  });
});

app.use('/api', apiRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Server', `Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ============ SOCKET.IO ============
setupSockets(io);

// ============ START ============
const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server', `🚀 Running on port ${PORT}`);
  logger.info('Server', `Environment: ${process.env.NODE_ENV}`);
  logger.info('Server', `CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);

  // Initialize WhatsApp setelah server ready
  whatsapp.initialize();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Server', 'SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  logger.error('Server', `Uncaught: ${err.message}`, { stack: err.stack });
});
