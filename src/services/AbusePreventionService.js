const BlockedEntity = require('../database/models/BlockedEntity');
const { getRedisClient } = require('../config/redis');
const config = require('../config');

class AbusePrevention {
  constructor() {
    this.redisClient = null;
  }

  getClient() {
    try {
      if (!this.redisClient) {
        this.redisClient = getRedisClient();
      }
      return this.redisClient;
    } catch (error) {
      console.error('Failed to get Redis client:', error.message);
      return null;
    }
  }
  /**
   * Check if entity is blocked
   */
  async isBlocked(entityValue, entityType) {
    try {
      // Check Redis cache first
      const redisClient = this.getClient();
      if (redisClient) {
        const redisKey = `blocked:${entityType}:${entityValue}`;
        const cachedBlocked = await redisClient.get(redisKey);
        
        if (cachedBlocked === 'true') {
          return true;
        }
      }

      // Check MongoDB database
      const blockedEntity = await BlockedEntity.findOne({
        entityValue,
        entityType,
        $or: [
          { isPermanent: true },
          { unblockAt: { $gt: new Date() } }
        ]
      });

      if (blockedEntity && redisClient) {
        // Cache in Redis
        const remaining = blockedEntity.unblockAt 
          ? blockedEntity.unblockAt.getTime() - Date.now()
          : 24 * 60 * 60 * 1000; // 24 hours for permanent blocks
        const redisKey = `blocked:${entityType}:${entityValue}`;
        await redisClient.setEx(redisKey, Math.ceil(remaining / 1000), 'true');
        return true;
      }

      return !!blockedEntity;
    } catch (error) {
      console.error('Error checking if entity is blocked:', { entityValue, entityType, error: error.message });
      return false;
    }
  }

  /**
   * Block an entity
   */
  async blockEntity(entityValue, entityType, reason, durationMinutes = null, blockedBy = null) {
    let unblockAt = null;
    let isPermanent = true;

    if (durationMinutes) {
      unblockAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      isPermanent = false;
    }

    // Update or create in MongoDB
    const blockedEntity = await BlockedEntity.findOneAndUpdate(
      {
        entityValue,
        entityType,
      },
      {
        entityValue,
        entityType,
        reason,
        blockedAt: new Date(),
        unblockAt,
        isPermanent,
        blockedBy,
      },
      { upsert: true, new: true }
    );

    // Cache in Redis if available
    const redisClient = this.getClient();
    if (redisClient) {
      const cacheDuration = durationMinutes ? durationMinutes * 60 : 24 * 60 * 60;
      await redisClient.setEx(
        `blocked:${entityType}:${entityValue}`,
        cacheDuration,
        'true'
      );
    }

    return blockedEntity;
  }

  /**
   * Unblock an entity
   */
  async unblockEntity(entityValue, entityType) {
    const redisClient = this.getClient();
    
    const [result] = await Promise.all([
      BlockedEntity.deleteOne({ entityValue, entityType }),
      redisClient ? redisClient.del(`blocked:${entityType}:${entityValue}`) : Promise.resolve()
    ]);

    return result.deletedCount > 0;
  }

  /**
   * Get block info
   */
  async getBlockInfo(entityValue, entityType) {
    const blockedEntity = await BlockedEntity.findOne({
      entityValue,
      entityType,
      $or: [
        { isPermanent: true },
        { unblockAt: { $gt: new Date() } }
      ]
    }).lean();

    return blockedEntity ? {
      isBlocked: true,
      blockedAt: blockedEntity.blockedAt,
      unblockAt: blockedEntity.unblockAt,
      reason: blockedEntity.reason,
      isPermanent: blockedEntity.isPermanent,
    } : {
      isBlocked: false,
    };
  }

  /**
   * Handle violation and apply progressive blocking
   */
  async handleViolation(entityValue, entityType, reason, violationCount, blockedBy = null) {
    const { threshold, blockDurationMinutes, progressiveBlockDurationMinutes } = config.abusePrevention;

    if (violationCount >= threshold) {
      const duration = violationCount >= threshold * 2 ? progressiveBlockDurationMinutes : blockDurationMinutes;

      await this.blockEntity(entityValue, entityType, reason, duration, blockedBy);

      return { blocked: true, duration, violations: violationCount };
    }

    return { blocked: false, violations: violationCount };
  }

  /**
   * Get all blocked entities
   */
  async getBlockedEntities(limit = 50, skip = 0) {
    const query = {
      $or: [
        { isPermanent: true },
        { unblockAt: { $gt: new Date() } }
      ]
    };

    const [blockedEntities, total] = await Promise.all([
      BlockedEntity.find(query)
        .populate('blockedBy', 'username email')
        .limit(limit)
        .skip(skip)
        .sort({ blockedAt: -1 }),
      BlockedEntity.countDocuments(query)
    ]);

    return {
      entities: blockedEntities,
      total,
      limit,
      skip,
    };
  }

  /**
   * Clear expired blocks
   */
  async clearExpiredBlocks() {
    const result = await BlockedEntity.deleteMany({
      isPermanent: false,
      unblockAt: { $lt: new Date() }
    });

    return result.deletedCount;
  }
}

module.exports = new AbusePrevention();
