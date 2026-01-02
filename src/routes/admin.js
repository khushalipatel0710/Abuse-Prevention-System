const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, adminOnlyMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Audit logs retrieved
 */
router.get('/audit-logs', authMiddleware, adminOnlyMiddleware, adminController.getAuditLogs);

/**
 * @swagger
 * /api/admin/blocked-entities:
 *   get:
 *     summary: Get blocked entities (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked entities retrieved
 */
router.get('/blocked-entities', authMiddleware, adminOnlyMiddleware, adminController.getBlockedEntities);

/**
 * @swagger
 * /api/admin/block-entity:
 *   post:
 *     summary: Block user or IP (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [user, ip]
 *               entityValue:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Entity blocked successfully
 */
router.post('/block-entity', authMiddleware, adminOnlyMiddleware, adminController.blockEntity);

module.exports = router;