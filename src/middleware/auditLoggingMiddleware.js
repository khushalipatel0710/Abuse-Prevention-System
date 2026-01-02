let getClientIp, auditLoggingService;

const auditLoggingMiddleware = async (req, res, next) => {
  try {
    if (!getClientIp) {
      ({ getClientIp } = require('../utils/ip'));
    }
    if (!auditLoggingService) {
      auditLoggingService = require('../services/AuditLoggingService');
    }
    
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    const ip = getClientIp(req);
    const userId = req.user?.userId;

    res.json = function (data) {
      try {
        const statusCode = res.statusCode;

        auditLoggingService.createLog({
          userId,
          ip: ip || 'unknown',
          endpoint: req.path,
          method: req.method,
          statusCode,
          metadata: {
            queryParams: req.query,
            body: req.body ? { ...req.body, password: '***' } : undefined,
          },
        }).catch(err => {
          console.error('Failed to create audit log:', err.message);
        });
      } catch (logError) {
        console.error('Audit log creation error:', logError.message);
      }

      return originalJson(data);
    };

    res.send = function (data) {
      try {
        const statusCode = res.statusCode;

        auditLoggingService.createLog({
          userId,
          ip: ip || 'unknown',
          endpoint: req.path,
          method: req.method,
          statusCode,
        }).catch(err => {
          console.error('Failed to create audit log:', err.message);
        });
      } catch (logError) {
        console.error('Audit log creation error:', logError.message);
      }

      return originalSend(data);
    };

    next();
  } catch (error) {
    console.error('Audit logging middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: getClientIp(req),
      userId: req.user?.userId,
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
    next();
  }
};

module.exports = { auditLoggingMiddleware };
