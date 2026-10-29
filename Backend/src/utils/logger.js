/**
 * Application Logger
 * Simple, structured logging utility with log levels and timestamps.
 */
const levels = {
  INFO: '\x1b[36mINFO\x1b[0m',
  SUCCESS: '\x1b[32mSUCCESS\x1b[0m',
  WARN: '\x1b[33mWARN\x1b[0m',
  ERROR: '\x1b[31mERROR\x1b[0m',
};

const formatMessage = (level, message, ...meta) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message} ${
    meta.length ? JSON.stringify(meta, null, 2) : ''
  }`;
};

export const logger = {
  info: (msg, ...meta) => console.log(formatMessage(levels.INFO, msg, ...meta)),
  success: (msg, ...meta) => console.log(formatMessage(levels.SUCCESS, msg, ...meta)),
  warn: (msg, ...meta) => console.warn(formatMessage(levels.WARN, msg, ...meta)),
  error: (msg, ...meta) => console.error(formatMessage(levels.ERROR, msg, ...meta)),
};
