/**
 * Utility functions for normalizing data
 */

/**
 * Normalize empty string to null
 * TC-EDGE-004: Handle empty string vs null consistently
 * @param {any} value - Value to normalize
 * @returns {any} null if value is empty string, otherwise returns value
 */
function normalizeEmptyString(value) {
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
 * @param {Record<string, any>} obj - Object to normalize
 * @returns {Record<string, any>} Normalized object
 */
function normalizeObject(obj) {
  const normalized = {};
  for (const [key, value] of Object.entries(obj)) {
    normalized[key] = normalizeEmptyString(value);
  }
  return normalized;
}

/**
 * Normalize array of values
 * @param {any[]} arr - Array to normalize
 * @returns {any[]} Normalized array
 */
function normalizeArray(arr) {
  return arr.map(item => {
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      return normalizeObject(item);
    }
    return normalizeEmptyString(item);
  });
}

module.exports = {
  normalizeEmptyString,
  normalizeObject,
  normalizeArray,
};


