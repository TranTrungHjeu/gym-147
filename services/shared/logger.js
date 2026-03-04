const SENSITIVE_KEYWORDS = [
  'token',
  'authorization',
  'cookie',
  'password',
  'secret',
  'otp',
  'apiKey',
  'api_key',
  'refresh',
  'session',
  'bearer',
  'signature',
  'phone',
  'email',
];

const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_LENGTH = 20;
const MAX_OBJECT_KEYS = 25;

function isSensitiveKey(key) {
  if (!key) return false;
  const normalized = String(key).toLowerCase();
  return SENSITIVE_KEYWORDS.some(keyword => normalized.includes(keyword.toLowerCase()));
}

function maskString(input) {
  if (typeof input !== 'string') return input;

  let output = input;

  output = output.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]');
  output = output.replace(
    /\b[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\b/g,
    '[REDACTED_JWT]'
  );
  output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  output = output.replace(/(\+?\d[\d\s.-]{7,}\d)/g, '[REDACTED_PHONE]');

  if (output.length > MAX_STRING_LENGTH) {
    return `${output.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED_STRING]`;
  }

  return output;
}

function sanitizeValue(value, depth = 0, visited = new WeakSet()) {
  if (depth > 3) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return maskString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: maskString(value.message),
      code: value.code,
    };
  }

  if (Array.isArray(value)) {
    const trimmed = value
      .slice(0, MAX_ARRAY_LENGTH)
      .map(item => sanitizeValue(item, depth + 1, visited));
    if (value.length > MAX_ARRAY_LENGTH) {
      trimmed.push(`[TRUNCATED_ARRAY:${value.length - MAX_ARRAY_LENGTH}]`);
    }
    return trimmed;
  }

  if (typeof value === 'object') {
    if (visited.has(value)) return '[CIRCULAR]';
    visited.add(value);

    const output = {};
    const entries = Object.entries(value);
    const limitedEntries = entries.slice(0, MAX_OBJECT_KEYS);

    for (const [key, nestedValue] of limitedEntries) {
      if (isSensitiveKey(key)) {
        output[key] = '[REDACTED]';
      } else {
        output[key] = sanitizeValue(nestedValue, depth + 1, visited);
      }
    }

    if (entries.length > MAX_OBJECT_KEYS) {
      output.__truncatedKeys = entries.length - MAX_OBJECT_KEYS;
    }

    return output;
  }

  return value;
}

function patchConsoleWithPrefix(method, prefix) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    const first = args[0];
    if (typeof first === 'string' && first.startsWith(prefix)) {
      original(...args.map(arg => sanitizeValue(arg)));
      return;
    }
    original(prefix, ...args.map(arg => sanitizeValue(arg)));
  };
}

function patchConsoleSanitizer(method) {
  const original = console[method].bind(console);
  console[method] = (...args) => {
    original(...args.map(arg => sanitizeValue(arg)));
  };
}

function setupSecureLogging() {
  if (global.__GYM147_LOGGER_PATCHED__) {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    console.log = () => undefined;
    console.info = () => undefined;
    console.debug = () => undefined;
  } else {
    patchConsoleSanitizer('log');
    patchConsoleSanitizer('info');
    patchConsoleSanitizer('debug');
  }

  patchConsoleWithPrefix('warn', '[WARN]');
  patchConsoleWithPrefix('error', '[ERROR]');

  global.__GYM147_LOGGER_PATCHED__ = true;
}

module.exports = {
  setupSecureLogging,
};
