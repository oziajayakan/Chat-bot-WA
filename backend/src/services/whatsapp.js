import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';
import { openrouter } from './openrouter.js';
import { WaMessageRepo, MessageRepo } from '../database/db.js';

// Session path - support Railway Volume mount
const SESSION_PATH = process.env.SESSION_PATH
  || (process.env.DATA_PATH ? `${process.env.DATA_PATH}/sessions` : './sessions');

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sock = null;
    this.qrCode = null;
    this.status = 'disconnected'; // disconnected | qr | connecting | connected
    this.user = null;
    this.reconnectAttempts = 0;

    if (!fs.existsSync(SESSION_PATH)) {
      fs.mkdirSync(SESSION_PATH, { recursive: true });
    }
  }

  async initialize() {
    try {
      const sessionDir = path.join(SESSION_PATH, process.env.SESSION_NAME || 'wa-session');
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger.pino)
        },
        printQRInTerminal: false,
        logger: logger.pino,
        browser: ['Chatbot Assistant', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true
      });

      this._setupHandlers(saveCreds);
      logger.info('WhatsApp', 'Socket initialized');
    } catch (err) {
      logger.error('WhatsApp', `Init failed: ${err.message}`);
      setTimeout(() => this.initialize(), 5000);
    }
  }

  _setupHandlers(saveCreds) {
    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
        this.status = 'qr';
        logger.info('WhatsApp', '📱 QR Code generated - scan untuk login');
        this.emit('qr', this.qrCode);
      }

      if (connection === 'connecting') {
        this.status = 'connecting';
        logger.info('WhatsApp', 'Connecting...');
        this.emit('status', this.status);
      }

      if (connection === 'open') {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.user = this.sock.user;
        this.qrCode = null;
        logger.info('WhatsApp', `✅ Connected as ${this.user?.name || this.user?.id}`);
        this.emit('connected', this.user);
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        logger.warn('WhatsApp', `Disconnected | reason=${reason} | reconnect=${shouldReconnect}`);
        this.status = 'disconnected';
        this.emit('status', this.status);

        if (shouldReconnect) {
          this.reconnectAttempts++;
          const delay = Math.min(2000 * this.reconnectAttempts, 30000);
          logger.info('WhatsApp', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.initialize(), delay);
        } else {
          logger.error('WhatsApp', 'Logged out - hapus folder sessions untuk login ulang');
        }
      }
    });

    this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast') continue;

        const text = this._extractText(msg);
        if (!text) continue;

        const pushname = msg.pushName || 'Unknown';
        const startTime = Date.now();

        logger.info('WhatsApp', `📩 Message from ${pushname} (${jid})`, {
          preview: text.substring(0, 50)
        });

        try {
          // Simpan user message
          WaMessageRepo.add(jid, pushname, 'user', text);

          // Get history & generate reply
          const history = WaMessageRepo.getHistory(jid, 10).map(m => ({
            role: m.role,
            content: m.content
          }));

          // Indicate typing
          await this.sock.presenceSubscribe(jid);
          await this.sock.sendPresenceUpdate('composing', jid);

          const result = await openrouter.chat(history, {
            userId: `wa-${jid}`,
            temperature: 0.8
          });

          await this.sock.sendPresenceUpdate('paused', jid);

          // Kirim reply
          await this.sock.sendMessage(jid, {
            text: result.content
          }, { quoted: msg });

          WaMessageRepo.add(jid, pushname, 'assistant', result.content, result.model);
          MessageRepo.add(`wa-${jid}`, 'user', text);
          MessageRepo.add(`wa-${jid}`, 'assistant', result.content, result.model, result.tokens, result.duration);

          logger.info('WhatsApp', `📤 Replied to ${jid} in ${result.duration}ms`);
          this.emit('message', { jid, pushname, userMessage: text, reply: result.content, model: result.model });
        } catch (err) {
          logger.error('WhatsApp', `Failed to reply: ${err.message}`);
          await this.sock.sendMessage(jid, {
            text: '❌ Maaf, terjadi kesalahan saat memproses pesan.'
          }).catch(() => {});
        }
      }
    });
  }

  _extractText(msg) {
    return msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.imageMessage?.caption
      || msg.message?.videoMessage?.caption
      || '';
  }

  async sendMessage(jid, text) {
    if (this.status !== 'connected') {
      throw new Error('WhatsApp belum terkoneksi');
    }
    return this.sock.sendMessage(jid, { text });
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout();
      }
      // Hapus session files
      const sessionDir = path.join(SESSION_PATH, process.env.SESSION_NAME || 'wa-session');
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
      this.status = 'disconnected';
      this.user = null;
      this.qrCode = null;
      logger.info('WhatsApp', 'Logged out & session cleared');
      return true;
    } catch (err) {
      logger.error('WhatsApp', `Logout failed: ${err.message}`);
      throw err;
    }
  }

  getStatus() {
    return {
      status: this.status,
      qr: this.qrCode,
      user: this.user ? {
        id: this.user.id,
        name: this.user.name
      } : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export const whatsapp = new WhatsAppService();
