import logger from './logger.js';
import { randomUUID } from 'crypto';
import { runWithLogger } from './logger-context.js';

export function httpLoggerMiddleware() {
  return (req, res, next) => {
    const traceId = req.headers['x-traceid'] || randomUUID();
    const childLogger = logger.child({ traceId });

    req.logger = childLogger;

    runWithLogger(childLogger, () => {
      childLogger.debug({
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
      }, 'Incoming HTTP request');
      next();
    });
  };
}
