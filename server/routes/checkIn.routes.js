const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { enforceWindowRestriction } = require('../middleware/window.middleware');
const { validate } = require('../utils/validation');
const ctrl = require('../controllers/checkIn.controller');

router.use(authenticate);

// POST /api/v1/check-ins
router.post('/',
  enforceWindowRestriction,
  [
    body('goalId').isUUID().withMessage('Valid goal ID required'),
    body('progressValue').optional().isFloat({ min: 0 }),
    body('progressPercent').optional().isFloat({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
    body('status').isIn(['on_track', 'at_risk', 'behind', 'completed']).withMessage('Invalid status'),
    body('employeeNotes').optional().trim().isLength({ max: 2000 }),
  ],
  validate,
  ctrl.createCheckIn
);

// GET /api/v1/check-ins
router.get('/', ctrl.getCheckIns);

// GET /api/v1/check-ins/goals/:goalId/progress
router.get('/goals/:goalId/progress',
  [param('goalId').isUUID().withMessage('Invalid goal ID')],
  validate,
  ctrl.getGoalProgress
);

// GET /api/v1/check-ins/:id
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid check-in ID')],
  validate,
  ctrl.getCheckInById
);

// PATCH /api/v1/check-ins/:id/feedback  [manager, admin]
router.patch('/:id/feedback',
  authorize('manager', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid check-in ID'),
    body('managerNotes').trim().notEmpty().withMessage('Manager notes are required').isLength({ max: 2000 }),
  ],
  validate,
  ctrl.addManagerFeedback
);

module.exports = router;
