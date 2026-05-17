const router = require('express').Router();
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { enforceWindowRestriction } = require('../middleware/window.middleware');
const { validate } = require('../utils/validation');
const { auditLog } = require('../middleware/audit.middleware');
const ctrl = require('../controllers/goal.controller');

const CATEGORIES = ['performance', 'development', 'learning', 'innovation', 'leadership', 'operational'];

router.use(authenticate);

// ─── Special routes first ────────────────────────────────────────────────────

// GET /api/v1/goals/pending-approvals
router.get('/pending-approvals',
  authorize('manager', 'admin'),
  ctrl.getPendingApprovals
);

// GET /api/v1/goals/stats
router.get('/stats', ctrl.getGoalStats);

// GET /api/v1/goals/checkin-goals  [employee]
router.get('/checkin-goals', ctrl.getCheckinGoals);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// POST /api/v1/goals/shared  [manager, admin]
router.post('/shared',
  authorize('manager', 'admin'),
  enforceWindowRestriction,
  [
    body('title').trim().notEmpty().withMessage('Goal title is required').isLength({ max: 255 }),
    body('category').isIn(CATEGORIES),
    body('weightage').optional().isFloat({ min: 10, max: 100 }),
    body('targetValue').optional().isFloat({ min: 0 }),
    body('employeeIds').isArray({ min: 1 }).withMessage('At least one employee is required'),
  ],
  validate,
  ctrl.createSharedGoal
);

// POST /api/v1/goals
router.post('/',
  enforceWindowRestriction,
  [
    body('title').trim().notEmpty().withMessage('Goal title is required')
      .isLength({ max: 255 }).withMessage('Title max 255 chars'),
    body('description').optional().trim(),
    body('category').isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
    body('weightage')
      .isFloat({ min: 10, max: 100 }).withMessage('Weightage must be between 10 and 100'),
    body('targetValue').optional().isFloat({ min: 0 }).withMessage('Target value must be a positive number'),
    body('unitOfMeasure').optional().trim().isLength({ max: 50 }),
    body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
    body('cycleId').optional().isUUID().withMessage('Invalid cycle ID'),
  ],
  validate,
  ctrl.createGoal
);

// GET /api/v1/goals
router.get('/', ctrl.getGoals);

// GET /api/v1/goals/:id
router.get('/:id',
  [param('id').isUUID().withMessage('Invalid goal ID')],
  validate,
  ctrl.getGoalById
);

// PATCH /api/v1/goals/:id
router.patch('/:id',
  enforceWindowRestriction,
  [
    param('id').isUUID().withMessage('Invalid goal ID'),
    body('title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('category').optional().isIn(CATEGORIES),
    body('weightage').optional().isFloat({ min: 10, max: 100 }),
    body('targetValue').optional().isFloat({ min: 0 }),
    body('dueDate').optional().isISO8601(),
  ],
  validate,
  ctrl.updateGoal
);

// DELETE /api/v1/goals/:id
router.delete('/:id',
  [param('id').isUUID().withMessage('Invalid goal ID')],
  validate,
  ctrl.deleteGoal
);

// ─── Workflow ─────────────────────────────────────────────────────────────────

// POST /api/v1/goals/:id/submit
router.post('/:id/submit',
  enforceWindowRestriction,
  [param('id').isUUID().withMessage('Invalid goal ID')],
  validate,
  ctrl.submitGoal
);

// POST /api/v1/goals/:id/approve  [manager, admin]
router.post('/:id/approve',
  authorize('manager', 'admin'),
  [param('id').isUUID().withMessage('Invalid goal ID')],
  validate,
  ctrl.approveGoal
);

// POST /api/v1/goals/:id/reject  [manager, admin]
router.post('/:id/reject',
  authorize('manager', 'admin'),
  [
    param('id').isUUID().withMessage('Invalid goal ID'),
    body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  ],
  validate,
  ctrl.rejectGoal
);

// PATCH /api/v1/goals/:id/progress
router.patch('/:id/progress',
  [
    param('id').isUUID().withMessage('Invalid goal ID'),
    body('currentValue').isFloat({ min: 0 }).withMessage('Current value must be a positive number'),
    body('status').optional().isIn(['in_progress', 'completed']),
    body('completionNotes').optional().trim(),
  ],
  validate,
  ctrl.updateProgress
);

// ─── Key Results ──────────────────────────────────────────────────────────────

// POST /api/v1/goals/:id/key-results
router.post('/:id/key-results',
  [
    param('id').isUUID().withMessage('Invalid goal ID'),
    body('title').trim().notEmpty().withMessage('Key result title required'),
    body('target').optional().isFloat({ min: 0 }),
    body('dueDate').optional().isISO8601(),
  ],
  validate,
  ctrl.addKeyResult
);

// PATCH /api/v1/goals/:id/key-results/:krId
router.patch('/:id/key-results/:krId',
  [
    param('id').isUUID(),
    param('krId').isUUID(),
  ],
  validate,
  ctrl.updateKeyResult
);

module.exports = router;
