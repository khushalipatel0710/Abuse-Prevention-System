const { errorHandler } = require('../utils/errors');

const errorHandlerMiddleware = (error, req, res, next) => {
  console.error('Error:', error);

  if (error.name === 'AppError') {
    return res.status(error.statusCode).json({
      error: error.message,
      statusCode: error.statusCode,
      ...(error.details && { details: error.details }),
    });
  }

  // Rate limit error
  if (error.statusCode === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      statusCode: 429,
      retryAfter: error.retryAfter || 60
    });
  }

  // Default error
  return res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
    ...(process.env.NODE_ENV === 'development' && { details: error.message }),
  });
};

module.exports = { errorHandler: errorHandlerMiddleware };
