import { NextFunction, Request, Response } from 'express';

export class ErrorMiddleware {
  // Global error handler middleware
  static handleError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Error occurred:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Determine error type and respond accordingly
    if (err.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        data: null,
        errors: [err.message]
      });
      return;
    }

    if (err.name === 'UnauthorizedError') {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access',
        data: null
      });
      return;
    }

    if (err.name === 'ForbiddenError') {
      res.status(403).json({
        success: false,
        message: 'Forbidden access',
        data: null
      });
      return;
    }

    if (err.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        message: 'Resource not found',
        data: null
      });
      return;
    }

    // Default server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null,
      ...(process.env.NODE_ENV === 'development' && { 
        debug: {
          message: err.message,
          stack: err.stack
        }
      })
    });
  };

  // 404 handler for routes not found
  static handle404 = (req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.path} not found`,
      data: null
    });
  };

  // Async error handler wrapper
  static asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}

// Custom error classes
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}