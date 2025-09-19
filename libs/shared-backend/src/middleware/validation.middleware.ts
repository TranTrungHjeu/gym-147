import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/common.types.js';

// Mock Joi interface for now - in real implementation, install joi package
interface JoiValidationDetail {
  path: (string | number)[];
  message: string;
  context?: {
    value?: any;
    [key: string]: any;
  };
}

interface JoiValidationError {
  details: JoiValidationDetail[];
}

interface JoiValidationResult {
  error?: JoiValidationError;
  value: any;
}

interface JoiObjectSchema {
  validate(value: any, options?: any): JoiValidationResult;
}

export class ValidationMiddleware {
  // Middleware validation cho request body
  static validateBody = (schema: JoiObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const validationErrors: ValidationError[] = error.details.map((detail: JoiValidationDetail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          res.status(400).json({
            success: false,
            message: 'Validation failed',
            data: null,
            errors: validationErrors.map(err => err.message)
          });
          return;
        }

        req.body = value;
        next();
      } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Validation process failed',
          data: null
        });
      }
    };
  };

  // Middleware validation cho query parameters
  static validateQuery = (schema: JoiObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const validationErrors: ValidationError[] = error.details.map((detail: JoiValidationDetail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          res.status(400).json({
            success: false,
            message: 'Query validation failed',
            data: null,
            errors: validationErrors.map(err => err.message)
          });
          return;
        }

        req.query = value;
        next();
      } catch (error) {
        console.error('Query validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Query validation process failed',
          data: null
        });
      }
    };
  };

  // Middleware validation cho route parameters
  static validateParams = (schema: JoiObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const { error, value } = schema.validate(req.params, {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          const validationErrors: ValidationError[] = error.details.map((detail: JoiValidationDetail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          res.status(400).json({
            success: false,
            message: 'Parameter validation failed',
            data: null,
            errors: validationErrors.map(err => err.message)
          });
          return;
        }

        req.params = value;
        next();
      } catch (error) {
        console.error('Parameter validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Parameter validation process failed',
          data: null
        });
      }
    };
  };

  // Simple validation functions để thay thế Joi tạm thời
  static createSimpleSchema = (rules: Record<string, (value: any) => boolean | string>) => {
    return {
      validate: (data: any) => {
        const errors: JoiValidationDetail[] = [];
        
        for (const [field, validator] of Object.entries(rules)) {
          const result = validator(data[field]);
          if (typeof result === 'string') {
            errors.push({
              path: [field],
              message: result,
              context: { value: data[field] }
            });
          }
        }

        return {
          error: errors.length > 0 ? { details: errors } : undefined,
          value: data
        };
      }
    };
  };
}

// Common validation schemas (simplified without Joi)
export const CommonSchemas = {
  // Validation cho pagination
  pagination: ValidationMiddleware.createSimpleSchema({
    page: (value: any) => {
      if (value && (!Number.isInteger(Number(value)) || Number(value) < 1)) {
        return 'Page must be a positive integer';
      }
      return true;
    },
    limit: (value: any) => {
      if (value && (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 100)) {
        return 'Limit must be between 1 and 100';
      }
      return true;
    }
  }),

  // Validation cho ID parameters
  id: ValidationMiddleware.createSimpleSchema({
    id: (value: any) => {
      if (!value || typeof value !== 'string' || value.trim() === '') {
        return 'ID is required';
      }
      return true;
    }
  })
};