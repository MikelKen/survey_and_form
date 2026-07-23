import { afterEach, describe, expect, it, vi } from 'vitest';

describe('httpLoggerMiddleware', () => {
  let childLogger;
  let baseLogger;
  let runWithLogger;
  let randomUUID;

  const loadModule = async () => {
    vi.resetModules();

    childLogger = {
      debug: vi.fn(),
    };
    baseLogger = {
      child: vi.fn(() => childLogger),
    };
    runWithLogger = vi.fn((logger, callback) => callback());
    randomUUID = vi.fn(() => 'generated-trace-id');

    vi.doMock('../src/logger.js', () => ({ default: baseLogger }));
    vi.doMock('../src/logger-context.js', () => ({ runWithLogger }));
    vi.doMock('crypto', () => ({ randomUUID }));

    return import('../src/httpLogger.js');
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../src/logger.js');
    vi.doUnmock('../src/logger-context.js');
    vi.doUnmock('crypto');
  });

  it('uses the x-traceid header to create and attach a child logger', async () => {
    const { httpLoggerMiddleware } = await loadModule();
    const req = {
      method: 'POST',
      originalUrl: '/orders',
      headers: { 'x-traceid': 'trace-from-header', authorization: 'token' },
      body: { id: 10 },
    };
    const res = {};
    const next = vi.fn();

    httpLoggerMiddleware()(req, res, next);

    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'trace-from-header' });
    expect(req.logger).toBe(childLogger);
    expect(runWithLogger).toHaveBeenCalledWith(childLogger, expect.any(Function));
    expect(childLogger.debug).toHaveBeenCalledWith(
      {
        method: 'POST',
        url: '/orders',
        headers: req.headers,
        body: req.body,
      },
      'Incoming HTTP request',
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('generates a trace id when the request does not include one', async () => {
    const { httpLoggerMiddleware } = await loadModule();
    const req = {
      method: 'GET',
      originalUrl: '/health',
      headers: {},
      body: undefined,
    };

    httpLoggerMiddleware()(req, {}, vi.fn());

    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'generated-trace-id' });
  });
});
