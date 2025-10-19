const { prisma } = require('../lib/prisma.js');

class UtilityController {
  async checkHealth(req, res) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        message: 'Schedule service is healthy',
        data: {
          status: 'operational',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service unavailable',
        data: null,
      });
    }
  }

  async getStats(req, res) {
    try {
      const [totalClasses, totalTrainers, totalRooms, totalSchedules, totalBookings] =
        await Promise.all([
          prisma.gymClass.count(),
          prisma.trainer.count(),
          prisma.room.count(),
          prisma.schedule.count(),
          prisma.booking.count(),
        ]);

      res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          totalClasses,
          totalTrainers,
          totalRooms,
          totalSchedules,
          totalBookings,
        },
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createSampleData(req, res) {
    try {
      // This method can be used to create sample data if needed
      res.json({
        success: true,
        message: 'Sample data creation not implemented - use seed script instead',
        data: null,
      });
    } catch (error) {
      console.error('Create sample data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new UtilityController();
