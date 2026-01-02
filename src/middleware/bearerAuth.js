const { verifyToken } = require('../utils/jwt');

const bearerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header missing',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
    }

    const token = parts[1];
    const decoded = verifyToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      tenantId: decoded.tenantId || null,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message,
    });
  }
};

const optionalBearerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        const token = parts[1];
        const decoded = verifyToken(token);
        req.user = {
          userId: decoded.userId,
          role: decoded.role,
          tenantId: decoded.tenantId || null,
          email: decoded.email,
        };
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  bearerAuth,
  optionalBearerAuth,
};
