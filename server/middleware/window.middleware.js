const { query } = require('../config/database');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Middleware to enforce that goals/check-ins can only be created or edited 
 * during the configured goal_cycle windows.
 * Admins are exempt from this restriction.
 */
const enforceWindowRestriction = async (req, res, next) => {
  // Admins can bypass window restrictions
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  try {
    // Determine the cycle to check against
    // Usually it's in req.body.cycleId, or we fallback to the active cycle.
    let cycleId = req.body?.cycleId || req.query?.cycleId;

    if (!cycleId && req.params?.id) {
      // If updating an existing goal, we need its cycle_id
      const goalRes = await query('SELECT cycle_id FROM goals WHERE id = $1', [req.params.id]);
      if (goalRes.rows.length > 0) cycleId = goalRes.rows[0].cycle_id;
    } else if (!cycleId && req.body?.goalId) {
      // If adding a checkin to a goal
      const goalRes = await query('SELECT cycle_id FROM goals WHERE id = $1', [req.body.goalId]);
      if (goalRes.rows.length > 0) cycleId = goalRes.rows[0].cycle_id;
    }

    let cycle;
    if (cycleId) {
      const cycleRes = await query('SELECT * FROM goal_cycles WHERE id = $1', [cycleId]);
      cycle = cycleRes.rows[0];
    } else {
      const cycleRes = await query('SELECT * FROM goal_cycles WHERE is_active = true LIMIT 1');
      cycle = cycleRes.rows[0];
    }

    if (!cycle) {
      return sendError(res, 'No goal cycle found to validate window restrictions.', 400);
    }

    const now = new Date();
    const startDate = new Date(cycle.start_date);
    const endDate = new Date(cycle.end_date);
    
    // Set hours to encompass the entire day for endDate
    endDate.setHours(23, 59, 59, 999);
    startDate.setHours(0, 0, 0, 0);

    if (now < startDate || now > endDate) {
      return sendError(
        res,
        `Action blocked: Out of window. The allowed window for ${cycle.name} is from ${startDate.toDateString()} to ${endDate.toDateString()}.`,
        403
      );
    }

    next();
  } catch (error) {
    logger.error('Error enforcing window restriction:', error.message);
    return sendError(res, 'Failed to validate submission window.', 500);
  }
};

module.exports = { enforceWindowRestriction };
