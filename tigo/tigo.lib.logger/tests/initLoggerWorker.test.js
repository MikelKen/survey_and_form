import { afterEach, describe, expect, it, vi } from 'vitest';

describe('initLoggerWorker', () => {
  let childLogger;
  let baseLogger;
  let randomUUID;
  let consoleLogger;

  const loadModule = async () => {
    vi.resetModules();

    childLogger = {
      info: vi.fn(),
    };
    baseLogger = {
      child: vi.fn(() => childLogger),
    };
    randomUUID = vi.fn(() => 'worker-generated-trace');
    consoleLogger = {
      startTimer: vi.fn(),
      endTimer: vi.fn(),
      info: vi.fn(),
    };

    vi.doMock('../src/logger.js', () => ({ default: baseLogger }));
    vi.doMock('crypto', () => ({ randomUUID }));
    vi.doMock('../src/console.js', () => ({ logger: consoleLogger }));

    return import('../src/initLoggerWorker.js');
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../src/logger.js');
    vi.doUnmock('crypto');
    vi.doUnmock('../src/console.js');
  });

  it('creates a worker child logger with the provided trace id', async () => {
    const { initLoggerWorker } = await loadModule();

    const result = initLoggerWorker('trace-123');

    expect(result).toBe(childLogger);
    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'trace-123' });
    expect(randomUUID).not.toHaveBeenCalled();
    expect(childLogger.info).toHaveBeenCalledWith(
      { traceId: 'trace-123' },
      'Trace logger initialized',
    );
  });

  it('generates a trace id when none is provided', async () => {
    const { initLoggerWorker } = await loadModule();

    initLoggerWorker();

    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'worker-generated-trace' });
  });

  it('copies timer helpers from the console logger when available', async () => {
    const { initLoggerWorker } = await loadModule();

    initLoggerWorker('trace-with-timers');

    expect(childLogger.startTimer).toBe(consoleLogger.startTimer);
    expect(childLogger.endTimer).toBe(consoleLogger.endTimer);
    expect(childLogger.formatDuration).toBeUndefined();
  });
});
