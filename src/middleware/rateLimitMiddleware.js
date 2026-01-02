const { getClientIp, isIpWhitelisted } = require('../utils/ip');
const rateLimitService = require('../services/RateLimitService');
const abusePrevention = require('../services/AbusePreventionService');
const auditLoggingService = require('../services/AuditLoggingService');
const config = require('../config');

/**
 * Rate limiting middleware with sliding window algorithm
 */
const rateLimitMiddleware = (options = {}) => {
  const {
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null,
  } = options;

  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      const userId = req.user?.userId;
      const endpoint = `${req.method} ${req.path}`;

      // Check if IP is blacklisted
      if (config.blacklist.ips.includes(ip)) {
        await auditLoggingService.createLog({
          userId,
          ip,
          endpoint,
          method: req.method,
          statusCode: 403,
          limitExceededReason: 'IP_BLACKLISTED',
        });

        return res.status(403).json({
          error: 'Access denied',
          statusCode: 403,
        });
      }

      // Check if IP/User is whitelisted
      const isWhitelisted = 
        isIpWhitelisted(ip, config.whitelist.internalIps) ||
        isIpWhitelisted(ip, config.whitelist.adminIps) ||
        req.user?.role === 'admin';

      if (isWhitelisted) {
        return next();
      }

      // Check if IP or user is blocked
      const [ipBlocked, userBlocked] = await Promise.all([
        abusePrevention.isBlocked(ip, 'ip'),
        userId ? abusePrevention.isBlocked(userId, 'user') : Promise.resolve(false)
      ]);

      if (ipBlocked || userBlocked) {
        const blockInfo = ipBlocked
          ? await abusePrevention.getBlockInfo(ip, 'ip')
          : await abusePrevention.getBlockInfo(userId, 'user');

        await auditLoggingService.createLog({
          userId,
          ip,
          endpoint,
          method: req.method,
          statusCode: 429,
          limitExceededReason: 'ENTITY_BLOCKED',
          metadata: blockInfo,
        });

        const retryAfter = blockInfo.unblockAt 
          ? Math.ceil((blockInfo.unblockAt.getTime() - Date.now()) / 1000)
          : 300; // 5 minutes default

        return res.status(429)
          .set('X-RateLimit-Limit', '0')
          .set('X-RateLimit-Remaining', '0')
          .set('X-RateLimit-Reset', String(blockInfo.unblockAt?.getTime() || Date.now() + 300000))
          .json({
            error: 'Rate limit exceeded',
            retryAfter
          });
      }

      // Check IP rate limit (applies to all requests)
      const ipLimitResult = await rateLimitService.checkIpRateLimit(ip);
      if (!ipLimitResult.allowed) {
        const violations = await rateLimitService.recordViolation(ip, 'ip', 'IP rate limit exceeded');
        
        await auditLoggingService.createLog({
          userId,
          ip,
          endpoint,
          method: req.method,
          statusCode: 429,
          limitExceededReason: 'IP_RATE_LIMIT_EXCEEDED',
          metadata: { violations, current: ipLimitResult.current },
        });

        // Handle abuse prevention
        const abuse = await abusePrevention.handleViolation(
          ip,
          'ip',
          'Rate limit violations',
          violations
        );

        const retryAfter = Math.ceil((ipLimitResult.resetTime - Date.now()) / 1000);

        return res.status(429)
          .set('X-RateLimit-Limit', String(config.rateLimiting.perIpMax))
          .set('X-RateLimit-Remaining', String(ipLimitResult.remaining))
          .set('X-RateLimit-Reset', String(ipLimitResult.resetTime))
          .json({
            error: 'Rate limit exceeded',
            retryAfter
          });
      }

      // Check user rate limit if authenticated
      if (userId) {
        const userLimitResult = await rateLimitService.checkUserRateLimit(userId);
        if (!userLimitResult.allowed) {
          const violations = await rateLimitService.recordViolation(userId, 'user', 'User rate limit exceeded');
          
          await auditLoggingService.createLog({
            userId,
            ip,
            endpoint,
            method: req.method,
            statusCode: 429,
            limitExceededReason: 'USER_RATE_LIMIT_EXCEEDED',
            metadata: { violations, current: userLimitResult.current },
          });

          // Handle abuse prevention
          const abuse = await abusePrevention.handleViolation(
            userId,
            'user',
            'Rate limit violations',
            violations
          );

          const retryAfter = Math.ceil((userLimitResult.resetTime - Date.now()) / 1000);

          return res.status(429)
            .set('X-RateLimit-Limit', String(config.rateLimiting.perUserMax))
            .set('X-RateLimit-Remaining', String(userLimitResult.remaining))
            .set('X-RateLimit-Reset', String(userLimitResult.resetTime))
            .json({
              error: 'Rate limit exceeded',
              retryAfter
            });
        }

        // Set user rate limit headers
        res.set({
          'X-RateLimit-Limit': String(config.rateLimiting.perUserMax),
          'X-RateLimit-Remaining': String(userLimitResult.remaining),
          'X-RateLimit-Reset': String(userLimitResult.resetTime)
        });
      } else {
        // Set IP rate limit headers for unauthenticated requests
        res.set({
          'X-RateLimit-Limit': String(config.rateLimiting.perIpMax),
          'X-RateLimit-Remaining': String(ipLimitResult.remaining),
          'X-RateLimit-Reset': String(ipLimitResult.resetTime)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', {
        error: error.message,
        stack: error.stack,
        ip: getClientIp(req),
        userId: req.user?.userId,
        endpoint: `${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
      });
      next(error);
    }
  };
};

/**
 * Endpoint-specific rate limiting
 */
const endpointRateLimit = (maxRequests = null) => {
  return async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      const userId = req.user?.userId;
      const endpoint = `${req.method} ${req.path}`;
      const identifier = userId || ip;

      // Skip if whitelisted
      const isWhitelisted = 
        isIpWhitelisted(ip, config.whitelist.internalIps) ||
        isIpWhitelisted(ip, config.whitelist.adminIps) ||
        req.user?.role === 'admin';

      if (isWhitelisted) {
        return next();
      }

      const endpointLimitResult = await rateLimitService.checkEndpointRateLimit(endpoint, identifier);
      
      if (!endpointLimitResult.allowed) {
        await auditLoggingService.createLog({
          userId,
          ip,
          endpoint,
          method: req.method,
          statusCode: 429,
          limitExceededReason: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
          metadata: { current: endpointLimitResult.current },
        });

        const retryAfter = Math.ceil((endpointLimitResult.resetTime - Date.now()) / 1000);

        return res.status(429)
          .set('X-RateLimit-Limit', String(maxRequests || config.rateLimiting.perEndpointMax))
          .set('X-RateLimit-Remaining', String(endpointLimitResult.remaining))
          .set('X-RateLimit-Reset', String(endpointLimitResult.resetTime))
          .json({
            error: 'Rate limit exceeded',
            retryAfter
          });
      }

      next();
    } catch (error) {
      console.error('Endpoint rate limit middleware error:', {
        error: error.message,
        stack: error.stack,
        ip: getClientIp(req),
        userId: req.user?.userId,
        endpoint: `${req.method} ${req.path}`,
        maxRequests,
        timestamp: new Date().toISOString()
      });
      next(error);
    }
  };
};

module.exports = { 
  rateLimitMiddleware,
  endpointRateLimit
};