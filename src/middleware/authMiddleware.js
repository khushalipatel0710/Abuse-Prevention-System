let verifyToken;

const authMiddleware = (req, res, next) => {
  try {
    if (!verifyToken) {
      ({ verifyToken } = require('../utils/jwt'));
    }
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing authorization header:', {
        ip: req.ip,
        endpoint: `${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
      });
      
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7);

    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth middleware error:', {
      error: error.message,
      ip: req.ip,
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
    
    res.status(401).json({
      error: 'Invalid or expired token',
      statusCode: 401,
      details: error.message,
    });
  }
};

/**
 * Optional authentication middleware
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    if (!verifyToken) {
      ({ verifyToken } = require('../utils/jwt'));
    }
    
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
      
      console.log('Optional auth successful:', {
        userId: decoded.userId,
        role: decoded.role,
        ip: req.ip,
        endpoint: `${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', {
      error: error.message,
      ip: req.ip,
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
    next();
  }
};

/**
 * Admin-only middleware
 */
const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    console.error('Admin access denied:', {
      userId: req.user?.userId,
      role: req.user?.role,
      ip: req.ip,
      endpoint: `${req.method} ${req.path}`,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).json({
      error: 'Admin access required',
      statusCode: 403,
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminOnlyMiddleware,
};
