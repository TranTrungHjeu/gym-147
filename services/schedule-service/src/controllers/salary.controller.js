const { prisma } = require('../lib/prisma');
const { SalaryService } = require('../services/salary.service');
const notificationService = require('../services/notification.service');
const axios = require('axios');
const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls');

const salaryService = new SalaryService();

class SalaryController {
  /**
   * Trainer gửi yêu cầu xét lương
   * Tạo notification gửi đến tất cả admin/super admin
   */
  async createSalaryRequest(req, res) {
    try {
      const { trainer_id } = req.body;
      const user_id = req.user?.id || req.body.user_id; // From auth middleware or body

      if (!trainer_id) {
        return res.status(400).json({
          success: false,
          message: 'trainer_id is required',
          data: null,
        });
      }

      // Get trainer info
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainer_id },
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          hourly_rate: true,
        },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Check if trainer already has salary
      if (trainer.hourly_rate) {
        return res.status(400).json({
          success: false,
          message: 'Trainer already has salary set',
          data: null,
        });
      }

      // Get all admins and super admins
      const admins = await notificationService.getAdminsAndSuperAdmins();

      if (admins.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No admins found to send request',
          data: null,
        });
      }

      // Create notifications for all admins
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'SALARY_REQUEST',
        title: 'Yêu cầu xét lương',
        message: `${trainer.full_name} đã gửi yêu cầu xét lương`,
        data: {
          trainer_id: trainer.id,
          trainer_user_id: trainer.user_id,
          trainer_name: trainer.full_name,
          trainer_email: trainer.email,
          requested_at: new Date().toISOString(),
          role: 'TRAINER',
          action_route: `/management/trainers?trainer_id=${trainer.id}&action=set_salary`,
        },
        is_read: false,
        created_at: new Date(),
      }));

      // Create notifications in identity service
      const createdNotifications = [];
      for (const notificationData of notifications) {
        try {
          const created = await notificationService.createNotificationInIdentityService(
            notificationData
          );
          if (created) {
            createdNotifications.push(created);
          }
        } catch (error) {
          console.error(
            `[ERROR] Failed to create notification for user ${notificationData.user_id}:`,
            error.message
          );
        }
      }

      // Emit socket events for real-time notifications
      if (global.io && createdNotifications.length > 0) {
        for (const notification of createdNotifications) {
          if (notification && notification.id) {
            const roomName = `user:${notification.user_id}`;
            const socketPayload = {
              notification_id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              created_at: notification.created_at,
              is_read: notification.is_read,
            };
            try {
              global.io.to(roomName).emit('notification:new', socketPayload);
              global.io.to('admin').emit('notification:new', socketPayload);
            } catch (emitError) {
              console.error(`[ERROR] Error emitting notification:new to ${roomName}:`, emitError);
            }
          }
        }
      }

      res.json({
        success: true,
        message: 'Salary request sent successfully',
        data: {
          trainer_id: trainer.id,
          notifications_sent: createdNotifications.length,
        },
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.createSalaryRequest:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Admin xem danh sách yêu cầu xét lương (từ notifications)
   */
  async getAllSalaryRequests(req, res) {
    try {
      const { status, trainer_id, page = 1, limit = 20 } = req.query;

      // Get notifications from identity service
      const params = {
        type: 'SALARY_REQUEST',
        page: parseInt(page),
        limit: parseInt(limit),
      };

      if (trainer_id) {
        params.trainer_id = trainer_id;
      }

      // Call identity service to get notifications
      const response = await axios.get(`${IDENTITY_SERVICE_URL}/notifications`, {
        params,
        timeout: 10000,
      });

      if (!response.data.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch salary requests',
          data: null,
        });
      }

      // Filter by status if provided (from notification data)
      let notifications = response.data.data.notifications || [];
      if (status) {
        // Status would be in notification data if we track it
        // For now, all SALARY_REQUEST notifications are considered pending
      }

      res.json({
        success: true,
        message: 'Salary requests retrieved successfully',
        data: {
          requests: notifications,
          pagination: response.data.data.pagination || {
            page: parseInt(page),
            limit: parseInt(limit),
            total: notifications.length,
            pages: Math.ceil(notifications.length / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.getAllSalaryRequests:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Admin cài đặt lương cho trainer
   */
  async setTrainerSalary(req, res) {
    try {
      const { trainer_id } = req.params;
      const { hourly_rate, notes } = req.body;
      const admin_user_id = req.user?.id; // From auth middleware

      if (!trainer_id || !hourly_rate) {
        return res.status(400).json({
          success: false,
          message: 'trainer_id and hourly_rate are required',
          data: null,
        });
      }

      const hourlyRate = parseFloat(hourly_rate);
      if (isNaN(hourlyRate) || hourlyRate <= 0) {
        return res.status(400).json({
          success: false,
          message: 'hourly_rate must be a positive number',
          data: null,
        });
      }

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { id: trainer_id },
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          hourly_rate: true,
        },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Update trainer hourly_rate
      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainer_id },
        data: {
          hourly_rate: hourlyRate,
        },
        select: {
          id: true,
          full_name: true,
          email: true,
          hourly_rate: true,
        },
      });

      // Send notification to trainer
      await notificationService.createNotificationInIdentityService({
        user_id: trainer.user_id,
        type: 'SALARY_SET',
        title: 'Lương đã được cài đặt',
        message: `Lương của bạn đã được cài đặt: ${hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ`,
        data: {
          trainer_id: trainer.id,
          hourly_rate: hourlyRate,
          set_by: admin_user_id,
          set_at: new Date().toISOString(),
          role: 'ADMIN',
        },
      });

      // Emit socket event to trainer
      if (global.io) {
        const roomName = `user:${trainer.user_id}`;
        const socketPayload = {
          type: 'SALARY_SET',
          title: 'Lương đã được cài đặt',
          message: `Lương của bạn đã được cài đặt: ${hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ`,
          data: {
            trainer_id: trainer.id,
            hourly_rate: hourlyRate,
          },
        };
        try {
          global.io.to(roomName).emit('notification:new', socketPayload);
        } catch (emitError) {
          console.error(`[ERROR] Error emitting notification:new to ${roomName}:`, emitError);
        }
      }

      res.json({
        success: true,
        message: 'Trainer salary set successfully',
        data: {
          trainer: updatedTrainer,
        },
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.setTrainerSalary:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Check salary status for a trainer
   */
  async getTrainerSalaryStatus(req, res) {
    try {
      const { trainer_id } = req.params;
      const user_id = req.query.user_id; // Optional: check by user_id

      let trainer;
      if (user_id) {
        trainer = await prisma.trainer.findFirst({
          where: { user_id },
          select: {
            id: true,
            hourly_rate: true,
          },
        });
      } else {
        trainer = await prisma.trainer.findUnique({
          where: { id: trainer_id },
          select: {
            id: true,
            hourly_rate: true,
          },
        });
      }

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Salary status retrieved successfully',
        data: {
          trainer_id: trainer.id,
          hasSalary: trainer.hourly_rate !== null && trainer.hourly_rate !== undefined,
          hourly_rate: trainer.hourly_rate ? Number(trainer.hourly_rate) : null,
        },
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.getTrainerSalaryStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get salary statistics for a specific trainer
   */
  async getTrainerSalaryStatistics(req, res) {
    try {
      const { trainer_id } = req.params;
      const { month, year } = req.query;

      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();

      if (targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12',
          data: null,
        });
      }

      const statistics = await salaryService.getTrainerSalaryStatistics(
        trainer_id,
        targetMonth,
        targetYear
      );

      res.json({
        success: true,
        message: 'Trainer salary statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.getTrainerSalaryStatistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get current trainer's salary statistics (by user_id from token)
   * Trainer can only view their own salary
   */
  async getMySalaryStatistics(req, res) {
    try {
      const user_id = req.user?.id;
      if (!user_id) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized - User ID not found in token',
          data: null,
        });
      }

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
        },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found for this user',
          data: null,
        });
      }

      const { month, year } = req.query;
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();

      if (targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12',
          data: null,
        });
      }

      const statistics = await salaryService.getTrainerSalaryStatistics(
        trainer.id,
        targetMonth,
        targetYear
      );

      res.json({
        success: true,
        message: 'Trainer salary statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.getMySalaryStatistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get salary statistics for all trainers
   */
  async getAllTrainersSalaryStatistics(req, res) {
    try {
      const { month, year } = req.query;

      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();

      if (targetMonth < 1 || targetMonth > 12) {
        return res.status(400).json({
          success: false,
          message: 'Month must be between 1 and 12',
          data: null,
        });
      }

      const statistics = await salaryService.getAllTrainersSalaryStatistics(
        targetMonth,
        targetYear
      );

      res.json({
        success: true,
        message: 'All trainers salary statistics retrieved successfully',
        data: {
          month: targetMonth,
          year: targetYear,
          statistics,
        },
      });
    } catch (error) {
      console.error('[ERROR] SalaryController.getAllTrainersSalaryStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new SalaryController();

