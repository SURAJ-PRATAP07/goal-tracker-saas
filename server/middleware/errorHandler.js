const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = formatUniqueViolation(err.detail);
        break;
      case '23503': // foreign_key_violation
        statusCode = 400;
        message = 'Referenced resource does not exist';
        break;
      case '23514': // check_violation
        statusCode = 400;
        message = `Constraint violation: ${err.constraint || 'invalid value'}`;
        break;
      case '22P02': // invalid_text_representation
        statusCode = 400;
        message = 'Invalid ID format';
        break;
      default:
        if (process.env.NODE_ENV !== 'production') message = err.message;
    }
  }

  // JWT errors caught before reaching here, but as fallback:
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}`, {
      error: err.message,
      stack: err.stack,
      body: req.body,
      user: req.user?.id,
    });
  }

  const response = { success: false, message };
  if (err.errors) response.errors = err.errors;
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const formatUniqueViolation = (detail = '') => {
  const match = detail.match(/Key \((.+?)\)=\((.+?)\)/);
  if (match) return `${match[1].replace(/_/g, ' ')} '${match[2]}' already exists`;
  return 'A resource with these details already exists';
};

module.exports = { errorHandler, notFoundHandler };
