import { afterEach, describe, expect, it, vi } from 'vitest';

describe('base logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock('pino');
  });

  it('creates a pino logger with uppercase levels and ISO timestamps', async () => {
    vi.resetModules();
    const pinoLogger = { info: vi.fn() };
    const pino = vi.fn(() => pinoLogger);

    vi.doMock('pino', () => ({ default: pino }));

    const { default: logger } = await import('../src/logger.js');

    expect(logger).toBe(pinoLogger);
    expect(pino).toHaveBeenCalledTimes(1);

    const [options] = pino.mock.calls[0];
    expect(options.formatters.level('info')).toEqual({ level: 'INFO' });
    expect(options.formatters.level('warn')).toEqual({ level: 'WARN' });
    expect(options.timestamp()).toMatch(/^,"time":"\d{4}-\d{2}-\d{2}T.*Z"$/);
  });
});
