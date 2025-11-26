/**
 * Global Error Handler for React Native
 * Catches unhandled JavaScript errors and logs them
 */

import { ErrorUtils } from 'react-native';

// Store original error handler
const originalHandler = ErrorUtils.getGlobalHandler();

// Enhanced error handler
const errorHandler = (error, isFatal) => {
  console.error('🚨 GLOBAL ERROR HANDLER:', {
    message: error.message,
    stack: error.stack,
    isFatal,
    timestamp: new Date().toISOString(),
    name: error.name,
  });

  // Log to console with full details
  if (__DEV__) {
    console.error('=== CRASH DETAILS ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Is Fatal:', isFatal);
    console.error('Stack Trace:', error.stack);
    console.error('Timestamp:', new Date().toISOString());
    console.error('===================');
  }

  // Call original handler
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
};

// Set global error handler
ErrorUtils.setGlobalHandler(errorHandler);

// Handle unhandled promise rejections (React Native)
if (typeof global !== 'undefined' && typeof global.addEventListener === 'function') {
  // React Native doesn't have onunhandledrejection, use different approach
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const firstArg = args[0];
    if (firstArg && typeof firstArg === 'string') {
      if (firstArg.includes('Unhandled promise rejection') || 
          firstArg.includes('Uncaught')) {
        console.error('🚨 UNHANDLED PROMISE REJECTION DETECTED:', args);
      }
    }
    originalConsoleError.apply(console, args);
  };
}

export default errorHandler;

