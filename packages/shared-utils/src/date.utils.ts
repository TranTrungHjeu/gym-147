import { addMonths, differenceInDays, format, isValid, parseISO } from 'date-fns';

/**
 * Format date to standard string
 */
export function formatDate(date: Date | string, pattern: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, pattern) : '';
}

/**
 * Format date to display format
 */
export function formatDisplayDate(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy');
}

/**
 * Format datetime to display format
 */
export function formatDisplayDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date | null {
  const parsed = parseISO(dateString);
  return isValid(parsed) ? parsed : null;
}

/**
 * Check if date is valid
 */
export function isValidDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
}

/**
 * Add months to date
 */
export function addMonthsToDate(date: Date | string, months: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addMonths(dateObj, months);
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start);
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isExpiringSoon(endDate: Date | string, daysThreshold: number = 7): boolean {
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  const today = new Date();
  const daysDiff = differenceInDays(end, today);
  return daysDiff <= daysThreshold && daysDiff >= 0;
}

/**
 * Get age from date of birth
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const birth = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  const today = new Date();
  const daysDiff = differenceInDays(today, birth);
  return Math.floor(daysDiff / 365);
}
