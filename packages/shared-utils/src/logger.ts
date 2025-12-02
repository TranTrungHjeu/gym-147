/**
 * Centralized logging utility for all services
 * Uses Winston for structured logging
 */

import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private logger: winston.Logger;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
          ? JSON.stringify(meta, null, 2)
          : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );

    // Create logger instance
    this.logger = winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      format: logFormat,
      defaultMeta: { service: 'gym-147' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: this.isDevelopment ? consoleFormat : logFormat,
        }),
        // File transports for production
        ...(this.isDevelopment
          ? []
          : [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                maxsize: 5242880, // 5MB
                maxFiles: 5,
              }),
            ]),
      ],
    });
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.logger.error(message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.logger.debug(message, context);
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, message, context);
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for custom instances
export default Logger;

