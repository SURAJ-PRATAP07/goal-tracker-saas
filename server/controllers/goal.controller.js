const GoalModel = require('../models/goal.model');
const ReportModel = require('../models/report.model');
const { sendSuccess, sendCreated, sendError, sendPaginated, parsePagination } = require('../utils/response');
const { sanitizeSortField, sanitizeSortOrder } = require('../utils/validation');
const { writeAuditLog } = require('../middleware/audit.middleware');

const MAX_GOALS = 8;
const MIN_WEIGHTAGE = 10;
const MAX_TOTAL_WEIGHTAGE = 100;
const ALLOWED_SORT = ['created_at', 'title', 'weightage', 'due_date', 'status', 'submitted_at'];

/**
 * POST /api/v1/goals
 * Create a new goal (employee)
 */
const createGoal = async (req, res, next) => {
  try {
    const { cycleId, title, description, category, weightage, targetValue, unitOfMeasure, dueDate } = req.body;
    const employeeId = req.user.id;

    // Validate active cycle
    const cycle = await ReportModel.getActiveCycle();
    if (!cycle) return sendError(res, 'No active goal cycle found. Contact your administrator.', 400);
    const useCycleId = cycleId || cycle.id;

    // Rule: max 8 goals per cycle
    const count = await GoalModel.getGoalCount(employeeId, useCycleId);
    if (count >= MAX_GOALS) {
      return sendError(res, `You have reached the maximum of ${MAX_GOALS} goals per cycle.`, 400);
    }

    // Rule: individual weightage ≥ 10%
    if (parseFloat(weightage) < MIN_WEIGHTAGE) {
      return sendError(res, `Minimum weightage per goal is ${MIN_WEIGHTAGE}%.`, 400);
    }

    // Rule: total weightage ≤ 100%
    const currentWeightage = await GoalModel.getTotalWeightage(employeeId, useCycleId);
    if (currentWeightage + parseFloat(weightage) > MAX_TOTAL_WEIGHTAGE) {
      return sendError(res,
        `Adding this goal would exceed 100% total weightage. Current: ${currentWeightage}%, Available: ${MAX_TOTAL_WEIGHTAGE - currentWeightage}%`,
        400
      );
    }

    // Rule: no duplicate titles within the same cycle
    const duplicate = await GoalModel.findDuplicateTitle(employeeId, useCycleId, title);
    if (duplicate) {
      return sendError(res, `A goal titled "${title}" already exists in this cycle.`, 409);
    }

    const goal = await GoalModel.create({ employeeId, cycleId: useCycleId, title, description, category, weightage, targetValue, unitOfMeasure, dueDate });

    await writeAuditLog({ userId: req.user.id, action: 'CREATE', entityType: 'goal', entityId: goal.id, newValues: goal, req });
    return sendCreated(res, goal, 'Goal created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/goals/shared
 * Manager/Admin creates a shared goal assigned to multiple employees
 */
const createSharedGoal = async (req, res, next) => {
  try {
    const { cycleId, title, description, category, weightage = 10, targetValue, unitOfMeasure, dueDate, employeeIds } = req.body;
    const creatorId = req.user.id;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return sendError(res, 'At least one employee must be selected', 400);
    }

    const cycle = await ReportModel.getActiveCycle();
    if (!cycle) return sendError(res, 'No active goal cycle found', 400);
    const useCycleId = cycleId || cycle.id;

    // Create the parent template goal assigned to the creator
    const parentGoal = await GoalModel.create({
      employeeId: creatorId,
      cycleId: useCycleId,
      title, description, category, weightage, targetValue, unitOfMeasure, dueDate,
      isShared: true
    });

    // Create child goals for each employee
    const createdChildren = [];
    for (const empId of employeeIds) {
      // Basic checks (skip if max goals reached, etc., or just create them and let them adjust weightage)
      // For simplicity in shared goals, we directly provision the goal in draft state
      const child = await GoalModel.create({
        employeeId: empId,
        cycleId: useCycleId,
        title, description, category, weightage, targetValue, unitOfMeasure, dueDate,
        isShared: true,
        parentGoalId: parentGoal.id
      });
      createdChildren.push(child);
    }

    await writeAuditLog({ userId: req.user.id, action: 'CREATE', entityType: 'goal', entityId: parentGoal.id, newValues: { parent: parentGoal, childCount: createdChildren.length }, req });
    return sendCreated(res, { parent: parentGoal, children: createdChildren }, 'Shared goal assigned successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/goals
 */
const getGoals = async (req, res, next) => {
  try {
    const { cycleId, status, category, employeeId, sort = 'created_at', order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const sortField = sanitizeSortField(sort, ALLOWED_SORT);
    const sortOrder = sanitizeSortOrder(order);

    let filter = { cycleId, status, category, limit, offset, sortField, sortOrder };

    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (req.user.role === 'manager') {
      filter.managerId = req.user.id;
      if (employeeId) filter.employeeId = employeeId;
    } else {
      // admin sees all
      if (employeeId) filter.employeeId = employeeId;
    }

    const { rows, total } = await GoalModel.findAll(filter);
    return sendPaginated(res, rows, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/goals/:id
 */
const getGoalById = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    // Access control
    if (req.user.role === 'employee' && goal.employee_id !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    const keyResults = await GoalModel.getKeyResults(req.params.id);
    return sendSuccess(res, { ...goal, keyResults });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/goals/:id
 * Only editable when in draft/rejected status
 */
const LOCKED_STATUSES = ['submitted', 'approved', 'in_progress', 'completed'];

const updateGoal = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (req.user.role === 'employee') {
      if (goal.employee_id !== req.user.id) return sendError(res, 'Access denied', 403);
      if (LOCKED_STATUSES.includes(goal.status)) {
        return sendError(res,
          `This goal is locked (status: ${goal.status}) and cannot be edited. Only draft or rejected goals can be modified.`,
          400
        );
      }
    }

    // Re-validate weightage if changing it
    if (req.body.weightage !== undefined) {
      const newWeight = parseFloat(req.body.weightage);
      if (isNaN(newWeight) || newWeight < MIN_WEIGHTAGE) {
        return sendError(res, `Minimum weightage per goal is ${MIN_WEIGHTAGE}%.`, 400);
      }
      const currentTotal = await GoalModel.getTotalWeightage(goal.employee_id, goal.cycle_id, goal.id);
      if (currentTotal + newWeight > MAX_TOTAL_WEIGHTAGE) {
        return sendError(res, `Total weightage would exceed 100%. Available: ${MAX_TOTAL_WEIGHTAGE - currentTotal}%`, 400);
      }
    }

    // Re-validate title uniqueness if changing title
    if (req.body.title && req.body.title !== goal.title) {
      const duplicate = await GoalModel.findDuplicateTitle(goal.employee_id, goal.cycle_id, req.body.title, goal.id);
      if (duplicate) {
        return sendError(res, `A goal titled "${req.body.title}" already exists in this cycle.`, 409);
      }
    }

    // Shared goal restrictions
    let updateData = { ...req.body };
    if (goal.is_shared) {
      if (req.user.role === 'employee' && goal.parent_goal_id) {
        // Employees can only update weightage and dueDate on shared child goals
        const restrictedFields = ['title', 'description', 'category', 'targetValue', 'unitOfMeasure'];
        for (const field of restrictedFields) {
          if (updateData[field] !== undefined) {
            delete updateData[field];
          }
        }
      }
    }

    const updated = await GoalModel.update(req.params.id, updateData);

    // If manager/admin edits a shared parent goal, cascade updates to children
    if (goal.is_shared && !goal.parent_goal_id && req.user.role !== 'employee') {
      const cascadeUpdates = {};
      const cascadeFields = ['title', 'description', 'category', 'targetValue', 'unitOfMeasure', 'dueDate'];
      for (const field of cascadeFields) {
        if (updateData[field] !== undefined) cascadeUpdates[field] = updateData[field];
      }
      if (Object.keys(cascadeUpdates).length > 0) {
        await GoalModel.updateSharedChildren(goal.id, cascadeUpdates);
      }
    }
    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'goal', entityId: goal.id, oldValues: goal, newValues: updated, req });

    return sendSuccess(res, updated, 'Goal updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/goals/:id  (soft delete → cancelled, only draft)
 */
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (req.user.role === 'employee' && goal.employee_id !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }
    if (goal.status !== 'draft') {
      return sendError(res, 'Only draft goals can be deleted', 400);
    }

    await GoalModel.delete(req.params.id);
    await writeAuditLog({ userId: req.user.id, action: 'DELETE', entityType: 'goal', entityId: goal.id, req });

    return sendSuccess(res, null, 'Goal deleted successfully');
  } catch (err) {
    next(err);
  }
};

// ─── WORKFLOW ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/goals/:id/submit
 * Employee submits goal for manager approval
 */
const submitGoal = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (goal.employee_id !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }
    if (!['draft', 'rejected'].includes(goal.status)) {
      return sendError(res, `Cannot submit a goal with status: ${goal.status}`, 400);
    }

    // Validate total weightage = 100% before submission
    const totalWeightage = await GoalModel.getTotalWeightage(goal.employee_id, goal.cycle_id);
    if (totalWeightage !== 100) {
      return sendError(res, `Total weightage must equal 100% before submission. Current total: ${totalWeightage}%`, 400);
    }

    const updated = await GoalModel.updateStatus(req.params.id, 'submitted', { submittedAt: new Date() });
    await writeAuditLog({ userId: req.user.id, action: 'SUBMIT', entityType: 'goal', entityId: goal.id, req });

    return sendSuccess(res, updated, 'Goal submitted for approval');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/goals/:id/approve  [manager, admin]
 */
const approveGoal = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (goal.status !== 'submitted') {
      return sendError(res, `Cannot approve a goal with status: ${goal.status}`, 400);
    }

    const updated = await GoalModel.updateStatus(req.params.id, 'approved', {
      approvedBy: req.user.id,
      approvedAt: new Date(),
      rejectionReason: null,
    });

    await writeAuditLog({ userId: req.user.id, action: 'APPROVE', entityType: 'goal', entityId: goal.id, req });
    return sendSuccess(res, updated, 'Goal approved successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/goals/:id/reject  [manager, admin]
 */
const rejectGoal = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return sendError(res, 'Rejection reason is required', 400);

    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (goal.status !== 'submitted') {
      return sendError(res, `Cannot reject a goal with status: ${goal.status}`, 400);
    }

    const updated = await GoalModel.updateStatus(req.params.id, 'rejected', {
      rejectionReason: reason,
      approvedBy: null,
      approvedAt: null,
    });

    await writeAuditLog({ userId: req.user.id, action: 'REJECT', entityType: 'goal', entityId: goal.id, newValues: { reason }, req });
    return sendSuccess(res, updated, 'Goal rejected');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/goals/:id/progress  [employee]
 * Mark goal as in_progress / completed with current value
 */
const updateProgress = async (req, res, next) => {
  try {
    const { currentValue, status, completionNotes } = req.body;

    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (goal.employee_id !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Access denied', 403);
    }
    if (!['approved', 'in_progress'].includes(goal.status)) {
      return sendError(res, 'Goal must be approved before tracking progress', 400);
    }

    const newStatus = status || (currentValue >= goal.target_value ? 'completed' : 'in_progress');
    const updated = await GoalModel.update(req.params.id, { currentValue, completionNotes });
    await GoalModel.updateStatus(req.params.id, newStatus);

    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'goal', entityId: goal.id, newValues: { currentValue, status: newStatus }, req });
    return sendSuccess(res, { ...updated, status: newStatus }, 'Progress updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/goals/pending-approvals  [manager, admin]
 */
const getPendingApprovals = async (req, res, next) => {
  try {
    const managerId = req.user.role === 'admin' ? null : req.user.id;
    const goals = await GoalModel.getPendingApprovals(managerId || req.user.id);
    return sendSuccess(res, goals);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/goals/:id/stats
 */
const getGoalStats = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const employeeId = req.user.role === 'employee' ? req.user.id : (req.query.employeeId || req.user.id);

    const cycle = cycleId || (await ReportModel.getActiveCycle())?.id;
    if (!cycle) return sendError(res, 'No cycle found', 400);

    const stats = await GoalModel.getEmployeeGoalStats(employeeId, cycle);
    return sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
};

// ─── Key Results ──────────────────────────────────────────────────────────────

const addKeyResult = async (req, res, next) => {
  try {
    const goal = await GoalModel.findById(req.params.id);
    if (!goal) return sendError(res, 'Goal not found', 404);

    if (req.user.role === 'employee' && goal.employee_id !== req.user.id) {
      return sendError(res, 'Access denied', 403);
    }

    const kr = await GoalModel.addKeyResult(req.params.id, req.body);
    return sendCreated(res, kr, 'Key result added');
  } catch (err) {
    next(err);
  }
};

const updateKeyResult = async (req, res, next) => {
  try {
    const updated = await GoalModel.updateKeyResult(req.params.krId, req.body);
    if (!updated) return sendError(res, 'Key result not found', 404);
    return sendSuccess(res, updated, 'Key result updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/goals/checkin-goals  [employee]
 * Returns all approved/in-progress goals eligible for check-in, with full check-in history.
 */
const getCheckinGoals = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const activeCycle = await ReportModel.getActiveCycle();
    const useCycleId = cycleId || activeCycle?.id || null;

    const goals = await GoalModel.getApprovedGoalsForCheckin(req.user.id, useCycleId);
    return sendSuccess(res, { goals, activeCycle });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGoal, getGoals, getGoalById, updateGoal, deleteGoal,
  submitGoal, approveGoal, rejectGoal, updateProgress,
  getPendingApprovals, getGoalStats, addKeyResult, updateKeyResult,
  getCheckinGoals, createSharedGoal
};
