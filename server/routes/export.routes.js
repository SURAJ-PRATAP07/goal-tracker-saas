const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/export.controller');

// Only allow managers and admins to run these exports
router.use(authenticate, authorize('manager', 'admin'));

// GET /api/v1/exports/goals
router.get('/goals', ctrl.exportGoals);

// GET /api/v1/exports/users
router.get('/users', ctrl.exportUsers);

// Only admins for audit logs
router.get('/audit-logs', authorize('admin'), ctrl.exportAuditLogs);

module.exports = router;
