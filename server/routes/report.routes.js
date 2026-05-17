const router = require('express').Router();
const { body, param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../utils/validation');
const ctrl = require('../controllers/report.controller');

router.use(authenticate);

// ─── Dashboard endpoints (single-call, data-rich) ─────────────────────────────

// GET /api/v1/reports/dashboard              [admin]
router.get('/dashboard', authorize('admin'), ctrl.getAdminDashboard);

// GET /api/v1/reports/manager-dashboard      [manager, admin]
router.get('/manager-dashboard', authorize('manager', 'admin'), ctrl.getManagerDashboard);

// GET /api/v1/reports/employee-dashboard     [all authenticated]
router.get('/employee-dashboard', ctrl.getEmployeeDashboard);

// ─── Granular endpoints ───────────────────────────────────────────────────────

// GET /api/v1/reports/team                   [manager, admin]
router.get('/team', authorize('manager', 'admin'), ctrl.getTeamReport);

// GET /api/v1/reports/department             [admin]
router.get('/department', authorize('admin'), ctrl.getDepartmentSummary);

// GET /api/v1/reports/scorecard/:employeeId
router.get('/scorecard/:employeeId',
  [param('employeeId').isUUID().withMessage('Invalid employee ID')],
  validate,
  ctrl.getEmployeeScorecard
);

// GET /api/v1/reports/cycles
router.get('/cycles', ctrl.getGoalCycles);

// POST /api/v1/reports/cycles                [admin]
router.post('/cycles',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Cycle name required'),
    body('year').isInt({ min: 2020, max: 2100 }).withMessage('Valid year required'),
    body('quarter').isInt({ min: 1, max: 4 }).withMessage('Quarter must be 1-4'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  ctrl.createGoalCycle
);

// PATCH /api/v1/reports/cycles/:id/activate  [admin]
router.patch('/cycles/:id/activate',
  authorize('admin'),
  [param('id').isUUID().withMessage('Invalid cycle ID')],
  validate,
  ctrl.activateCycle
);

module.exports = router;
