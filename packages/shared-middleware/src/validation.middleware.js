const Joi = require('joi');

/**
 * Validation middleware for Express
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  login: Joi.object({
    identifier: Joi.string().required().messages({
      'string.empty': 'Email or phone is required',
      'any.required': 'Email or phone is required',
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
    twoFactorToken: Joi.string().optional(),
    push_token: Joi.string().optional(),
    push_platform: Joi.string().valid('ios', 'android').optional(),
  }),

  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    phone: Joi.string()
      .pattern(/^(\+84|84|0)[1-9][0-9]{8}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid Vietnamese phone number format',
        'any.required': 'Phone number is required',
      }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    first_name: Joi.string().required().messages({
      'string.empty': 'First name is required',
      'any.required': 'First name is required',
    }),
    last_name: Joi.string().required().messages({
      'string.empty': 'Last name is required',
      'any.required': 'Last name is required',
    }),
  }),

  updateProfile: Joi.object({
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    phone: Joi.string()
      .pattern(/^(\+84|84|0)[1-9][0-9]{8}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid Vietnamese phone number format',
      }),
    email: Joi.string().email().optional().messages({
      'string.email': 'Invalid email format',
    }),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),
};

module.exports = {
  validate,
  schemas,
};

