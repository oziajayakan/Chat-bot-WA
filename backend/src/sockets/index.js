import { logger } from '../services/logger.js';
import { whatsapp } from '../services/whatsapp.js';
import { MessageRepo } from '../database/db.js';

/**
 * Setup semua Socket.IO events
 */
export function setupSockets(io) {
  io.on('connection', (socket) => {
    logger.info('SocketIO', `Client connected: ${socket.id}`);

    // Kirim initial state
    socket.emit('wa:status', whatsapp.getStatus());
    socket.emit('logs:recent', logger.getRecent(50));
    socket.emit('stats:initial', MessageRepo.getStats());

    // ============= CHAT EVENTS =============
    socket.on('chat:send', async ({ userId, message, model }, callback) => {
      try {
        logger.info('Chat', `User ${userId} sent: "${message.substring(0, 50)}..."`);
        const { openrouter } = await import('../services/openrouter.js');

        const history = MessageRepo.getHistory(userId, 20);
        const messages = [
          ...history,
          { role: 'user', content: message }
        ];

        // Stream response
        socket.emit('chat:start', { userId, model });

        let fullReply = '';
        for await (const chunk of openrouter.chat(messages, { model, userId, stream: true })) {
          if (chunk.type === 'delta') {
            fullReply += chunk.content;
            socket.emit('chat:delta', { userId, content: chunk.content });
          } else if (chunk.type === 'done') {
            MessageRepo.add(userId, 'user', message);
            MessageRepo.add(userId, 'assistant', fullReply, chunk.model, chunk.tokens, chunk.duration);
            socket.emit('chat:done', {
              userId,
              content: fullReply,
              model: chunk.model,
              tokens: chunk.tokens,
              duration: chunk.duration
            });
          }
        }

        callback?.({ success: true });
      } catch (err) {
        logger.error('Chat', `Error: ${err.message}`);
        socket.emit('chat:error', { userId, error: err.message });
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on('chat:history', ({ userId }) => {
      const history = MessageRepo.getHistory(userId, 50);
      socket.emit('chat:history', { userId, history });
    });

    // ============= WHATSAPP EVENTS =============
    socket.on('wa:reconnect', () => {
      logger.info('WhatsApp', 'Manual reconnect requested');
      whatsapp.initialize();
    });

    socket.on('wa:logout', async () => {
      try {
        await whatsapp.logout();
        socket.emit('wa:status', whatsapp.getStatus());
      } catch (err) {
        socket.emit('wa:error', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info('SocketIO', `Client disconnected: ${socket.id}`);
    });
  });

  // ============ Broadcast events dari services ============

  // Logger → broadcast ke semua client
  logger.on('log', (entry) => {
    io.emit('log:new', entry);
  });

  // WhatsApp → broadcast status
  whatsapp.on('qr', (qr) => {
    io.emit('wa:qr', qr);
  });

  whatsapp.on('status', (status) => {
    io.emit('wa:status', whatsapp.getStatus());
  });

  whatsapp.on('connected', (user) => {
    io.emit('wa:connected', user);
  });

  whatsapp.on('message', (data) => {
    io.emit('wa:message', data);
  });

  logger.info('SocketIO', 'Handlers registered');
}
