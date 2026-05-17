const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../utils/validation');
const ctrl = require('../controllers/user.controller');

// All routes require auth
router.use(authenticate);

// GET /api/v1/users/team  [manager]
router.get('/team', authorize('manager', 'admin'), ctrl.getMyTeam);

// GET /api/v1/users
router.get('/', authorize('manager', 'admin'), ctrl.getUsers);

// GET /api/v1/users/:id
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  ctrl.getUserById
);

// PATCH /api/v1/users/:id
router.patch('/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('jobTitle').optional().trim(),
    body('departmentId').optional().isUUID(),
    body('managerId').optional().isUUID(),
  ],
  validate,
  ctrl.updateUser
);

// PATCH /api/v1/users/:id/status  [admin]
router.patch('/:id/status',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  ],
  validate,
  ctrl.updateUserStatus
);

// PATCH /api/v1/users/:id/role  [admin]
router.patch('/:id/role',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  ],
  validate,
  ctrl.updateUserRole
);

module.exports = router;
