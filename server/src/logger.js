const pino = require('pino');

function createLogger(env) {
  return pino({
    level: env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug'),
    redact: {
      paths: ['req.headers.authorization'],
      remove: true,
    },
  });
}

module.exports = { createLogger };
