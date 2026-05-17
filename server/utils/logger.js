const logger = {
  info:  (...args) => console.log('[INFO] ', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn:  (...args) => console.warn('[WARN] ', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  http:  (...args) => console.log('[HTTP] ', ...args),  // used by morgan middleware
};

module.exports = logger;