const UserModel = require('../models/user.model');
const { sendSuccess, sendCreated, sendError, sendPaginated, parsePagination, AppError } = require('../utils/response');
const { sanitizeSortField, sanitizeSortOrder } = require('../utils/validation');
const { writeAuditLog } = require('../middleware/audit.middleware');

const ALLOWED_SORT = ['first_name', 'last_name', 'email', 'created_at', 'last_login_at', 'role'];

/**
 * GET /api/v1/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, departmentId, managerId, status, search, sort = 'created_at', order } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const sortField = sanitizeSortField(sort, ALLOWED_SORT);
    const sortOrder = sanitizeSortOrder(order);

    // Managers can only see their team
    const filterManagerId = req.user.role === 'manager' ? req.user.id : managerId;

    const { rows, total } = await UserModel.findAll({
      role, departmentId, managerId: filterManagerId, status, search, limit, offset, sortField, sortOrder,
    });

    return sendPaginated(res, rows, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    // Employees can only view their own profile
    if (req.user.role === 'employee' && req.user.id !== req.params.id) {
      return sendError(res, 'Access denied', 403);
    }

    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Employees can only update own profile
    if (req.user.role === 'employee' && req.user.id !== id) {
      return sendError(res, 'Access denied', 403);
    }

    const existing = await UserModel.findById(id);
    if (!existing) return sendError(res, 'User not found', 404);

    const updated = await UserModel.update(id, req.body);
    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'user', entityId: id, oldValues: existing, newValues: updated, req });

    return sendSuccess(res, updated, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id/status  [admin]
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (id === req.user.id) return sendError(res, 'Cannot change your own status', 400);

    const updated = await UserModel.updateStatus(id, status, req.user.id);
    if (!updated) return sendError(res, 'User not found', 404);

    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'user', entityId: id, newValues: { status }, req });
    return sendSuccess(res, updated, `User ${status} successfully`);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/users/:id/role  [admin]
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;
    if (id === req.user.id) return sendError(res, 'Cannot change your own role', 400);

    const updated = await UserModel.updateRole(id, role);
    if (!updated) return sendError(res, 'User not found', 404);

    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'user', entityId: id, newValues: { role }, req });
    return sendSuccess(res, updated, 'User role updated');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/users/team  [manager]
 */
const getMyTeam = async (req, res, next) => {
  try {
    const members = await UserModel.getTeamMembers(req.user.id);
    return sendSuccess(res, members);
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, updateUser, updateUserStatus, updateUserRole, getMyTeam };
