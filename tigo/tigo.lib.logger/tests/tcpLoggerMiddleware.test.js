import { afterEach, describe, expect, it, vi } from 'vitest';

describe('tcpLoggerMiddleware', () => {
  let childLogger;
  let baseLogger;
  let bindLoggerToSocket;
  let runWithLogger;
  let randomUUID;

  const loadModule = async () => {
    vi.resetModules();

    childLogger = {
      info: vi.fn(),
    };
    baseLogger = {
      child: vi.fn(() => childLogger),
    };
    bindLoggerToSocket = vi.fn();
    runWithLogger = vi.fn((logger, callback) => callback());
    randomUUID = vi.fn(() => 'tcp-generated-trace');

    vi.doMock('../src/logger.js', () => ({ default: baseLogger }));
    vi.doMock('../src/tcp-context.js', () => ({ bindLoggerToSocket }));
    vi.doMock('../src/logger-context.js', () => ({ runWithLogger }));
    vi.doMock('crypto', () => ({ randomUUID }));

    return import('../src/tcpLoggerMiddleware.js');
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('../src/logger.js');
    vi.doUnmock('../src/tcp-context.js');
    vi.doUnmock('../src/logger-context.js');
    vi.doUnmock('crypto');
  });

  it('binds a child logger to the socket using the provided trace id', async () => {
    const { tcpLoggerMiddleware } = await loadModule();
    const socket = { on: vi.fn() };

    const result = tcpLoggerMiddleware(socket, 'tcp-trace-1');

    expect(result).toBe(childLogger);
    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'tcp-trace-1' });
    expect(bindLoggerToSocket).toHaveBeenCalledWith(socket, childLogger);
    expect(childLogger.info).toHaveBeenCalledWith(
      { traceId: 'tcp-trace-1' },
      'TCP connection logger initialized',
    );
    expect(randomUUID).not.toHaveBeenCalled();
  });

  it('generates a trace id when none is provided', async () => {
    const { tcpLoggerMiddleware } = await loadModule();
    const socket = { on: vi.fn() };

    tcpLoggerMiddleware(socket);

    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(baseLogger.child).toHaveBeenCalledWith({ traceId: 'tcp-generated-trace' });
  });

  it('wraps future socket handlers with the logger context', async () => {
    const { tcpLoggerMiddleware } = await loadModule();
    let registeredHandler;
    const originalOn = vi.fn((event, handler) => {
      registeredHandler = handler;
      return 'socket-on-result';
    });
    const socket = { on: originalOn };
    const handler = vi.fn();

    tcpLoggerMiddleware(socket, 'wrapped-trace');
    const onResult = socket.on('data', handler);
    registeredHandler('payload', 123);

    expect(onResult).toBe('socket-on-result');
    expect(originalOn).toHaveBeenCalledWith('data', expect.any(Function));
    expect(runWithLogger).toHaveBeenCalledWith(childLogger, expect.any(Function));
    expect(handler).toHaveBeenCalledWith('payload', 123);
  });
});
