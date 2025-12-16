/**
 * Admin Controller
 * Handles admin-specific operations
 */

const { prisma } = require('../lib/prisma.js');
const notificationService = require('../services/notification.service.js');
const rateLimitService = require('../services/rate-limit.service.js');

class AdminController {
  /**
   * Get all room change requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRoomChangeRequests(req, res) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      // Build where clause
      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [requests, totalCount] = await Promise.all([
        prisma.roomChangeRequest.findMany({
          where: whereClause,
          include: {
            schedule: {
              include: {
                gym_class: true,
                room: true,
                trainer: true,
              },
            },
            trainer: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.roomChangeRequest.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        message: 'Room change requests retrieved successfully',
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get room change requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách yêu cầu đổi phòng',
        data: null,
      });
    }
  }

  /**
   * Approve room change request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async approveRoomChange(req, res) {
    try {
      const { id } = req.params;
      const { admin_notes, new_room_id } = req.body;

      // Get the request
      const request = await prisma.roomChangeRequest.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              gym_class: true,
              room: true,
              trainer: true,
              bookings: {
                where: { status: 'CONFIRMED' },
              },
            },
          },
          trainer: true,
        },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu đổi phòng',
          data: null,
        });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Yêu cầu đã được xử lý',
          data: null,
        });
      }

      // Determine new room
      let targetRoomId = new_room_id || request.requested_room_id;

      if (!targetRoomId) {
        // Find a room with larger capacity
        const currentRoom = await prisma.room.findUnique({
          where: { id: request.current_room_id },
        });

        const largerRoom = await prisma.room.findFirst({
          where: {
            capacity: { gt: currentRoom.capacity },
            status: 'AVAILABLE',
          },
          orderBy: { capacity: 'asc' },
        });

        if (!largerRoom) {
          return res.status(400).json({
            success: false,
            message: 'Không tìm thấy phòng có sức chứa lớn hơn',
            data: null,
          });
        }

        targetRoomId = largerRoom.id;
      }

      // Check if new room is available at the schedule time
      const roomConflict = await prisma.schedule.findFirst({
        where: {
          room_id: targetRoomId,
          id: { not: request.schedule_id },
          start_time: { lt: request.schedule.end_time },
          end_time: { gt: request.schedule.start_time },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
      });

      if (roomConflict) {
        return res.status(400).json({
          success: false,
          message: 'Phòng mới đã được sử dụng trong khung giờ này',
          data: null,
        });
      }

      // Update the schedule with new room
      const updatedSchedule = await prisma.schedule.update({
        where: { id: request.schedule_id },
        data: { room_id: targetRoomId },
        include: {
          gym_class: true,
          room: true,
          trainer: true,
        },
      });

      // Update the request status
      const updatedRequest = await prisma.roomChangeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          admin_notes,
          requested_room_id: targetRoomId,
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              room: true,
              trainer: true,
            },
          },
          trainer: true,
        },
      });

      // Notify all booked members about room change
      for (const booking of request.schedule.bookings) {
        try {
          await notificationService.sendNotification({
            type: 'ROOM_CHANGED',
            member_id: booking.member_id,
            schedule_id: request.schedule_id,
            data: {
              class_name: request.schedule.gym_class.name,
              trainer_name: request.trainer.full_name,
              old_room: request.schedule.room.name,
              new_room: updatedSchedule.room.name,
              start_time: request.schedule.start_time,
            },
          });
        } catch (notificationError) {
          console.error('Send room change notification error:', notificationError);
        }
      }

      res.json({
        success: true,
        message: 'Yêu cầu đổi phòng đã được chấp thuận',
        data: {
          request: updatedRequest,
          updated_schedule: updatedSchedule,
          notified_members: request.schedule.bookings.length,
        },
      });
    } catch (error) {
      console.error('Approve room change error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi chấp thuận yêu cầu đổi phòng',
        data: null,
      });
    }
  }

  /**
   * Reject room change request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async rejectRoomChange(req, res) {
    try {
      const { id } = req.params;
      const { admin_notes } = req.body;

      if (!admin_notes) {
        return res.status(400).json({
          success: false,
          message: 'Lý do từ chối là bắt buộc',
          data: null,
        });
      }

      // Get the request
      const request = await prisma.roomChangeRequest.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
            },
          },
          trainer: true,
        },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy yêu cầu đổi phòng',
          data: null,
        });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Yêu cầu đã được xử lý',
          data: null,
        });
      }

      // Update the request status
      const updatedRequest = await prisma.roomChangeRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          admin_notes,
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              room: true,
              trainer: true,
            },
          },
          trainer: true,
        },
      });

      // Notify trainer about rejection
      try {
        await notificationService.sendNotification({
          type: 'ROOM_CHANGE_REJECTED',
          member_id: request.trainer.user_id, // Assuming trainer has user_id
          schedule_id: request.schedule_id,
          data: {
            class_name: request.schedule.gym_class.name,
            start_time: request.schedule.start_time,
            rejection_reason: admin_notes,
          },
        });
      } catch (notificationError) {
        console.error('Send rejection notification error:', notificationError);
      }

      res.json({
        success: true,
        message: 'Yêu cầu đổi phòng đã bị từ chối',
        data: { request: updatedRequest },
      });
    } catch (error) {
      console.error('Reject room change error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi từ chối yêu cầu đổi phòng',
        data: null,
      });
    }
  }

  /**
   * Get admin dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDashboardStats(req, res) {
    try {
      const { from, to } = req.query;

      // Build date filter
      const dateFilter = {};
      if (from) {
        dateFilter.gte = new Date(from);
      }
      if (to) {
        dateFilter.lte = new Date(to);
      }

      const [
        totalSchedules,
        totalBookings,
        totalTrainers,
        totalRooms,
        pendingRoomRequests,
        completedSchedules,
        cancelledSchedules,
        totalRevenue,
      ] = await Promise.all([
        prisma.schedule.count({
          where: Object.keys(dateFilter).length > 0 ? { start_time: dateFilter } : {},
        }),
        prisma.booking.count({
          where:
            Object.keys(dateFilter).length > 0
              ? {
                  schedule: { start_time: dateFilter },
                }
              : {},
        }),
        prisma.trainer.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count({ where: { status: 'AVAILABLE' } }),
        prisma.roomChangeRequest.count({ where: { status: 'PENDING' } }),
        prisma.schedule.count({
          where: {
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 && { start_time: dateFilter }),
          },
        }),
        prisma.schedule.count({
          where: {
            status: 'CANCELLED',
            ...(Object.keys(dateFilter).length > 0 && { start_time: dateFilter }),
          },
        }),
        // Calculate total revenue from completed schedules
        prisma.schedule.aggregate({
          where: {
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 && { start_time: dateFilter }),
          },
          _sum: {
            price_override: true,
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          period: {
            from: from || 'All time',
            to: to || 'All time',
          },
          stats: {
            total_schedules: totalSchedules,
            total_bookings: totalBookings,
            total_trainers: totalTrainers,
            total_rooms: totalRooms,
            pending_room_requests: pendingRoomRequests,
            completed_schedules: completedSchedules,
            cancelled_schedules: cancelledSchedules,
            total_revenue: totalRevenue._sum.price_override || 0,
            completion_rate: totalSchedules > 0 ? (completedSchedules / totalSchedules) * 100 : 0,
            cancellation_rate: totalSchedules > 0 ? (cancelledSchedules / totalSchedules) * 100 : 0,
          },
        },
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy thống kê dashboard',
        data: null,
      });
    }
  }

  /**
   * Reset rate limit for a specific user and operation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetRateLimit(req, res) {
    try {
      const { user_id } = req.params;
      const { operation = 'create_schedule' } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null,
        });
      }

      const reset = rateLimitService.resetRateLimit(user_id, operation);

      if (reset) {
        res.json({
          success: true,
          message: `Rate limit đã được reset cho user ${user_id}, operation: ${operation}`,
          data: {
            user_id,
            operation,
            reset: true,
          },
        });
      } else {
        res.json({
          success: true,
          message: `Không tìm thấy rate limit để reset cho user ${user_id}, operation: ${operation}`,
          data: {
            user_id,
            operation,
            reset: false,
          },
        });
      }
    } catch (error) {
      console.error('Reset rate limit error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi reset rate limit',
        data: null,
      });
    }
  }

  /**
   * Reset all rate limits for a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetUserRateLimits(req, res) {
    try {
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          data: null,
        });
      }

      const count = rateLimitService.resetUserRateLimits(user_id);

      res.json({
        success: true,
        message: `Đã reset ${count} rate limit(s) cho user ${user_id}`,
        data: {
          user_id,
          count,
        },
      });
    } catch (error) {
      console.error('Reset user rate limits error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi reset rate limits',
        data: null,
      });
    }
  }

  /**
   * Get class attendance analytics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getClassAttendanceData(req, res) {
    try {
      const { from, to } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Get all classes
      const classes = await prisma.gymClass.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Get schedules with attendance in the date range
      const schedules = await prisma.schedule.findMany({
        where: {
          start_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          start_time: true,
          class_id: true,
          gym_class: {
            select: {
              id: true,
              name: true,
            },
          },
          attendance: {
            where: {
              checked_in_at: { not: null },
            },
            select: {
              id: true,
              checked_in_at: true,
            },
          },
        },
        orderBy: {
          start_time: 'asc',
        },
      });

      // Group attendance by class and date
      const attendanceByClass = {};
      const dateSet = new Set();

      classes.forEach(cls => {
        attendanceByClass[cls.id] = {
          className: cls.name,
          attendance: {},
        };
      });

      schedules.forEach(schedule => {
        const dateKey = schedule.start_time.toISOString().split('T')[0];
        dateSet.add(dateKey);

        const classId = schedule.class_id;
        if (!attendanceByClass[classId]) {
          attendanceByClass[classId] = {
            className: schedule.gym_class?.name || 'Unknown',
            attendance: {},
          };
        }

        if (!attendanceByClass[classId].attendance[dateKey]) {
          attendanceByClass[classId].attendance[dateKey] = 0;
        }

        attendanceByClass[classId].attendance[dateKey] += schedule.attendance.length;
      });

      // Convert to arrays
      const dates = Array.from(dateSet).sort();
      const classNames = classes.map(cls => cls.name);
      const attendance = classes.map(cls => {
        return dates.map(date => {
          return attendanceByClass[cls.id]?.attendance[date] || 0;
        });
      });

      res.json({
        success: true,
        message: 'Class attendance data retrieved successfully',
        data: {
          classNames,
          attendance,
          dates,
        },
      });
    } catch (error) {
      console.error('Get class attendance data error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy dữ liệu tham gia lớp học',
        data: null,
      });
    }
  }

  /**
   * Reset all rate limits (use with caution)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetAllRateLimits(req, res) {
    try {
      const count = rateLimitService.resetAllRateLimits();

      res.json({
        success: true,
        message: `Đã reset tất cả ${count} rate limit(s)`,
        data: {
          count,
        },
      });
    } catch (error) {
      console.error('Reset all rate limits error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi reset tất cả rate limits',
        data: null,
      });
    }
  }

  /**
   * Handle subscription payment success notification
   * Called by billing service when a member successfully pays for a subscription plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async handleSubscriptionPaymentSuccess(req, res) {
    try {
      const {
        payment_id,
        member_id,
        user_id,
        amount,
        plan_type,
        plan_name,
        member_name,
        member_email,
      } = req.body;

      console.log(
        '[NOTIFY] [SUBSCRIPTION_PAYMENT] Received subscription payment success notification:',
        {
          payment_id,
          member_id,
          user_id,
          amount,
          plan_type,
          plan_name,
          member_name,
        }
      );

      // Validate required fields
      if (!payment_id || !member_id || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: payment_id, member_id, amount',
          data: null,
        });
      }

      // Get all admins and super admins
      const admins = await notificationService.getAdminsAndSuperAdmins();

      if (admins.length === 0) {
        console.log('[WARNING] [SUBSCRIPTION_PAYMENT] No admins found to notify');
        return res.json({
          success: true,
          message: 'No admins found to notify',
          data: { notified_count: 0 },
        });
      }

      console.log(
        `[LIST] [SUBSCRIPTION_PAYMENT] Found ${admins.length} admin/super-admin users to notify`
      );

      // Format amount for display
      const formattedAmount = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);

      // Create notifications for all admins
      const adminNotifications = admins.map(admin => ({
        user_id: admin.user_id,
        type: 'PAYMENT_SUCCESS',
        title: 'Thanh toán gói đăng ký thành công',
        message: `${member_name || 'Hội viên'} đã thanh toán ${formattedAmount} cho gói ${
          plan_name || plan_type || 'đăng ký'
        }`,
        data: {
          payment_id,
          member_id,
          user_id: user_id || member_id,
          amount: parseFloat(amount),
          plan_type,
          plan_name,
          member_name,
          member_email,
          payment_status: 'COMPLETED',
          role: 'MEMBER', // Role indicates who performed the action
        },
        is_read: false,
        created_at: new Date(),
      }));

      // Save notifications to database and emit socket events
      if (adminNotifications.length > 0) {
        console.log(
          `💾 [SUBSCRIPTION_PAYMENT] Saving ${adminNotifications.length} notifications to database...`
        );

        // Create notifications in identity service
        const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls.js');
        const axios = require('axios');

        const createdNotifications = [];
        for (const notificationData of adminNotifications) {
          try {
            const response = await axios.post(
              `${IDENTITY_SERVICE_URL}/notifications`,
              {
                user_id: notificationData.user_id,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                data: notificationData.data,
              },
              { timeout: 5000 }
            );
            if (response.data.success) {
              createdNotifications.push(response.data.data.notification);
            }
          } catch (error) {
            console.error(
              `[ERROR] [SUBSCRIPTION_PAYMENT] Failed to create notification for user ${notificationData.user_id}:`,
              error.message
            );
          }
        }

        console.log(
          `[SUCCESS] [SUBSCRIPTION_PAYMENT] Created ${createdNotifications.length} notifications in identity service`
        );

        // Emit socket events to all admins
        if (global.io) {
          console.log(
            `[EMIT] [SUBSCRIPTION_PAYMENT] Emitting socket events to ${createdNotifications.length} admin(s)...`
          );
          createdNotifications.forEach(notification => {
            const roomName = `user:${notification.user_id}`;
            const socketPayload = {
              notification_id: notification.id,
              payment_id,
              member_id,
              user_id: user_id || member_id,
              amount: parseFloat(amount),
              plan_type,
              plan_name,
              member_name,
              member_email,
              payment_status: 'COMPLETED',
              title: notification.title,
              message: notification.message,
              type: notification.type,
              created_at: notification.created_at,
            };

            global.io.to(roomName).emit('subscription:payment:success', socketPayload);
            console.log(
              `[SUCCESS] [SUBSCRIPTION_PAYMENT] Socket event subscription:payment:success emitted to ${roomName}`
            );

            // Also emit general notification:new event for compatibility
            global.io.to(roomName).emit('notification:new', {
              notification_id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: socketPayload,
              created_at: notification.created_at,
              is_read: false,
            });
          });
          console.log(
            `[SUCCESS] [SUBSCRIPTION_PAYMENT] All socket events emitted successfully to admins`
          );
        } else {
          console.warn(
            '[WARNING] [SUBSCRIPTION_PAYMENT] global.io not available - notifications saved to database only'
          );
        }
      }

      res.json({
        success: true,
        message: 'Admins notified about subscription payment success',
        data: {
          notified_count: createdNotifications.length,
          total_admins: admins.length,
        },
      });
    } catch (error) {
      console.error(
        '[ERROR] [SUBSCRIPTION_PAYMENT] Error handling subscription payment success notification:',
        error
      );
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi thông báo cho admin về thanh toán thành công',
        data: null,
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
}

module.exports = new AdminController();
