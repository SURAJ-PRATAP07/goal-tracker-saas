const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Factory: creates middleware that logs an action after the response is sent
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Capture original json method
    const originalJson = res.json.bind(res);

    res.json = async function (body) {
      // Only log successful mutations
      if (res.statusCode < 400 && req.user) {
        try {
          const entityId = body?.data?.id || req.params?.id || req.params?.goalId || null;
          await query(
            `INSERT INTO audit_logs 
              (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              req.user.id,
              action,
              entityType,
              entityId,
              body?.data ? JSON.stringify(body.data) : null,
              req.clientIp,
              req.headers['user-agent']?.substring(0, 255),
              JSON.stringify({ method: req.method, path: req.originalUrl }),
            ]
          );
        } catch (auditErr) {
          logger.warn('Audit log write failed:', auditErr.message);
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Manual audit log writer (for complex operations in controllers)
 */
const writeAuditLog = async ({ userId, action, entityType, entityId, oldValues, newValues, req }) => {
  try {
    await query(
      `INSERT INTO audit_logs 
        (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        entityType,
        entityId || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req?.ip || req?.socket?.remoteAddress,
        req?.headers?.['user-agent']?.substring(0, 255),
      ]
    );
  } catch (err) {
    logger.warn('Manual audit log write failed:', err.message);
  }
};

module.exports = { auditLog, writeAuditLog };
