import { PaginationOptions, PaginationResult } from '../types/common.types.js';

export class PaginationUtils {
  // Tính toán pagination metadata
  static calculatePagination(
    total: number, 
    page: number = 1, 
    limit: number = 10
  ): PaginationResult {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    };
  }

  // Tính offset cho database query
  static calculateOffset(page: number = 1, limit: number = 10): number {
    return (page - 1) * limit;
  }

  // Validate và normalize pagination options
  static normalizePaginationOptions(options: PaginationOptions): Required<PaginationOptions> {
    return {
      page: Math.max(1, options.page || 1),
      limit: Math.min(100, Math.max(1, options.limit || 10)),
      sortBy: options.sortBy || 'createdAt',
      sortOrder: options.sortOrder || 'desc'
    };
  }

  // Tạo SQL ORDER BY clause
  static buildOrderByClause(sortBy: string, sortOrder: 'asc' | 'desc'): string {
    const sanitizedSortBy = sortBy.replace(/[^a-zA-Z0-9_]/g, '');
    const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    return `ORDER BY ${sanitizedSortBy} ${order}`;
  }

  // Tạo SQL LIMIT và OFFSET clause
  static buildLimitOffsetClause(page: number, limit: number): string {
    const offset = this.calculateOffset(page, limit);
    return `LIMIT ${limit} OFFSET ${offset}`;
  }
}

export class ResponseUtils {
  // Tạo response format chuẩn
  static success<T>(data: T, message: string = 'Success'): {
    success: true;
    message: string;
    data: T;
  } {
    return {
      success: true,
      message,
      data
    };
  }

  // Tạo error response format chuẩn
  static error(message: string = 'Error occurred', errors?: string[]): {
    success: false;
    message: string;
    data: null;
    errors?: string[];
  } {
    const response: any = {
      success: false,
      message,
      data: null
    };

    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    return response;
  }

  // Tạo paginated response
  static paginated<T>(
    data: T[], 
    pagination: PaginationResult, 
    message: string = 'Data retrieved successfully'
  ) {
    return {
      success: true,
      message,
      data,
      pagination
    };
  }
}

export class DateUtils {
  // Format date thành ISO string
  static toISOString(date: Date = new Date()): string {
    return date.toISOString();
  }

  // Parse date string thành Date object
  static parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date;
  }

  // Kiểm tra date có hợp lệ không
  static isValidDate(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  // Thêm days vào date
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Thêm months vào date
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  // Format date thành YYYY-MM-DD
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Kiểm tra date có phải hôm nay không
  static isToday(date: Date): boolean {
    const today = new Date();
    return this.formatDate(date) === this.formatDate(today);
  }

  // Tính số ngày giữa 2 dates
  static daysBetween(date1: Date, date2: Date): number {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

export class StringUtils {
  // Chuyển string thành slug (URL-friendly)
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }

  // Capitalize first letter
  static capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Generate random string
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Truncate text với ellipsis
  static truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number (basic)
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
}