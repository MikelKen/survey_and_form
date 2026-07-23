import { getLogger } from './logger-context.js';
import baseLogger from './logger.js';

const timers = new Map();

export const formatDuration = (ms) => {
  if (ms < 1000) {
    return `${ms.toFixed(3)}ms`;
  } else {
    return `${(ms / 1000).toFixed(3)}s`;
  }
};

// Helper que retorna el logger del contexto O el logger base como fallback
const getLoggerWithFallback = () => getLogger() || baseLogger;

export const logger = {
  info: (...args) => getLoggerWithFallback().info(...args),
  error: (...args) => getLoggerWithFallback().error(...args),
  warn: (...args) => getLoggerWithFallback().warn(...args),
  debug: (...args) => getLoggerWithFallback().debug(...args),
  trace: (...args) => getLoggerWithFallback().trace(...args),

  startTimer: (label) => {
    timers.set(label, process.hrtime.bigint());
  },

  endTimer: (label) => {
    const log = getLoggerWithFallback();
    const start = timers.get(label);
    if (!start) return;

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    log.info({ label, duration: formatDuration(durationMs) }, 'Execution time');
    timers.delete(label);
  }
};