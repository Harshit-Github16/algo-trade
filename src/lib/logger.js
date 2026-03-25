import { connectDB } from './db.js';
import { Log } from './models.js';

export const logger = {
  info: async (message, metadata = {}) => {
    console.log(`[INFO] ${message}`, metadata);
    logToDb('INFO', message, metadata);
  },
  error: async (message, metadata = {}) => {
    console.error(`[ERROR] ${message}`, metadata);
    logToDb('ERROR', message, metadata);
  },
  warn: async (message, metadata = {}) => {
    console.warn(`[WARN] ${message}`, metadata);
    logToDb('WARN', message, metadata);
  }
};

async function logToDb(level, message, metadata) {
  try {
    await connectDB();
    await Log.create({ level, message, metadata });
  } catch (err) {
    console.error('Failed to log to database:', err);
  }
}
