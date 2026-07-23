import { randomUUID } from 'crypto';
import logger from './logger.js';
import { bindLoggerToSocket } from './tcp-context.js';
import { runWithLogger } from './logger-context.js';

export function tcpLoggerMiddleware(socket, traceId) {
  const finalTraceId = traceId || randomUUID();
  const childLogger = logger.child({ traceId: finalTraceId });

  bindLoggerToSocket(socket, childLogger);

  const originalOn = socket.on.bind(socket);
  socket.on = (event, handler) => {
    const wrappedHandler = (...args) => {
      return runWithLogger(childLogger, () => handler(...args));
    };
    return originalOn(event, wrappedHandler);
  };

  childLogger.info({ traceId: finalTraceId }, 'TCP connection logger initialized');

  return childLogger;
}