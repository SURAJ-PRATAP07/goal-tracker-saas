const CheckInModel = require('../models/checkIn.model');
const GoalModel = require('../models/goal.model');
const { sendSuccess, sendCreated, sendError, sendPaginated, parsePagination } = require('../utils/response');
const { writeAuditLog } = require('../middleware/audit.middleware');

/**
 * POST /api/v1/check-ins
 */
const createCheckIn = async (req, res, next) => {
  try {
    const { goalId, progressValue, progressPercent, status, employeeNotes } = req.body;

    const goal = await GoalModel.findById(goalId);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (goal.employee_id !== req.user.id) {
      return sendError(res, 'You can only check in on your own goals', 403);
    }
    if (!['approved', 'in_progress'].includes(goal.status)) {
      return sendError(res, 'Check-ins only allowed on approved or in-progress goals', 400);
    }

    const checkIn = await CheckInModel.create({
      goalId,
      employeeId: req.user.id,
      cycleId: goal.cycle_id,
      progressValue,
      progressPercent,
      status,
      employeeNotes,
    });

    // Auto-update goal to in_progress
    if (goal.status === 'approved') {
      await GoalModel.updateStatus(goalId, 'in_progress');
    }

    await writeAuditLog({ userId: req.user.id, action: 'CREATE', entityType: 'check_in', entityId: checkIn.id, req });
    return sendCreated(res, checkIn, 'Check-in recorded');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/check-ins
 */
const getCheckIns = async (req, res, next) => {
  try {
    const { goalId, employeeId, cycleId } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let filter = { goalId, cycleId, limit, offset };

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (req.user.role === 'manager') {
      filter.managerId = req.user.id;
      if (employeeId) filter.employeeId = employeeId;
    } else {
      if (employeeId) filter.employeeId = employeeId;
    }

    const { rows, total } = await CheckInModel.findAll(filter);
    return sendPaginated(res, rows, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/check-ins/:id
 */
const getCheckInById = async (req, res, next) => {
  try {
    const checkIn = await CheckInModel.findById(req.params.id);
    if (!checkIn) return sendError(res, 'Check-in not found', 404);

    if (req.user.role === 'employee' && checkIn.employee_id !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, checkIn);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/check-ins/:id/feedback  [manager, admin]
 * Manager adds feedback/notes to a check-in
 */
const addManagerFeedback = async (req, res, next) => {
  try {
    const { managerNotes } = req.body;
    if (!managerNotes) return sendError(res, 'Manager notes are required', 400);

    const checkIn = await CheckInModel.findById(req.params.id);
    if (!checkIn) return sendError(res, 'Check-in not found', 404);

    const updated = await CheckInModel.addManagerFeedback(req.params.id, {
      managerNotes,
      managerId: req.user.id,
    });

    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'check_in', entityId: checkIn.id, req });
    return sendSuccess(res, updated, 'Feedback added');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/check-ins/goals/:goalId/progress
 */
const getGoalProgress = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.goalId);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (req.user.role === 'employee' && goal.employee_id !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    const progress = await CheckInModel.getGoalProgress(req.params.goalId);
    return sendSuccess(res, { goal, progress });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCheckIn, getCheckIns, getCheckInById, addManagerFeedback, getGoalProgress };
