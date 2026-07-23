import { describe, expect, it, vi } from 'vitest';
import { getLogger, runWithLogger } from '../src/logger-context.js';

describe('logger-context', () => {
  it('returns undefined when no logger has been bound', () => {
    expect(getLogger()).toBeUndefined();
  });

  it('exposes the logger inside the provided callback', () => {
    const logger = { info: vi.fn() };
    const callback = vi.fn(() => {
      expect(getLogger()).toBe(logger);
    });

    runWithLogger(logger, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(getLogger()).toBeUndefined();
  });

  it('preserves the logger through asynchronous work', async () => {
    const logger = { info: vi.fn() };
    let resolvedLogger;

    runWithLogger(logger, () => {
      setTimeout(() => {
        resolvedLogger = getLogger();
      }, 0);
    });

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(resolvedLogger).toBe(logger);
    expect(getLogger()).toBeUndefined();
  });
});
