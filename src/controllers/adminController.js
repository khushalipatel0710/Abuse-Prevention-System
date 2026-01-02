const { AppError } = require('../utils/errors');
const auditLoggingService = require('../services/AuditLoggingService');
const abusePrevention = require('../services/AbusePreventionService');
const { BlockedEntity, AuditLog } = require('../database/models');

const adminController = {
  /**
   * Get audit logs
   */
  async getAuditLogs(req, res) {
    try {
      const { limit = '50', userId, ip, endpoint } = req.query;
      const parsedLimit = Math.min(parseInt(limit) || 50, 500);

      let logs;

      if (userId) {
        logs = await auditLoggingService.getUserLogs(userId, parsedLimit);
      } else if (ip) {
        logs = await auditLoggingService.getIpLogs(ip, parsedLimit);
      } else if (endpoint) {
        logs = await auditLoggingService.getEndpointLogs(endpoint, parsedLimit);
      } else {
        logs = await AuditLog.find({})
          .sort({ createdAt: -1 })
          .limit(parsedLimit)
          .lean();
      }

      const responseData = {
        message: 'Audit logs retrieved successfully',
        data: logs,
        count: logs.length,
      };
      res.status(200).json(responseData);
    } catch (error) {
      const errorResponse = {
        error: error.message || 'Failed to retrieve audit logs',
        statusCode: 500,
      };
      res.status(500).json(errorResponse);
    }
  },

  /**
   * Get rate limit violations
   */
  async getRateLimitViolations(req, res) {
    try {
      const { limit = '50' } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 50, 500);
      const violations = await auditLoggingService.getRateLimitViolations(parsedLimit);

      res.status(200).json({
        message: 'Rate limit violations retrieved successfully',
        data: violations,
        count: violations.length,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message || 'Failed to retrieve violations',
        statusCode: 500,
      });
    }
  },

  /**
   * Get blocked entities
   */
  async getBlockedEntities(req, res) {
    try {
      const blockedEntities = await BlockedEntity.find({})
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        message: 'Blocked entities retrieved successfully',
        data: blockedEntities,
        count: blockedEntities.length,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message || 'Failed to retrieve blocked entities',
        statusCode: 500,
      });
    }
  },

  /**
   * Unblock entity
   */
  async unblockEntity(req, res) {
    try {
      const { entityId, entityType } = req.body;

      if (!entityId || !entityType) {
        throw new AppError(400, 'Entity ID and type are required');
      }

      if (!['user', 'ip'].includes(entityType)) {
        throw new AppError(400, 'Invalid entity type');
      }

      await abusePrevention.unblockEntity(entityId, entityType);

      res.status(200).json({
        message: 'Entity unblocked successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: error.message,
          statusCode: error.statusCode,
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to unblock entity',
        statusCode: 500,
      });
    }
  },

  /**
   * Block entity
   */
  async blockEntity(req, res) {
    try {
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Content-Type:', req.headers['content-type']);
      
      if (!req.body) {
        throw new AppError(400, 'Request body is required');
      }

      const { entityId, entityType, entityValue, reason, durationMinutes = 5 } = req.body;
      const identifier = entityId || entityValue;
      
      console.log('Extracted values:', { entityId, entityType, entityValue, identifier, reason });

      if (!identifier || !entityType) {
        throw new AppError(400, 'Entity ID and type are required');
      }

      if (!['user', 'ip'].includes(entityType)) {
        throw new AppError(400, 'Invalid entity type');
      }

      const parsedDuration = Math.max(parseInt(durationMinutes) || 5, 1);

      if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
        throw new AppError(400, 'Duration must be a positive integer');
      }

      await abusePrevention.blockEntity(
        identifier,
        entityType,
        reason || 'Admin action',
        parsedDuration
      );

      const responseData = {
        message: 'Entity blocked successfully',
        data: {
          entityId: identifier,
          entityType,
          blockedUntil: new Date(Date.now() + parsedDuration * 60 * 1000),
        },
      };
      res.status(200).json(responseData);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: error.message,
          statusCode: error.statusCode,
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to block entity',
        statusCode: 500,
      });
    }
  },

  /**
   * Get block info
   */
  async getBlockInfo(req, res) {
    try {
      const { entityId, entityType } = req.query;

      if (!entityId || !entityType) {
        throw new AppError(400, 'Entity ID and type are required');
      }

      if (!['user', 'ip'].includes(entityType)) {
        throw new AppError(400, 'Invalid entity type');
      }

      const blockInfo = await abusePrevention.getBlockInfo(entityId, entityType);

      res.status(200).json({
        message: 'Block info retrieved successfully',
        data: blockInfo,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: error.message,
          statusCode: error.statusCode,
        });
      }

      res.status(500).json({
        error: error.message || 'Failed to retrieve block info',
        statusCode: 500,
      });
    }
  },
};

module.exports = adminController;
