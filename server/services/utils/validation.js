const { validationResult } = require('express-validator');
const { sendError } = require('./response');

/**
 * Middleware to check express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 'Validation failed', 422, formatted);
  }
  next();
};

/**
 * Validate UUID format
 */
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Sanitize sort fields to prevent SQL injection
 */
const sanitizeSortField = (field, allowedFields, defaultField = 'created_at') => {
  return allowedFields.includes(field) ? field : defaultField;
};

const sanitizeSortOrder = (order) => {
  return order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
};

module.exports = { validate, isValidUUID, sanitizeSortField, sanitizeSortOrder };
