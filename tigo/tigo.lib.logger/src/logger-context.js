import { AsyncLocalStorage } from 'node:async_hooks';

const asyncLocalStorage = new AsyncLocalStorage();

export function runWithLogger(logger, callback) {
  asyncLocalStorage.run(new Map([['logger', logger]]), callback);
}

export function getLogger() {
  const store = asyncLocalStorage.getStore();
  return store?.get('logger');
}