import { describe, expect, it } from 'vitest';
import { bindLoggerToSocket, getLoggerFromSocket } from '../src/tcp-context.js';

describe('tcp-context', () => {
  it('binds and retrieves a logger for a socket', () => {
    const socket = {};
    const logger = { info() {} };

    bindLoggerToSocket(socket, logger);

    expect(getLoggerFromSocket(socket)).toBe(logger);
  });

  it('keeps logger bindings isolated by socket', () => {
    const firstSocket = {};
    const secondSocket = {};
    const firstLogger = { name: 'first' };
    const secondLogger = { name: 'second' };

    bindLoggerToSocket(firstSocket, firstLogger);
    bindLoggerToSocket(secondSocket, secondLogger);

    expect(getLoggerFromSocket(firstSocket)).toBe(firstLogger);
    expect(getLoggerFromSocket(secondSocket)).toBe(secondLogger);
  });

  it('returns undefined for an unbound socket', () => {
    expect(getLoggerFromSocket({})).toBeUndefined();
  });
});
