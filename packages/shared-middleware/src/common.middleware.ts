import cors from 'cors';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

// CORS configuration
// In production, CORS_ORIGIN or ALLOWED_ORIGINS must be set
// In development, use safe defaults with warning
const getCorsOrigin = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN;
  }
  if (process.env.ALLOWED_ORIGINS) {
    // Use first origin from ALLOWED_ORIGINS if CORS_ORIGIN not set
    return process.env.ALLOWED_ORIGINS.split(',')[0].trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGIN or ALLOWED_ORIGINS environment variable is required in production. ' +
        'Please set it in your .env file.'
    );
  }
  // Development fallback with warning
  console.warn(
    '[WARNING]  CORS_ORIGIN not set, using development default. Set CORS_ORIGIN in .env for production.'
  );
  return 'http://localhost:5173';
};

export const corsMiddleware = cors({
  origin: getCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Security headers
export const helmetMiddleware = helmet({
  crossOriginEmbedderPolicy: false,
});

// Request logging
export const loggingMiddleware = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev');

// Rate limiting
export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }

    next();
  };
};

// Request timeout middleware
export const timeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT',
        });
      }
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};

// Health check endpoint
export const healthCheck = (req: Request, res: Response) => {
  const uptime = process.uptime();

  res.status(200).json({
    success: true,
    message: 'Service is healthy',
    data: {
      status: 'healthy',
      service: process.env.SERVICE_NAME || 'unknown',
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });
};
