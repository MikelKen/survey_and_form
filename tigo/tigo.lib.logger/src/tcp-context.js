const socketLoggers = new WeakMap();

export function bindLoggerToSocket(socket, logger) {
  socketLoggers.set(socket, logger);
}

export function getLoggerFromSocket(socket) {
  return socketLoggers.get(socket);
}