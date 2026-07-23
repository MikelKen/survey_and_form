import logger from './logger.js'
import { randomUUID } from 'crypto'
import { logger as consoleLogger } from './console.js'

export function initLoggerWorker(traceId) {
  const finalTraceId = traceId || randomUUID()
  const childLogger = logger.child({ traceId: finalTraceId })

  for (const key of ['startTimer', 'endTimer', 'formatDuration']) {
    if (typeof consoleLogger[key] === 'function') {
      childLogger[key] = consoleLogger[key]
    }
  }

  childLogger.info({ traceId: finalTraceId }, 'Trace logger initialized')
  return childLogger
}