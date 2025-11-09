/**
 * Error handling middleware for Express
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message, code } = err;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = code || 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = code || 'UNAUTHORIZED';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token provided';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    code = 'CORS_ERROR';
    message = 'Origin not allowed by CORS policy';
  }

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    statusCode = 400;
    code = 'DATABASE_ERROR';
    
    // Handle specific Prisma errors
    if (err.code === 'P2002') {
      message = 'Unique constraint violation. This record already exists.';
      code = 'DUPLICATE_ENTRY';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
      code = 'NOT_FOUND';
    } else {
      message = message || 'Database operation failed';
    }
  }

  // Axios errors (from inter-service calls)
  if (err.isAxiosError) {
    statusCode = err.response?.status || 502;
    code = code || 'SERVICE_ERROR';
    message = err.response?.data?.message || err.message || 'External service error';
  }

  // Log error (in production, use proper logger)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      code,
      url: req.url,
      method: req.method,
      userId: req.user?.id || req.user?.userId,
    });
  }

  // Send error response
  const response = {
    success: false,
    message,
    code: code || 'INTERNAL_ERROR',
  };

  // Include errors array if validation errors
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async routes
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

