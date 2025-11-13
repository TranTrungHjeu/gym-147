import cors from 'cors';
import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

// CORS configuration
export const corsMiddleware = cors({
  origin:
    process.env.CORS_ORIGIN ||
    (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173'),
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
