import pino from 'pino';
import { EventEmitter } from 'events';

/**
 * Custom logger yang juga emit events ke Socket.IO untuk console log realtime di dashboard
 */
class DashboardLogger extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);

    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      } : undefined
    });

    this.logs = [];
    this.maxLogs = 500;
  }

  _log(level, source, message, meta = {}) {
    const entry = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      meta
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    this.pino[level](meta, `[${source}] ${message}`);
    this.emit('log', entry);
  }

  info(source, message, meta) { this._log('info', source, message, meta); }
  warn(source, message, meta) { this._log('warn', source, message, meta); }
  error(source, message, meta) { this._log('error', source, message, meta); }
  debug(source, message, meta) { this._log('debug', source, message, meta); }

  getRecent(limit = 100) {
    return this.logs.slice(-limit);
  }

  clear() {
    this.logs = [];
  }
}

export const logger = new DashboardLogger();
