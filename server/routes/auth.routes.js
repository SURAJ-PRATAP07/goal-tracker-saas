const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../utils/validation');
const ctrl = require('../controllers/auth.controller');

const passwordRules = () =>
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character');

// POST /api/v1/auth/signup  [public — self-registration as employee]
router.post('/signup',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    passwordRules(),
    body('jobTitle').optional().trim(),
  ],
  validate,
  ctrl.signup
);

// POST /api/v1/auth/register  [admin only]
router.post('/register',
  authenticate,
  authorize('admin'),
  [
    body('employeeId').trim().notEmpty().withMessage('Employee ID is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    passwordRules(),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
    body('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    body('managerId').optional().isUUID().withMessage('Invalid manager ID'),
  ],
  validate,
  ctrl.register
);

// POST /api/v1/auth/login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  ctrl.login
);

// POST /api/v1/auth/refresh
router.post('/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token required')],
  validate,
  ctrl.refresh
);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, ctrl.logout);

// GET /api/v1/auth/me
router.get('/me', authenticate, ctrl.getMe);

// PATCH /api/v1/auth/change-password
router.patch('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('New password min 8 chars')
      .matches(/[A-Z]/).withMessage('Must have uppercase')
      .matches(/[0-9]/).withMessage('Must have a number'),
  ],
  validate,
  ctrl.changePassword
);

module.exports = router;
