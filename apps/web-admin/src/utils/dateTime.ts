/**
 * DateTime utility functions
 * Converts database datetime to Vietnam timezone (Asia/Ho_Chi_Minh)
 */

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Convert a date string or Date object to Vietnam timezone
 * @param date - Date string or Date object
 * @returns Date object in Vietnam timezone
 */
export function toVietnamTime(date: string | Date | null | undefined): Date {
  if (!date) {
    return new Date();
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return new Date();
  }

  // Get the date string in Vietnam timezone
  const vietnamDateStr = dateObj.toLocaleString('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the formatted string back to Date
  // Format: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = vietnamDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');

  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds || '0')
  );
}

/**
 * Format date to Vietnam timezone string
 * @param date - Date string or Date object
 * @param format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted date string
 */
export function formatVietnamDateTime(
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'date' | 'time' | 'datetime' = 'datetime'
): string {
  if (!date) {
    return '';
  }

  const vietnamDate = toVietnamTime(date);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: VIETNAM_TIMEZONE,
  };

  switch (format) {
    case 'short':
      return vietnamDate.toLocaleDateString('vi-VN', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    case 'long':
      return vietnamDate.toLocaleDateString('vi-VN', {
        ...options,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    case 'date':
      return vietnamDate.toLocaleDateString('vi-VN', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    case 'time':
      return vietnamDate.toLocaleTimeString('vi-VN', {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    case 'datetime':
    default:
      return vietnamDate.toLocaleString('vi-VN', {
        ...options,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
  }
}

/**
 * Format date relative to now (e.g., "2 hours ago", "3 days ago")
 * @param date - Date string or Date object
 * @returns Relative time string in Vietnamese
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return '';
  }

  const vietnamDate = toVietnamTime(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - vietnamDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Vừa xong';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} phút trước`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} giờ trước`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ngày trước`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} tháng trước`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} năm trước`;
}

/**
 * Get start and end of day in Vietnam timezone
 * @param date - Date string or Date object (optional, defaults to today)
 * @returns Object with start and end of day
 */
export function getVietnamDayRange(date?: string | Date): { start: Date; end: Date } {
  const targetDate = date ? toVietnamTime(date) : new Date();
  
  const start = new Date(targetDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(targetDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get start and end of month in Vietnam timezone
 * @param date - Date string or Date object (optional, defaults to current month)
 * @returns Object with start and end of month
 */
export function getVietnamMonthRange(date?: string | Date): { start: Date; end: Date } {
  const targetDate = date ? toVietnamTime(date) : new Date();
  
  const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Format date for API (YYYY-MM-DD)
 * @param date - Date string or Date object
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateForAPI(date: string | Date | null | undefined): string {
  if (!date) {
    return '';
  }

  const vietnamDate = toVietnamTime(date);
  const year = vietnamDate.getFullYear();
  const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
  const day = String(vietnamDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format datetime for API (YYYY-MM-DDTHH:mm:ss)
 * @param date - Date string or Date object
 * @returns Formatted datetime string (YYYY-MM-DDTHH:mm:ss)
 */
export function formatDateTimeForAPI(date: string | Date | null | undefined): string {
  if (!date) {
    return '';
  }

  const vietnamDate = toVietnamTime(date);
  const year = vietnamDate.getFullYear();
  const month = String(vietnamDate.getMonth() + 1).padStart(2, '0');
  const day = String(vietnamDate.getDate()).padStart(2, '0');
  const hours = String(vietnamDate.getHours()).padStart(2, '0');
  const minutes = String(vietnamDate.getMinutes()).padStart(2, '0');
  const seconds = String(vietnamDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}


