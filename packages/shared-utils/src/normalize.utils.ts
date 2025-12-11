/**
 * Utility functions for normalizing data
 */

/**
 * Normalize empty string to null
 * TC-EDGE-004: Handle empty string vs null consistently
 * @param value - Value to normalize
 * @returns null if value is empty string, otherwise returns value
 */
export function normalizeEmptyString(value: any): any {
  if (value === '') {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  return value;
}

/**
 * Normalize object by converting empty strings to null
 * @param obj - Object to normalize
 * @returns Normalized object
 */
export function normalizeObject(obj: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    normalized[key] = normalizeEmptyString(value);
  }
  return normalized;
}

/**
 * Normalize array of values
 * @param arr - Array to normalize
 * @returns Normalized array
 */
export function normalizeArray(arr: any[]): any[] {
  return arr.map(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return normalizeObject(item);
    }
    return normalizeEmptyString(item);
  });
}


