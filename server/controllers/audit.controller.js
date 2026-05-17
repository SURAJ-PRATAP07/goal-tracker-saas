const { query } = require('../config/database');
const { sendSuccess, sendPaginated, parsePagination } = require('../utils/response');

/**
 * GET /api/v1/audit-logs  [admin]
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, entityType, entityId, from, to } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (userId) { conditions.push(`al.user_id = $${idx++}`); params.push(userId); }
    if (action) { conditions.push(`al.action = $${idx++}`); params.push(action.toUpperCase()); }
    if (entityType) { conditions.push(`al.entity_type = $${idx++}`); params.push(entityType); }
    if (entityId) { conditions.push(`al.entity_id = $${idx++}`); params.push(entityId); }
    if (from) { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }

    const where = conditions.join(' AND ');

    const countRes = await query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params);
    const rows = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, 
              al.old_values, al.new_values, al.ip_address, al.created_at,
              u.first_name || ' ' || u.last_name AS user_name,
              u.email AS user_email,
              u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return sendPaginated(res, rows.rows, { page, limit, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/audit-logs/entity/:type/:id  [admin]
 */
const getEntityAuditTrail = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const result = await query(
      `SELECT al.*,
              u.first_name || ' ' || u.last_name AS user_name,
              u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = $1 AND al.entity_id = $2
       ORDER BY al.created_at DESC`,
      [type, id]
    );
    return sendSuccess(res, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAuditLogs, getEntityAuditTrail };
