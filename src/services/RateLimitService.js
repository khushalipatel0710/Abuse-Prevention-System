const { getRedisClient } = require('../config/redis');
const config = require('../config');

class RateLimitService {
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
   * Generic rate limit check method
   */
  async checkRateLimit(key, maxRequests, windowMs) {
    const redisClient = this.getClient();
    if (!redisClient) return { allowed: true, remaining: 999, resetTime: Date.now() + 60000, current: 0 };
    
    const now = Date.now();
    const windowStart = now - windowMs;
    const requests = await redisClient.zRangeByScore(key, windowStart, now);
    
    if (requests.length >= maxRequests) {
      const resetTime = parseInt(requests[0]) + windowMs;
      return { allowed: false, remaining: 0, resetTime, current: requests.length };
    }

    await redisClient.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    await redisClient.expire(key, Math.ceil(windowMs / 1000));
    await redisClient.zRemRangeByScore(key, 0, windowStart);

    return {
      allowed: true,
      remaining: maxRequests - requests.length - 1,
      resetTime: now + windowMs,
      current: requests.length + 1
    };
  }

  async checkIpRateLimit(ip) {
    return this.checkRateLimit(
      `ratelimit:ip:${ip}`,
      config.rateLimiting.perIpMax,
      config.rateLimiting.windowMs
    );
  }

  async checkUserRateLimit(userId) {
    return this.checkRateLimit(
      `ratelimit:user:${userId}`,
      config.rateLimiting.perUserMax,
      config.rateLimiting.windowMs
    );
  }

  async checkEndpointRateLimit(endpoint, identifier = 'global') {
    return this.checkRateLimit(
      `ratelimit:endpoint:${endpoint}:${identifier}`,
      config.rateLimiting.perEndpointMax,
      config.rateLimiting.windowMs
    );
  }

  /**
   * Record violation for abuse prevention
   */
  async recordViolation(identifier, type, reason) {
    const redisClient = this.getClient();
    if (!redisClient) return 1;
    
    const key = `violations:${type}:${identifier}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window for violations
    const windowStart = now - windowMs;

    // Add violation
    await redisClient.zAdd(key, { score: now, value: `${now}-${reason}` });
    await redisClient.expire(key, 3600); // 1 hour
    
    // Clean old violations
    await redisClient.zRemRangeByScore(key, 0, windowStart);
    
    // Get current violation count
    const violations = await redisClient.zRangeByScore(key, windowStart, now);
    return violations.length;
  }

  /**
   * Get violation count
   */
  async getViolationCount(identifier, type) {
    const redisClient = this.getClient();
    if (!redisClient) return 0;
    
    const key = `violations:${type}:${identifier}`;
    const now = Date.now();
    const windowStart = now - (60 * 60 * 1000); // 1 hour window
    
    const violations = await redisClient.zRangeByScore(key, windowStart, now);
    return violations.length;
  }
}

module.exports = new RateLimitService();
