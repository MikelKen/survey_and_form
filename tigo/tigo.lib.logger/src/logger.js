import pino from 'pino';
const logger = pino({
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    }
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

export default logger;