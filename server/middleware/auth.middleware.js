const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/response');
const { query } = require('../config/database');

/**
 * Verify JWT and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication token required', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    const result = await query(
      `SELECT id, email, role, status, employee_id, first_name, last_name, 
              department_id, manager_id, password_changed_at
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    const user = result.rows[0];
    if (!user) return next(new AppError('User no longer exists', 401));
    if (user.status !== 'active') return next(new AppError('Account is inactive or suspended', 403));

    // Check if password was changed after token was issued
    if (user.password_changed_at) {
      const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (decoded.iat < changedAt) {
        return next(new AppError('Password recently changed. Please log in again', 401));
      }
    }

    req.user = user;
    req.clientIp = req.ip || req.socket.remoteAddress;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access control
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(
        `Access denied. Required role(s): ${roles.join(', ')}`, 403
      ));
    }
    next();
  };
};

/**
 * Allow access only to own resources OR managers/admins
 */
const authorizeOwnerOrManager = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Not authenticated', 401));
    const targetId = req.params[userIdParam] || req.body.employeeId;
    if (
      req.user.role === 'admin' ||
      req.user.role === 'manager' ||
      req.user.id === targetId
    ) {
      return next();
    }
    return next(new AppError('You can only access your own resources', 403));
  };
};

/**
 * Verify that a manager manages the target employee
 */
const authorizeManagerOf = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') return next();

    const employeeId = req.params.employeeId || req.body.employeeId;
    if (!employeeId) return next();

    if (req.user.role === 'manager') {
      const result = await query(
        'SELECT id FROM users WHERE id = $1 AND manager_id = $2',
        [employeeId, req.user.id]
      );
      if (!result.rows.length && req.user.id !== employeeId) {
        return next(new AppError('You do not manage this employee', 403));
      }
    } else if (req.user.id !== employeeId) {
      return next(new AppError('Access denied', 403));
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, authorize, authorizeOwnerOrManager, authorizeManagerOf };
