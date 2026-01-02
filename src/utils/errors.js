class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const createErrorResponse = (statusCode, message, details) => {
  return {
    error: message,
    statusCode,
    ...(details && { details }),
  };
};

module.exports = {
  AppError,
  createErrorResponse,
};
