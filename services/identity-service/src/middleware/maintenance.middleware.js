const redisService = require('../services/redis.service.js');

/**
 * Middleware to check maintenance mode
 * Should be applied to all routes except health check
 */
async function checkMaintenanceMode(req, res, next) {
  try {
    // Skip maintenance check for health endpoints
    if (req.path === '/health' || req.path === '/health-check' || req.path.startsWith('/system/health')) {
      return next();
    }

    const maintenanceMode = await redisService.getMaintenanceMode();

    if (maintenanceMode.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Hệ thống đang bảo trì',
        data: {
          maintenance: true,
          reason: maintenanceMode.reason,
          estimatedDuration: maintenanceMode.estimatedDuration,
          enabledAt: maintenanceMode.enabledAt,
        },
      });
    }

    next();
  } catch (error) {
    console.error('[ERROR] Error checking maintenance mode:', error);
    // Fail open - allow requests if check fails
    next();
  }
}

module.exports = { checkMaintenanceMode };

