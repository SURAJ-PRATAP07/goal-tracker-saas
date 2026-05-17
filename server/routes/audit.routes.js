const router = require('express').Router();
const { param } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../utils/validation');
const ctrl = require('../controllers/audit.controller');

router.use(authenticate, authorize('admin'));

// GET /api/v1/audit-logs
router.get('/', ctrl.getAuditLogs);

// GET /api/v1/audit-logs/entity/:type/:id
router.get('/entity/:type/:id',
  [
    param('type').trim().notEmpty(),
    param('id').isUUID().withMessage('Invalid entity ID'),
  ],
  validate,
  ctrl.getEntityAuditTrail
);

module.exports = router;
