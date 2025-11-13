/**
 * Utility functions for phone number handling
 */

/**
 * Normalize Vietnamese phone number to +84 format
 * Converts various formats (0xxxxxxxxx, 84xxxxxxxxx, +84xxxxxxxxx) to +84xxxxxxxxx
 * 
 * @param phone - Phone number in any valid Vietnamese format
 * @returns Normalized phone number in +84 format, or empty string if invalid
 * 
 * @example
 * normalizePhoneNumber('0912345678') => '+84912345678'
 * normalizePhoneNumber('84912345678') => '+84912345678'
 * normalizePhoneNumber('+84912345678') => '+84912345678'
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove all spaces
  let normalized = phone.replace(/\s/g, '').trim();

  // Remove all non-digit characters except +
  normalized = normalized.replace(/[^\d+]/g, '');

  // Convert to +84 format
  if (normalized.startsWith('+84')) {
    // Already in +84 format
    return normalized;
  } else if (normalized.startsWith('84')) {
    // Convert 84xxxxxxxxx to +84xxxxxxxxx
    return '+' + normalized;
  } else if (normalized.startsWith('0')) {
    // Convert 0xxxxxxxxx to +84xxxxxxxxx
    return '+84' + normalized.substring(1);
  } else if (/^[1-9][0-9]{8}$/.test(normalized)) {
    // If it's 9 digits starting with 1-9, assume it's missing the 0 prefix
    return '+84' + normalized;
  }

  // Return empty string if format is not recognized
  return '';
}

/**
 * Validate Vietnamese phone number format
 * Accepts: +84xxxxxxxxx, 84xxxxxxxxx, 0xxxxxxxxx (where x is 9 digits starting with 1-9)
 * 
 * @param phone - Phone number to validate
 * @returns true if phone number is in valid Vietnamese format
 */
export function isValidVietnamesePhone(phone: string): boolean {
  if (!phone) return false;

  const phoneRegex = /^(\+84|84|0)[1-9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format phone number for display
 * Converts +84912345678 to +84 912 345 678
 * 
 * @param phone - Phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return phone;

  // Format: +84 912 345 678
  if (normalized.startsWith('+84')) {
    const number = normalized.substring(3); // Remove +84
    if (number.length === 9) {
      return `+84 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
    }
  }

  return normalized;
}

