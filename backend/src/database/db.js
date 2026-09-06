import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../services/logger.js';

// Railway Volume mount path atau local default
const dbDir = process.env.DATA_PATH || '.';
const dbPath = path.join(dbDir, process.env.DATABASE_FILE || 'database.sqlite');

// Ensure directory exists (penting untuk Railway Volume)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER DEFAULT 0,
    response_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS wa_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    pushname TEXT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_wa_jid ON wa_messages(jid, created_at);
`);

export const MessageRepo = {
  add(userId, role, content, model = null, tokens = 0, responseMs = 0) {
    const stmt = db.prepare(`
      INSERT INTO messages (user_id, role, content, model, tokens_used, response_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(userId, role, content, model, tokens, responseMs);

    db.prepare(`
      INSERT INTO sessions (user_id, last_message_at, message_count)
      VALUES (?, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        last_message_at = CURRENT_TIMESTAMP,
        message_count = message_count + 1
    `).run(userId);

    return info.lastInsertRowid;
  },

  getHistory(userId, limit = 20) {
    return db.prepare(`
      SELECT role, content, model, created_at FROM messages
      WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit).reverse();
  },

  getAllSessions() {
    return db.prepare(`
      SELECT user_id, last_message_at, message_count FROM sessions
      ORDER BY last_message_at DESC LIMIT 100
    `).all();
  },

  getStats() {
    const total = db.prepare(`SELECT COUNT(*) as c FROM messages`).get().c;
    const users = db.prepare(`SELECT COUNT(DISTINCT user_id) as c FROM messages`).get().c;
    const today = db.prepare(`
      SELECT COUNT(*) as c FROM messages
      WHERE date(created_at) = date('now')
    `).get().c;
    const totalTokens = db.prepare(`SELECT COALESCE(SUM(tokens_used), 0) as c FROM messages`).get().c;

    return { totalMessages: total, uniqueUsers: users, todayMessages: today, totalTokens };
  }
};

export const WaMessageRepo = {
  add(jid, pushname, role, content, model = null) {
    return db.prepare(`
      INSERT INTO wa_messages (jid, pushname, role, content, model)
      VALUES (?, ?, ?, ?, ?)
    `).run(jid, pushname, role, content, model).lastInsertRowid;
  },

  getHistory(jid, limit = 20) {
    return db.prepare(`
      SELECT role, content, created_at FROM wa_messages
      WHERE jid = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(jid, limit).reverse();
  }
};

logger.info('Database', `SQLite ready at ${dbPath}`);

export default db;
