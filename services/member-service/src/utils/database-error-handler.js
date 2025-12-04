/**
 * Helper function to handle database errors consistently
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {string} context - Context description for logging
 * @returns {Object|null} - Response object if error was handled, null otherwise
 */
function handleDatabaseError(error, res, context = 'Operation') {
  console.error(`[ERROR] ${context} error:`, error);

  // Handle max clients error (Railway/Supabase Session mode limit)
  if (
    error.message?.includes('MaxClientsInSessionMode') ||
    error.message?.includes('max clients reached') ||
    error.message?.includes('pool_size')
  ) {
    console.error('[ERROR] Database connection pool exhausted:', error.message);
    console.log('[INFO] Returning 503 Service Unavailable response');
    return res.status(503).json({
      success: false,
      message: 'Database connection pool is full. Please try again in a moment.',
      error: 'DATABASE_POOL_EXHAUSTED',
      data: null,
    });
  }

  // Handle database connection errors (P1001: Can't reach database server)
  if (error.code === 'P1001' || error.message?.includes("Can't reach database server")) {
    console.error('[ERROR] Database connection failed:', error.message);
    console.log('[INFO] Returning 503 Service Unavailable response');
    return res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable. Please try again later.',
      error: 'DATABASE_CONNECTION_ERROR',
      data: null,
    });
  }

  // Handle timeout errors
  if (
    error.code === 'P1008' ||
    error.code === 'P1014' ||
    error.message?.includes('timeout') ||
    error.message?.includes('timed out') ||
    error.message?.includes('Operation timed out')
  ) {
    console.error('[ERROR] Database operation timed out:', error.message);
    console.log('[INFO] Returning 504 Gateway Timeout response');
    return res.status(504).json({
      success: false,
      message:
        'Database operation timed out. The request took too long to complete. Please try again.',
      error: 'DATABASE_TIMEOUT_ERROR',
      data: null,
    });
  }

  // Handle other Prisma errors
  if (error.code?.startsWith('P')) {
    console.error('[ERROR] Prisma error:', error.code, error.message);
    return res.status(500).json({
      success: false,
      message: 'Database query failed. Please try again later.',
      error: 'DATABASE_ERROR',
      data: null,
    });
  }

  // Return null if error was not a database error (caller should handle it)
  return null;
}

module.exports = { handleDatabaseError };
