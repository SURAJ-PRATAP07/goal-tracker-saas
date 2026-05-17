const ReportModel = require('../models/report.model');
const GoalModel = require('../models/goal.model');
const { sendSuccess, sendError } = require('../utils/response');
const { query } = require('../config/database');

/**
 * GET /api/v1/reports/dashboard  [admin]
 * Returns all data needed by the admin dashboard in a single call.
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const activeCycle = await ReportModel.getActiveCycle();
    const useCycleId  = cycleId || activeCycle?.id || null;

    const [dashboard, distribution, departments, leaderboard, monthlyTrend, quarterlyTrend, cycles] =
      await Promise.all([
        ReportModel.getAdminDashboard(useCycleId),
        ReportModel.getGoalDistribution(useCycleId),
        ReportModel.getDepartmentSummary(useCycleId),
        ReportModel.getLeaderboard(useCycleId, 10),
        ReportModel.getMonthlyTrend(useCycleId),
        ReportModel.getQuarterlyTrend(),
        ReportModel.getAllCycles(),
        ReportModel.getRecentActivity(10),
      ]);

    return sendSuccess(res, {
      dashboard,
      distribution,
      departments,
      leaderboard,
      monthlyTrend,
      quarterlyTrend,
      cycles,
      recentActivity,
      activeCycle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/manager-dashboard  [manager, admin]
 * Returns all data needed by the manager dashboard.
 */
const getManagerDashboard = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const activeCycle = await ReportModel.getActiveCycle();
    const useCycleId  = cycleId || activeCycle?.id || null;

    const managerId = req.user.id;
    const [managerData, pendingGoals] = await Promise.all([
      ReportModel.getManagerDashboardData(managerId, useCycleId),
      GoalModel.getPendingApprovals(managerId),
    ]);

    return sendSuccess(res, {
      team:           managerData.team,
      approvalStats:  managerData.approvalStats,
      pendingGoals,
      activeCycle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/employee-dashboard  [employee]
 * Returns all data needed by the employee dashboard.
 */
const getEmployeeDashboard = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const activeCycle = await ReportModel.getActiveCycle();
    const useCycleId  = cycleId || activeCycle?.id || null;

    const data = await ReportModel.getEmployeeDashboardData(req.user.id, useCycleId);

    return sendSuccess(res, { ...data, activeCycle });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/team  [manager, admin]
 */
const getTeamReport = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const report = await ReportModel.getTeamReport(req.user.id, cycleId);
    return sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/department  [admin]
 */
const getDepartmentSummary = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const summary = await ReportModel.getDepartmentSummary(cycleId);
    return sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/scorecard/:employeeId
 */
const getEmployeeScorecard = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    const { employeeId } = req.params;

    if (req.user.role === 'employee' && req.user.id !== employeeId) {
      return sendError(res, 'Access denied', 403);
    }

    const scorecard = await ReportModel.getEmployeeScorecard(employeeId, cycleId);
    if (!scorecard) return sendError(res, 'Employee not found', 404);

    return sendSuccess(res, scorecard);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/reports/cycles
 */
const getGoalCycles = async (req, res, next) => {
  try {
    const cycles = await ReportModel.getAllCycles();
    return sendSuccess(res, cycles);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/reports/cycles  [admin]
 */
const createGoalCycle = async (req, res, next) => {
  try {
    const { name, year, quarter, startDate, endDate, isActive = false } = req.body;

    if (isActive) {
      await query('UPDATE goal_cycles SET is_active = false');
    }

    const result = await query(
      `INSERT INTO goal_cycles (name, year, quarter, start_date, end_date, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, year, quarter, startDate, endDate, isActive, req.user.id]
    );

    return sendSuccess(res, result.rows[0], 'Goal cycle created', 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/reports/cycles/:id/activate  [admin]
 */
const activateCycle = async (req, res, next) => {
  try {
    await query('UPDATE goal_cycles SET is_active = false');
    const result = await query(
      'UPDATE goal_cycles SET is_active = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return sendError(res, 'Cycle not found', 404);
    return sendSuccess(res, result.rows[0], 'Cycle activated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard,
  getTeamReport,
  getDepartmentSummary,
  getEmployeeScorecard,
  getGoalCycles,
  createGoalCycle,
  activateCycle,
};
