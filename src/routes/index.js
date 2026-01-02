const { Router } = require('express');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/authMiddleware');
const { endpointRateLimit } = require('../middleware/rateLimitMiddleware');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const healthController = require('../controllers/healthController');

const router = Router();

// Health check
router.get('/health', healthController.health);

// Auth routes with endpoint-specific rate limits
router.post('/auth/register', endpointRateLimit(10), authController.register); // 10 registrations per minute
router.post('/auth/login', endpointRateLimit(20), authController.login); // 20 login attempts per minute
router.get('/auth/me', authMiddleware, authController.getCurrentUser);

// Admin routes
router.get('/admin/audit-logs', authMiddleware, adminOnlyMiddleware, adminController.getAuditLogs);
router.get(
  '/admin/rate-limit-violations',
  authMiddleware,
  adminOnlyMiddleware,
  adminController.getRateLimitViolations
);
router.get('/admin/blocked-entities', authMiddleware, adminOnlyMiddleware, adminController.getBlockedEntities);
router.post('/admin/block-entity', authMiddleware, adminOnlyMiddleware, adminController.blockEntity);
router.post('/admin/unblock-entity', authMiddleware, adminOnlyMiddleware, adminController.unblockEntity);
router.get('/admin/block-info', authMiddleware, adminOnlyMiddleware, adminController.getBlockInfo);

module.exports = router;
