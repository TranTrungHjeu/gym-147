const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');
const waitlistService = require('../services/waitlist.service.js');

const toMemberMap = members =>
  members.reduce((acc, member) => {
    if (member?.user_id) {
      acc[member.user_id] = member;
    }
    if (member?.id) {
      acc[member.id] = member;
    }
    return acc;
  }, {});

const attachMemberDetails = async (bookings, { strict = false } = {}) => {
  const memberIds = [...new Set(bookings.map(booking => booking.member_id).filter(Boolean))];

  if (memberIds.length === 0) {
    return bookings.map(booking => ({ ...booking, member: null }));
  }

  try {
    const members = await memberService.getMembersByIds(memberIds);
    const memberMap = toMemberMap(members);

    return bookings.map(booking => ({
      ...booking,
      member: memberMap[booking.member_id] || null,
    }));
  } catch (error) {
    console.error('BookingController:attachMemberDetails error:', error.message);

    if (strict) {
      throw error;
    }

    return bookings.map(booking => ({ ...booking, member: null }));
  }
};

class BookingController {
  async getAllBookings(req, res) {
    try {
      const { member_id } = req.query; // Filter by member if provided

      const whereClause = member_id ? { member_id } : {};

      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
        orderBy: { booked_at: 'desc' },
      });

      const bookingsWithMembers = await attachMemberDetails(bookings);

      res.json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: { bookings: bookingsWithMembers },
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      const [bookingWithMember] = await attachMemberDetails([booking]);

      res.json({
        success: true,
        message: 'Booking retrieved successfully',
        data: { booking: bookingWithMember },
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createBooking(req, res) {
    try {
      const { schedule_id, member_id, special_needs, notes } = req.body;

      if (!schedule_id || !member_id) {
        return res.status(400).json({
          success: false,
          message: 'schedule_id và member_id là bắt buộc',
          data: null,
        });
      }

      // Check if schedule exists and has capacity
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null,
        });
      }

      if (!['SCHEDULED', 'IN_PROGRESS'].includes((schedule.status || '').toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch không còn hoạt động',
          data: null,
        });
      }

      if (new Date(schedule.end_time) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch đã kết thúc',
          data: null,
        });
      }

      // Check if schedule is full - if so, add to waitlist
      if (schedule.current_bookings >= schedule.max_capacity) {
        try {
          const waitlistResult = await waitlistService.addToWaitlist(
            schedule_id,
            member_id,
            special_needs,
            notes
          );

          return res.status(201).json({
            success: true,
            message: `Lớp học đã đầy. Bạn đã được thêm vào danh sách chờ ở vị trí ${waitlistResult.waitlist_position}`,
            data: {
              booking: waitlistResult.booking,
              waitlist_position: waitlistResult.waitlist_position,
              is_waitlist: true,
            },
          });
        } catch (waitlistError) {
          console.error('Add to waitlist error:', waitlistError);
          return res.status(400).json({
            success: false,
            message: waitlistError.message || 'Không thể thêm vào danh sách chờ',
            data: null,
          });
        }
      }

      // Check if member already booked this schedule
      const existingBooking = await prisma.booking.findUnique({
        where: {
          schedule_id_member_id: {
            schedule_id,
            member_id,
          },
        },
      });

      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: 'You have already booked this schedule',
          data: null,
        });
      }

      // Validate member existence via member service
      let member;
      try {
        member = await memberService.getMemberById(member_id);
      } catch (memberError) {
        console.error('Create booking member lookup error:', memberError.message);
        return res.status(503).json({
          success: false,
          message: 'Không thể xác minh thông tin hội viên, vui lòng thử lại sau',
          data: null,
        });
      }

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member không tồn tại',
          data: null,
        });
      }

      const booking = await prisma.booking.create({
        data: {
          schedule_id,
          member_id,
          special_needs,
          notes,
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      const [bookingWithMember] = await attachMemberDetails([booking], { strict: false });

      if (bookingWithMember && member) {
        bookingWithMember.member = member;
      }

      // Update schedule current_bookings
      await prisma.schedule.update({
        where: { id: schedule_id },
        data: {
          current_bookings: {
            increment: 1,
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: { booking: bookingWithMember },
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      if (booking.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled',
          data: null,
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancellation_reason,
        },
      });

      const [bookingWithMember] = await attachMemberDetails([
        { ...updatedBooking, schedule: booking.schedule },
      ]);

      if (bookingWithMember) {
        bookingWithMember.schedule = booking.schedule;
      }

      // Update schedule current_bookings
      await prisma.schedule.update({
        where: { id: booking.schedule_id },
        data: {
          current_bookings:
            booking.schedule.current_bookings && booking.schedule.current_bookings > 0
              ? {
                  decrement: 1,
                }
              : undefined,
        },
      });

      // Try to promote someone from waitlist
      let promotedMember = null;
      try {
        const promotionResult = await waitlistService.promoteFromWaitlist(booking.schedule_id);
        if (promotionResult) {
          promotedMember = promotionResult.booking;
        }
      } catch (promotionError) {
        console.error('Auto-promote from waitlist error:', promotionError);
        // Don't fail the cancellation if promotion fails
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          booking: bookingWithMember || updatedBooking,
          promoted_member: promotedMember
            ? {
                member_id: promotedMember.member_id,
                message: 'Member promoted from waitlist',
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getScheduleBookings(req, res) {
    try {
      const { id } = req.params;

      const bookings = await prisma.booking.findMany({
        where: { schedule_id: id },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
        orderBy: { booked_at: 'desc' },
      });

      const bookingsWithMembers = await attachMemberDetails(bookings);

      res.json({
        success: true,
        message: 'Schedule bookings retrieved successfully',
        data: { bookings: bookingsWithMembers },
      });
    } catch (error) {
      console.error('Get schedule bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get waitlist for a specific schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWaitlistBySchedule(req, res) {
    try {
      const { schedule_id } = req.params;

      const waitlist = await waitlistService.getWaitlistBySchedule(schedule_id);
      const waitlistWithMembers = await attachMemberDetails(waitlist);

      res.json({
        success: true,
        message: 'Waitlist retrieved successfully',
        data: { waitlist: waitlistWithMembers },
      });
    } catch (error) {
      console.error('Get waitlist by schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Remove member from waitlist
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeFromWaitlist(req, res) {
    try {
      const { id } = req.params;

      const result = await waitlistService.removeFromWaitlist(id);

      res.json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      console.error('Remove from waitlist error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Manually promote member from waitlist (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async promoteFromWaitlist(req, res) {
    try {
      const { id } = req.params; // booking id

      // First check if this is a waitlist booking
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      if (!booking.is_waitlist) {
        return res.status(400).json({
          success: false,
          message: 'Booking is not in waitlist',
          data: null,
        });
      }

      // Check if schedule has capacity
      const hasCapacity = await waitlistService.hasCapacity(booking.schedule_id);
      if (!hasCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Schedule is still at full capacity',
          data: null,
        });
      }

      // Promote the specific member
      const result = await waitlistService.promoteFromWaitlist(booking.schedule_id);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'No one available to promote from waitlist',
          data: null,
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: { booking: result.booking },
      });
    } catch (error) {
      console.error('Promote from waitlist error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member booking history with filters and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMemberBookings(req, res) {
    try {
      const { member_id } = req.params;
      const { status, from, to, page = 1, limit = 10, include_waitlist = false } = req.query;

      // Build where clause
      const whereClause = { member_id };

      if (status) {
        whereClause.status = status;
      }

      if (from || to) {
        whereClause.schedule = {
          date: {},
        };
        if (from) {
          whereClause.schedule.date.gte = new Date(from);
        }
        if (to) {
          whereClause.schedule.date.lte = new Date(to);
        }
      }

      if (include_waitlist === 'false') {
        whereClause.is_waitlist = false;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [bookings, totalCount] = await Promise.all([
        prisma.booking.findMany({
          where: whereClause,
          include: {
            schedule: {
              include: {
                gym_class: true,
                trainer: true,
                room: true,
              },
            },
          },
          orderBy: { booked_at: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.booking.count({ where: whereClause }),
      ]);

      const bookingsWithMembers = await attachMemberDetails(bookings);

      res.json({
        success: true,
        message: 'Member bookings retrieved successfully',
        data: {
          bookings: bookingsWithMembers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get member bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new BookingController();
