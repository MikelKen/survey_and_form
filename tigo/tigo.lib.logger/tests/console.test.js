import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('console logger facade', () => {
  let contextLogger;
  let baseLogger;
  let getLogger;

  const loadModule = async () => {
    vi.resetModules();

    getLogger = vi.fn(() => contextLogger);
    baseLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    };

    vi.doMock('../src/logger-context.js', () => ({ getLogger }));
    vi.doMock('../src/logger.js', () => ({ default: baseLogger }));

    return import('../src/console.js');
  };

  beforeEach(() => {
    contextLogger = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../src/logger-context.js');
    vi.doUnmock('../src/logger.js');
  });

  it('formats durations below one second in milliseconds', async () => {
    const { formatDuration } = await loadModule();

    expect(formatDuration(25.12345)).toBe('25.123ms');
    expect(formatDuration(999.9999)).toBe('1000.000ms');
  });

  it('formats durations of one second or more in seconds', async () => {
    const { formatDuration } = await loadModule();

    expect(formatDuration(1000)).toBe('1.000s');
    expect(formatDuration(2500.5)).toBe('2.501s');
  });

  it('delegates log methods to the logger stored in async context', async () => {
    contextLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
    };
    const { logger } = await loadModule();

    logger.info('hello', { one: 1 });
    logger.error('boom');
    logger.warn('careful');
    logger.debug('details');
    logger.trace('trace');

    expect(contextLogger.info).toHaveBeenCalledWith('hello', { one: 1 });
    expect(contextLogger.error).toHaveBeenCalledWith('boom');
    expect(contextLogger.warn).toHaveBeenCalledWith('careful');
    expect(contextLogger.debug).toHaveBeenCalledWith('details');
    expect(contextLogger.trace).toHaveBeenCalledWith('trace');
    expect(baseLogger.info).not.toHaveBeenCalled();
  });

  it('falls back to the base logger when no context logger exists', async () => {
    const { logger } = await loadModule();

    logger.info('fallback');

    expect(baseLogger.info).toHaveBeenCalledWith('fallback');
  });

  it('logs and clears an execution timer', async () => {
    const { logger } = await loadModule();
    vi.spyOn(process.hrtime, 'bigint')
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_125_500_000n);

    logger.startTimer('database');
    logger.endTimer('database');
    logger.endTimer('database');

    expect(baseLogger.info).toHaveBeenCalledTimes(1);
    expect(baseLogger.info).toHaveBeenCalledWith(
      { label: 'database', duration: '125.500ms' },
      'Execution time',
    );
  });

  it('does nothing when ending an unknown timer', async () => {
    const { logger } = await loadModule();

    logger.endTimer('missing');

    expect(baseLogger.info).not.toHaveBeenCalled();
  });
});
