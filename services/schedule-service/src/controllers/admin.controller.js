/**
 * Admin Controller
 * Handles admin-specific operations
 */

const { prisma } = require('../lib/prisma.js');
const notificationService = require('../services/notification.service.js');

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
          where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {},
        }),
        prisma.booking.count({
          where:
            Object.keys(dateFilter).length > 0
              ? {
                  schedule: { date: dateFilter },
                }
              : {},
        }),
        prisma.trainer.count({ where: { status: 'ACTIVE' } }),
        prisma.room.count({ where: { status: 'AVAILABLE' } }),
        prisma.roomChangeRequest.count({ where: { status: 'PENDING' } }),
        prisma.schedule.count({
          where: {
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
        }),
        prisma.schedule.count({
          where: {
            status: 'CANCELLED',
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
        }),
        // Calculate total revenue from completed schedules
        prisma.schedule.aggregate({
          where: {
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
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
}

module.exports = new AdminController();
