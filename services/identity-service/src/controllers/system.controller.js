const { prisma } = require('../lib/prisma.js');
const redisService = require('../services/redis.service.js');

class SystemController {
  /**
   * Get system statistics (Admin only)
   */
  async getSystemStats(req, res) {
    try {
      // Check Redis cache first (cache for 5 minutes)
      const cacheKey = 'system:stats';
      let cachedStats = null;

      try {
        if (redisService.isConnected && redisService.client) {
          const cached = await redisService.client.get(cacheKey);
          if (cached) {
            cachedStats = JSON.parse(cached);
            // Return cached if less than 5 minutes old
            const cacheAge = Date.now() - cachedStats.cached_at;
            if (cacheAge < 5 * 60 * 1000) {
              return res.json({
                success: true,
                message: 'System statistics retrieved successfully',
                data: {
                  ...cachedStats,
                  cached: true,
                },
              });
            }
          }
        }
      } catch (cacheError) {
        console.warn('[WARNING] Cache read error (continuing with fresh data):', cacheError.message);
      }

      // Query real data from database
      const [totalUsers, activeUsers, totalSessions] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { is_active: true } }),
        prisma.session.count(),
      ]);

      const uptime = redisService.getUptime();

      const stats = {
        totalUsers,
        activeUsers,
        totalSessions,
        systemUptime: uptime.formatted,
        systemUptimeSeconds: uptime.seconds,
        lastUpdated: new Date(),
        cached_at: Date.now(),
      };

      // Cache the result
      try {
        if (redisService.isConnected && redisService.client) {
          await redisService.client.setEx(cacheKey, 5 * 60, JSON.stringify(stats));
        }
      } catch (cacheError) {
        console.warn('[WARNING] Cache write error:', cacheError.message);
      }

      res.json({
        success: true,
        message: 'System statistics retrieved successfully',
        data: {
          ...stats,
          cached: false,
        },
      });
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Enable maintenance mode (Super Admin only)
   */
  async enableMaintenanceMode(req, res) {
    try {
      const { reason, estimatedDuration } = req.body;
      const userId = req.user.userId || req.user.id;

      const maintenanceData = await redisService.setMaintenanceMode(
        true,
        reason,
        estimatedDuration
      );

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'MAINTENANCE_MODE_ENABLED',
            entity_type: 'System',
            details: {
              reason,
              estimatedDuration,
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
      }

      res.json({
        success: true,
        message: 'Maintenance mode đã được bật',
        data: maintenanceData,
      });
    } catch (error) {
      console.error('Enable maintenance mode error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Disable maintenance mode (Super Admin only)
   */
  async disableMaintenanceMode(req, res) {
    try {
      const userId = req.user.userId || req.user.id;

      const maintenanceData = await redisService.setMaintenanceMode(false);

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId,
            action: 'MAINTENANCE_MODE_DISABLED',
            entity_type: 'System',
            details: {},
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
          },
        });
      } catch (auditError) {
        console.error('[ERROR] Error creating audit log:', auditError);
      }

      res.json({
        success: true,
        message: 'Maintenance mode đã được tắt',
        data: maintenanceData,
      });
    } catch (error) {
      console.error('Disable maintenance mode error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get maintenance mode status
   */
  async getMaintenanceMode(req, res) {
    try {
      const maintenanceMode = await redisService.getMaintenanceMode();

      res.json({
        success: true,
        message: 'Maintenance mode status retrieved',
        data: maintenanceMode,
      });
    } catch (error) {
      console.error('Get maintenance mode error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Health check
   */
  async healthCheck(req, res) {
    const startTime = Date.now();
    const healthStatus = {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      services: {},
      latency: {},
    };

    try {
      // Check database connection
      try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;
        healthStatus.services.database = 'UP';
        healthStatus.latency.database = `${dbLatency}ms`;
      } catch (dbError) {
        healthStatus.services.database = 'DOWN';
        healthStatus.status = 'UNHEALTHY';
        healthStatus.latency.database = 'N/A';
        console.error('[ERROR] Database health check failed:', dbError.message);
      }

      // Check Redis connection
      try {
        const redisStart = Date.now();
        const redisPing = await redisService.ping();
        const redisLatency = Date.now() - redisStart;
        healthStatus.services.redis = redisPing ? 'UP' : 'DOWN';
        healthStatus.latency.redis = redisPing ? `${redisLatency}ms` : 'N/A';
        if (!redisPing) {
          healthStatus.status = 'DEGRADED'; // Redis down is not critical
        }
      } catch (redisError) {
        healthStatus.services.redis = 'DOWN';
        healthStatus.latency.redis = 'N/A';
        // Redis is optional, so don't mark as unhealthy
        console.warn('[WARNING] Redis health check failed:', redisError.message);
      }

      // Check external services (Member Service, Schedule Service, Billing Service)
      const externalServices = {
        member: process.env.MEMBER_SERVICE_URL,
        schedule: process.env.SCHEDULE_SERVICE_URL,
        billing: process.env.BILLING_SERVICE_URL,
      };

      const axios = require('axios');
      for (const [serviceName, serviceUrl] of Object.entries(externalServices)) {
        if (!serviceUrl) {
          healthStatus.services[serviceName] = 'NOT_CONFIGURED';
          continue;
        }

        try {
          const serviceStart = Date.now();
          const response = await axios.get(`${serviceUrl}/health`, {
            timeout: 3000,
          });
          const serviceLatency = Date.now() - serviceStart;
          healthStatus.services[serviceName] =
            response.data?.success || response.status === 200 ? 'UP' : 'DOWN';
          healthStatus.latency[serviceName] = `${serviceLatency}ms`;
        } catch (serviceError) {
          healthStatus.services[serviceName] = 'DOWN';
          healthStatus.latency[serviceName] = 'N/A';
          healthStatus.status = 'DEGRADED';
          console.warn(`[WARNING] ${serviceName} service health check failed:`, serviceError.message);
        }
      }

      const totalLatency = Date.now() - startTime;
      healthStatus.latency.total = `${totalLatency}ms`;

      const statusCode = healthStatus.status === 'HEALTHY' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status === 'HEALTHY',
        message: `System is ${healthStatus.status.toLowerCase()}`,
        data: healthStatus,
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'System is unhealthy',
        data: {
          status: 'UNHEALTHY',
          timestamp: new Date().toISOString(),
          error: error.message,
          services: healthStatus.services,
        },
      });
    }
  }
}

module.exports = { SystemController };
