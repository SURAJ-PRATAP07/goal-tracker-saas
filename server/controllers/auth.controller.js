const bcrypt = require('bcryptjs');
const AuthModel = require('../models/auth.model');
const UserModel = require('../models/user.model');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendCreated, sendError, AppError } = require('../utils/response');
const { writeAuditLog } = require('../middleware/audit.middleware');
const { query } = require('../config/database');

/**
 * POST /api/v1/auth/signup
 * Public - self-registration, always creates an 'employee' account
 */
const signup = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, jobTitle } = req.body;

    if (await UserModel.emailExists(email)) {
      return sendError(res, 'An account with this email already exists', 409);
    }

    // Auto-generate a unique employee ID  e.g. EMP00047
    const countRes = await query('SELECT COUNT(*) FROM users');
    const count = parseInt(countRes.rows[0].count) + 1;
    const employeeId = `EMP${String(count).padStart(5, '0')}`;

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    const user = await UserModel.create({
      employeeId,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'employee',       // self-registered users are always employees
      departmentId: null,
      managerId: null,
      jobTitle: jobTitle || null,
    });

    // Auto-login after signup
    const fullUser = await AuthModel.findByEmail(email);
    const { accessToken, refreshToken } = generateTokenPair(fullUser);
    await AuthModel.saveRefreshToken(fullUser.id, refreshToken);
    await AuthModel.updateLastLogin(fullUser.id);

    const { password_hash, refresh_token, ...safeUser } = fullUser;
    return sendCreated(res, { user: safeUser, accessToken, refreshToken }, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/register
 * Admin only - creates a new user account (any role)
 */
const register = async (req, res, next) => {
  try {
    const { employeeId, email, password, firstName, lastName, role = 'employee', departmentId, managerId, jobTitle } = req.body;

    if (await UserModel.emailExists(email)) {
      return sendError(res, 'Email already registered', 409);
    }
    if (await UserModel.employeeIdExists(employeeId)) {
      return sendError(res, 'Employee ID already in use', 409);
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const user = await UserModel.create({ employeeId, email, passwordHash, firstName, lastName, role, departmentId, managerId, jobTitle });

    await writeAuditLog({ userId: req.user?.id, action: 'CREATE', entityType: 'user', entityId: user.id, newValues: { email, role }, req });
    return sendCreated(res, user, 'User registered successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await AuthModel.findByEmail(email);
    if (!user) return sendError(res, 'Invalid credentials', 401);
    if (user.status !== 'active') return sendError(res, 'Account is inactive or suspended', 403);

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'auth', metadata: { success: false }, req });
      return sendError(res, 'Invalid credentials', 401);
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    await AuthModel.saveRefreshToken(user.id, refreshToken);
    await AuthModel.updateLastLogin(user.id);

    await writeAuditLog({ userId: user.id, action: 'LOGIN', entityType: 'auth', req });

    const { password_hash, refresh_token, ...safeUser } = user;
    return sendSuccess(res, { user: safeUser, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(refreshToken);
    const user = await AuthModel.findByRefreshToken(refreshToken);

    if (!user || user.id !== decoded.id) {
      return sendError(res, 'Invalid refresh token', 401);
    }
    if (user.status !== 'active') return sendError(res, 'Account inactive', 403);

    const tokens = generateTokenPair(user);
    await AuthModel.saveRefreshToken(user.id, tokens.refreshToken);

    return sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await AuthModel.clearRefreshToken(req.user.id);
    await writeAuditLog({ userId: req.user.id, action: 'LOGOUT', entityType: 'auth', req });
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await AuthModel.findById(req.user.id);
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await AuthModel.findByEmail(req.user.email);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return sendError(res, 'Current password is incorrect', 400);

    const newHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    await AuthModel.updatePassword(req.user.id, newHash);

    await writeAuditLog({ userId: req.user.id, action: 'UPDATE', entityType: 'auth', newValues: { action: 'password_changed' }, req });
    return sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, register, login, refresh, logout, getMe, changePassword };
