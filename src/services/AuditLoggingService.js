let AuditLog;

class AuditLoggingService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      AuditLog = require('../database/models/AuditLog');
      this.initialized = true;
    }
  }
  /**
   * Create audit log entry
   */
  async createLog(data = {}) {
    await this.init();
    try {
      const logData = {
        userId: data.userId || null,
        ipAddress: data.ipAddress || 'unknown',
        endpoint: data.endpoint || 'unknown',
        method: data.method || 'UNKNOWN',
        statusCode: data.statusCode || 0,
        action: data.action || 'unknown',
        details: data.details || {},
      };

      await AuditLog.create(logData);
    } catch (error) {
      console.error('Error creating audit log:', {
        error: error.message,
        stack: error.stack,
        data: {
          userId: data.userId,
          ipAddress: data.ipAddress,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get audit logs for user
   */
  async getUserLogs(userId, limit = 50) {
    await this.init();
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const logs = await AuditLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      return logs;
    } catch (error) {
      console.error('Error getting user logs:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get audit logs for IP
   */
  async getIpLogs(ipAddress, limit = 50) {
    const logs = await AuditLog.find({ ipAddress })
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs;
  }

  /**
   * Get rate limit violations
   */
  async getRateLimitViolations(limit = 50) {
    const logs = await AuditLog.find({
      action: { $in: ['rate_limit_exceeded', 'abuse_detected'] }
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs;
  }

  /**
   * Get logs by endpoint
   */
  async getEndpointLogs(endpoint, limit = 50) {
    const logs = await AuditLog.find({ endpoint })
      .sort({ createdAt: -1 })
      .limit(limit);

    return logs;
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters = {}, limit = 50, skip = 0) {
    const query = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.endpoint) query.endpoint = filters.endpoint;
    if (filters.method) query.method = filters.method;
    if (filters.action) query.action = filters.action;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    return { logs, total, limit, skip };
  }
}

module.exports = new AuditLoggingService();
