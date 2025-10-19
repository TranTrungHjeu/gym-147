const autoStatusUpdateService = require('../services/auto-status-update.service.js');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Controller for auto-update functionality
 */
class AutoUpdateController {
  /**
   * Manually trigger auto-update
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async triggerAutoUpdate(req, res) {
    try {
      const result = await autoStatusUpdateService.runAutoUpdate();
      
      res.json({
        success: true,
        message: 'Auto-update completed successfully',
        data: result,
      });
    } catch (error) {
      console.error('Trigger auto-update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get status statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStatusStats(req, res) {
    try {
      const stats = await autoStatusUpdateService.getStatusStats();
      
      res.json({
        success: true,
        message: 'Status statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      console.error('Get status stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get schedules that need status update
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSchedulesNeedingUpdate(req, res) {
    try {
      const schedules = await autoStatusUpdateService.getSchedulesNeedingUpdate();
      
      res.json({
        success: true,
        message: 'Schedules needing update retrieved successfully',
        data: schedules,
      });
    } catch (error) {
      console.error('Get schedules needing update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update specific schedule status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateScheduleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, POSTPONED',
          data: null,
        });
      }

      const schedule = await prisma.schedule.update({
        where: { id },
        data: { status },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      res.json({
        success: true,
        message: 'Schedule status updated successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Update schedule status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new AutoUpdateController();
