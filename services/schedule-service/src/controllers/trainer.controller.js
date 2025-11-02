const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');
const databaseCertificationService = require('../services/database-certification.service.js');
const PriceMappingService = require('../services/price-mapping.service.js');
const rateLimitService = require('../services/rate-limit.service.js');
const waitlistService = require('../services/waitlist.service.js');
const notificationService = require('../services/notification.service.js');

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

const hydrateBookingsWithMembers = async bookings => {
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
    console.error('TrainerController:hydrateBookingsWithMembers error:', error.message);
    return bookings.map(booking => ({ ...booking, member: null }));
  }
};

const hydrateAttendanceWithMembers = async attendanceRecords => {
  const memberIds = [...new Set(attendanceRecords.map(record => record.member_id).filter(Boolean))];

  if (memberIds.length === 0) {
    return attendanceRecords.map(record => ({ ...record, member: null }));
  }

  try {
    const members = await memberService.getMembersByIds(memberIds);
    const memberMap = toMemberMap(members);

    return attendanceRecords.map(record => ({
      ...record,
      member: memberMap[record.member_id] || null,
    }));
  } catch (error) {
    console.error('TrainerController:hydrateAttendanceWithMembers error:', error.message);
    return attendanceRecords.map(record => ({ ...record, member: null }));
  }
};

class TrainerController {
  async getAllTrainers(req, res) {
    try {
      const { user_id } = req.query; // Filter by user_id if provided

      const whereClause = user_id ? { user_id } : {};

      const trainers = await prisma.trainer.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Trainers retrieved successfully',
        data: { trainers },
      });
    } catch (error) {
      console.error('Get trainers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getTrainerById(req, res) {
    try {
      const { id } = req.params;
      const trainer = await prisma.trainer.findUnique({
        where: { id },
        include: {
          schedules: {
            include: {
              gym_class: true,
              room: true,
            },
          },
        },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Trainer retrieved successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('Get trainer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getTrainerByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
        include: {
          schedules: {
            include: {
              gym_class: true,
              room: true,
            },
          },
        },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Trainer retrieved successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('Get trainer by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createTrainer(req, res) {
    try {
      const {
        user_id,
        full_name,
        phone,
        email,
        specializations,
        bio,
        experience_years,
        hourly_rate,
        profile_photo,
      } = req.body;

      const trainer = await prisma.trainer.create({
        data: {
          user_id,
          full_name,
          phone,
          email,
          specializations: specializations || [],
          bio,
          experience_years: parseInt(experience_years) || 0,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
          profile_photo,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('Create trainer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async updateTrainer(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        phone,
        email,
        specializations,
        bio,
        experience_years,
        hourly_rate,
        profile_photo,
        status,
      } = req.body;

      const trainer = await prisma.trainer.update({
        where: { id },
        data: {
          full_name,
          phone,
          email,
          specializations: specializations || [],
          bio,
          experience_years: experience_years ? parseInt(experience_years) : undefined,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : undefined,
          profile_photo,
          status,
        },
      });

      res.json({
        success: true,
        message: 'Trainer updated successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('Update trainer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async updateTrainerByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const {
        full_name,
        phone,
        email,
        specializations,
        bio,
        experience_years,
        hourly_rate,
        profile_photo,
        status,
      } = req.body;

      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          full_name,
          phone,
          email,
          specializations: specializations || [],
          bio,
          experience_years: experience_years ? parseInt(experience_years) : undefined,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : undefined,
          profile_photo,
          status,
        },
      });

      res.json({
        success: true,
        message: 'Trainer updated successfully',
        data: { trainer: updatedTrainer },
      });
    } catch (error) {
      console.error('Update trainer by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteTrainer(req, res) {
    try {
      const { id } = req.params;

      await prisma.trainer.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Trainer deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete trainer error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteTrainerByUserId(req, res) {
    try {
      const { user_id } = req.params;

      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      await prisma.trainer.delete({
        where: { id: trainer.id },
      });

      res.json({
        success: true,
        message: 'Trainer deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete trainer by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getTrainerStats(req, res) {
    try {
      const { user_id } = req.params;

      // Find trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get current date for filtering
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get trainer's schedules
      const schedules = await prisma.schedule.findMany({
        where: { trainer_id: trainer.id },
        include: {
          bookings: true,
          attendance: true,
        },
      });

      // Calculate stats
      const totalClasses = schedules.length;
      const completedSessions = schedules.filter(s => s.status === 'completed').length;
      const upcomingClasses = schedules.filter(
        s => s.status === 'scheduled' && new Date(s.date) >= now
      ).length;

      // Get unique students from bookings
      const allBookings = schedules.flatMap(s => s.bookings);
      const uniqueStudents = new Set(allBookings.map(b => b.member_id)).size;

      // Calculate monthly revenue (from completed sessions this month)
      const monthlySchedules = schedules.filter(
        s =>
          s.status === 'completed' &&
          new Date(s.date) >= startOfMonth &&
          new Date(s.date) <= endOfMonth
      );
      const monthlyRevenue = monthlySchedules.reduce((sum, s) => {
        const classPrice = s.price_override || 0; // Assuming price_override is the class price
        const bookingsCount = s.bookings.length;
        return sum + classPrice * bookingsCount;
      }, 0);

      // Calculate average rating (mock for now, as we don't have rating system)
      const rating = 4.8;

      // Mock achievements and goals
      const achievements = Math.floor(completedSessions / 10); // 1 achievement per 10 completed sessions
      const goalsCompleted = Math.floor(completedSessions / 5); // 1 goal per 5 completed sessions

      res.json({
        success: true,
        message: 'Trainer stats retrieved successfully',
        data: {
          totalClasses,
          totalStudents: uniqueStudents,
          rating,
          completedSessions,
          upcomingClasses,
          monthlyRevenue,
          achievements,
          goalsCompleted,
        },
      });
    } catch (error) {
      console.error('Get trainer stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer classes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerClasses(req, res) {
    try {
      const { user_id } = req.params;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get unique classes that this trainer teaches
      const schedules = await prisma.schedule.findMany({
        where: { trainer_id: trainer.id },
        include: {
          gym_class: true,
        },
        distinct: ['class_id'],
      });

      const classes = schedules.map(s => s.gym_class).filter(Boolean);

      res.json({
        success: true,
        message: 'Trainer classes retrieved successfully',
        data: {
          classes,
        },
      });
    } catch (error) {
      console.error('Get trainer classes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer schedule list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerScheduleList(req, res) {
    try {
      const { user_id } = req.params;
      const { date, viewMode = 'week' } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Calculate date range based on view mode
      let startDate, endDate;
      const baseDate = date ? new Date(date) : new Date();

      if (viewMode === 'day') {
        startDate = new Date(baseDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        const dayOfWeek = baseDate.getDay();
        startDate = new Date(baseDate);
        startDate.setDate(baseDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // month
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const schedules = await prisma.schedule.findMany({
        where: {
          trainer_id: trainer.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          gym_class: true,
          room: true,
          bookings: true,
          attendance: true,
        },
        orderBy: {
          start_time: 'asc',
        },
      });

      const bookings = schedules.flatMap(schedule =>
        schedule.bookings.map(booking => ({ ...booking, schedule_id: schedule.id }))
      );
      const attendance = schedules.flatMap(schedule =>
        schedule.attendance.map(record => ({ ...record, schedule_id: schedule.id }))
      );

      const hydratedBookings = await hydrateBookingsWithMembers(bookings);
      const hydratedAttendance = await hydrateAttendanceWithMembers(attendance);

      const memberMap = toMemberMap(hydratedBookings);
      const attendanceMemberMap = toMemberMap(hydratedAttendance);

      const schedulesWithMembers = schedules.map(schedule => ({
        ...schedule,
        bookings: schedule.bookings.map(booking => ({
          ...booking,
          member: memberMap[booking.member_id] || null,
        })),
        attendance: schedule.attendance.map(record => ({
          ...record,
          member: attendanceMemberMap[record.member_id] || null,
        })),
      }));

      res.json({
        success: true,
        message: 'Trainer schedule retrieved successfully',
        data: {
          schedules: schedulesWithMembers,
        },
      });
    } catch (error) {
      console.error('Get trainer schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer attendance records
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerAttendance(req, res) {
    try {
      const { user_id } = req.params;
      const { date } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get schedules for this trainer
      const whereClause = { trainer_id: trainer.id };
      if (date) {
        whereClause.date = new Date(date);
      }

      const schedules = await prisma.schedule.findMany({
        where: whereClause,
        include: {
          gym_class: true,
          attendance: true,
        },
      });

      // Flatten attendance records
      const attendanceRecords = schedules.flatMap(schedule =>
        schedule.attendance.map(record => ({
          ...record,
          class_name: schedule.gym_class?.name || 'Unknown Class',
          class_date: schedule.date,
          class_time: schedule.start_time,
        }))
      );

      const hydratedAttendance = await hydrateAttendanceWithMembers(attendanceRecords);

      res.json({
        success: true,
        message: 'Trainer attendance retrieved successfully',
        data: {
          attendanceRecords: hydratedAttendance.map(record => ({
            id: record.id,
            schedule_id: record.schedule_id,
            class_name: record.class_name,
            class_date: record.class_date,
            class_time: record.class_time,
            member_name: record.member?.full_name || 'Unknown Member',
            member_email: record.member?.email || 'unknown@example.com',
            checked_in_at: record.checked_in_at,
            checked_out_at: record.checked_out_at,
            attendance_method: record.attendance_method,
            class_rating: record.class_rating,
            trainer_rating: record.trainer_rating,
            feedback_notes: record.feedback_notes,
          })),
        },
      });
    } catch (error) {
      console.error('Get trainer attendance error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer bookings list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerBookingsList(req, res) {
    try {
      const { user_id } = req.params;
      const { status, date } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get schedules for this trainer
      const whereClause = { trainer_id: trainer.id };
      if (date) {
        whereClause.date = new Date(date);
      }

      const schedules = await prisma.schedule.findMany({
        where: whereClause,
        include: {
          gym_class: true,
          room: true,
          bookings: {
            where: status ? { status } : {},
          },
        },
      });

      // Flatten booking records
      const bookings = schedules.flatMap(schedule =>
        schedule.bookings.map(booking => ({
          ...booking,
          class_name: schedule.gym_class?.name || 'Unknown Class',
          class_date: schedule.date,
          class_time: schedule.start_time,
          room_name: schedule.room?.name || 'Unknown Room',
        }))
      );

      const hydratedBookings = await hydrateBookingsWithMembers(bookings);

      res.json({
        success: true,
        message: 'Trainer bookings retrieved successfully',
        data: {
          bookings: hydratedBookings.map(booking => ({
            id: booking.id,
            schedule_id: booking.schedule_id,
            class_name: booking.class_name,
            class_date: booking.class_date,
            class_time: booking.class_time,
            room_name: booking.room_name,
            member_name: booking.member?.full_name || 'Unknown Member',
            member_email: booking.member?.email || 'unknown@example.com',
            status: booking.status,
            booked_at: booking.booked_at,
            cancelled_at: booking.cancelled_at,
            notes: booking.notes,
          })),
        },
      });
    } catch (error) {
      console.error('Get trainer bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer reviews list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerReviewsList(req, res) {
    try {
      const { user_id } = req.params;
      const { rating } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get schedules for this trainer
      const schedules = await prisma.schedule.findMany({
        where: { trainer_id: trainer.id },
        include: {
          gym_class: true,
          attendance: {
            where: {
              trainer_rating: rating ? parseInt(rating) : undefined,
              feedback_notes: { not: null },
            },
          },
        },
      });

      // Flatten review records
      const reviews = schedules.flatMap(schedule =>
        schedule.attendance
          .filter(attendance => attendance.feedback_notes)
          .map(attendance => ({
            ...attendance,
            schedule_id: schedule.id,
            class_name: schedule.gym_class?.name || 'Unknown Class',
            class_date: schedule.date,
          }))
      );

      const hydratedReviews = await hydrateAttendanceWithMembers(reviews);

      res.json({
        success: true,
        message: 'Trainer reviews retrieved successfully',
        data: {
          reviews: hydratedReviews.map(review => ({
            id: review.id,
            schedule_id: review.schedule_id,
            class_name: review.class_name,
            class_date: review.class_date,
            member_name: review.member?.full_name || 'Unknown Member',
            member_email: review.member?.email || 'unknown@example.com',
            rating: review.trainer_rating,
            feedback: review.feedback_notes,
            is_public: true,
            created_at: review.created_at,
          })),
        },
      });
    } catch (error) {
      console.error('Get trainer reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer ratings list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerRatings(req, res) {
    try {
      const { user_id } = req.params;
      const { rating } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get schedules for this trainer
      const schedules = await prisma.schedule.findMany({
        where: { trainer_id: trainer.id },
        include: {
          gym_class: true,
          attendance: {
            where: {
              trainer_rating: rating ? parseInt(rating) : undefined,
              feedback_notes: { not: null },
            },
          },
        },
      });

      // Flatten rating records
      const ratings = schedules.flatMap(schedule =>
        schedule.attendance
          .filter(attendance => attendance.trainer_rating)
          .map(attendance => ({
            ...attendance,
            schedule_id: schedule.id,
            class_name: schedule.gym_class?.name || 'Unknown Class',
            class_date: schedule.date,
          }))
      );

      const hydratedRatings = await hydrateAttendanceWithMembers(ratings);

      // Calculate stats
      const allRatings = hydratedRatings.map(r => r.trainer_rating).filter(r => r);
      const averageRating =
        allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      const ratingDistribution = allRatings.reduce((acc, rating) => {
        acc[rating] = (acc[rating] || 0) + 1;
        return acc;
      }, {});

      const stats = {
        average_rating: averageRating,
        total_ratings: allRatings.length,
        rating_distribution: ratingDistribution,
        recent_ratings: hydratedRatings.slice(0, 5),
      };

      res.json({
        success: true,
        message: 'Trainer ratings retrieved successfully',
        data: {
          ratings: hydratedRatings.map(rating => ({
            id: rating.id,
            schedule_id: rating.schedule_id,
            class_name: rating.class_name,
            class_date: rating.class_date,
            member_name: rating.member?.full_name || 'Unknown Member',
            member_email: rating.member?.email || 'unknown@example.com',
            rating: rating.trainer_rating,
            comment: rating.feedback_notes,
            is_public: true,
            created_at: rating.created_at,
          })),
          stats,
        },
      });
    } catch (error) {
      console.error('Get trainer ratings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get trainer feedback list
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerFeedback(req, res) {
    try {
      const { user_id } = req.params;
      const { status, type } = req.query;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get schedules for this trainer
      const schedules = await prisma.schedule.findMany({
        where: { trainer_id: trainer.id },
        include: {
          gym_class: true,
          attendance: {
            where: {
              feedback_notes: { not: null },
            },
          },
        },
      });

      // Flatten feedback records
      const feedbacks = schedules.flatMap(schedule =>
        schedule.attendance
          .filter(attendance => attendance.feedback_notes)
          .map(attendance => ({
            ...attendance,
            schedule_id: schedule.id,
            class_name: schedule.gym_class?.name || 'Unknown Class',
            class_date: schedule.date,
            feedback_type: 'GENERAL', // Default type
            subject: 'Feedback về lớp học',
            status: 'PENDING', // Default status
          }))
      );

      const hydratedFeedbacks = await hydrateAttendanceWithMembers(feedbacks);

      // Filter by status and type if provided
      let filteredFeedbacks = hydratedFeedbacks;
      if (status) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.status === status);
      }
      if (type) {
        filteredFeedbacks = filteredFeedbacks.filter(f => f.feedback_type === type);
      }

      res.json({
        success: true,
        message: 'Trainer feedback retrieved successfully',
        data: filteredFeedbacks.map(feedback => ({
          id: feedback.id,
          member_name: feedback.member?.full_name || 'Unknown Member',
          member_email: feedback.member?.email || 'unknown@example.com',
          class_name: feedback.class_name,
          schedule_date: feedback.class_date,
          feedback_type: feedback.feedback_type,
          subject: feedback.subject,
          message: feedback.feedback_notes,
          status: feedback.status,
          created_at: feedback.created_at,
        })),
      });
    } catch (error) {
      console.error('Get trainer feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Create a new schedule for trainer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createTrainerSchedule(req, res) {
    try {
      const { user_id } = req.params;

      // Sanitize input data
      const {
        category: rawCategory,
        difficulty: rawDifficulty,
        class_name: rawClassName,
        description: rawDescription,
        date: rawDate,
        start_time: rawStartTime,
        end_time: rawEndTime,
        room_id: rawRoomId,
        max_capacity: rawMaxCapacity,
        special_notes: rawSpecialNotes,
      } = req.body;

      const category = rawCategory?.trim().toUpperCase();
      const difficulty = rawDifficulty?.trim().toUpperCase();
      const class_name = rawClassName?.trim().substring(0, 100);
      const description = rawDescription?.trim().substring(0, 500) || null;
      const date = rawDate?.trim();
      const start_time = rawStartTime?.trim();
      const end_time = rawEndTime?.trim();
      const room_id = rawRoomId?.trim();
      const max_capacity = parseInt(rawMaxCapacity) || 20;
      const special_notes = rawSpecialNotes?.trim().substring(0, 200) || null;

      // Check rate limit (only check, don't increment yet)
      if (!rateLimitService.canPerformOperation(user_id, 'create_schedule', 10, 24 * 60 * 60 * 1000)) {
        const rateLimitInfo = rateLimitService.getRateLimitInfo(user_id, 'create_schedule');
        return res.status(429).json({
          success: false,
          message: 'Bạn đã tạo quá nhiều lịch dạy hôm nay (tối đa 10 lịch/ngày)',
          data: {
            limit: rateLimitInfo.limit,
            count: rateLimitInfo.count,
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime,
          },
        });
      }

      // Validate required fields
      if (
        !category ||
        !difficulty ||
        !class_name ||
        !date ||
        !start_time ||
        !end_time ||
        !room_id ||
        !max_capacity
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Thiếu thông tin bắt buộc. Vui lòng điền đầy đủ các trường: category, difficulty, class_name, date, start_time, end_time, room_id, max_capacity',
          data: null,
        });
      }

      // Get trainer by user_id
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Validate certification - Direct database query instead of function
      const certification = await prisma.trainerCertification.findFirst({
        where: {
          trainer_id: trainer.id,
          category: category,
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        orderBy: { certification_level: 'desc' },
        select: {
          certification_level: true,
          certification_name: true,
          expiration_date: true,
        },
      });

      if (!certification) {
        return res.status(403).json({
          success: false,
          message: `Bạn chưa có chứng chỉ VERIFIED cho môn ${category}`,
          data: {
            currentLevel: null,
            requiredLevel: difficulty,
          },
        });
      }

      // Check if certification level is sufficient
      const canTeachLevel = (trainerLevel, requiredLevel) => {
        const levelMap = {
          BASIC: 1,
          INTERMEDIATE: 2,
          ADVANCED: 3,
          EXPERT: 4,
        };

        const trainerNum = levelMap[trainerLevel] || 0;
        const requiredNum = levelMap[requiredLevel] || 0;

        // EXPERT có thể dạy tất cả
        if (trainerLevel === 'EXPERT') return true;

        // ALL_LEVELS ai cũng dạy được
        if (requiredLevel === 'ALL_LEVELS') return true;

        // Cấp độ trainer >= cấp độ yêu cầu
        return trainerNum >= requiredNum;
      };

      if (!canTeachLevel(certification.certification_level, difficulty)) {
        return res.status(403).json({
          success: false,
          message: `Chứng chỉ ${certification.certification_level} không đủ để dạy lớp ${difficulty}. Vui lòng liên hệ admin để cập nhật chứng chỉ.`,
          data: {
            currentLevel: certification.certification_level,
            requiredLevel: difficulty,
            availableLevels: ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'],
          },
        });
      }

      // Parse and validate dates
      // Convert DD/MM/YYYY to YYYY-MM-DD for proper Date parsing
      const [day, month, year] = date.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const scheduleDate = new Date(isoDate);
      const startDateTime = new Date(start_time);
      const endDateTime = new Date(end_time);

      // Validate time logic
      if (startDateTime >= endDateTime) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
          data: null,
        });
      }

      // Validate class duration (minimum 30 minutes)
      const duration = endDateTime - startDateTime;
      const minDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
      const maxDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

      if (duration < minDuration) {
        return res.status(400).json({
          success: false,
          message: 'Thời lượng lớp học tối thiểu 30 phút',
          data: null,
        });
      }

      if (duration > maxDuration) {
        return res.status(400).json({
          success: false,
          message: 'Thời lượng lớp học tối đa 3 giờ',
          data: null,
        });
      }

      // Check if time is in the past
      if (startDateTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Không thể tạo lịch dạy trong quá khứ',
          data: null,
        });
      }

      // Check if time is at least 3 days in the future
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      if (startDateTime < threeDaysFromNow) {
        return res.status(400).json({
          success: false,
          message: 'Lịch dạy phải được tạo trước ít nhất 3 ngày để chuẩn bị',
          data: {
            earliestDate: threeDaysFromNow.toISOString(),
            requestedDate: startDateTime.toISOString(),
          },
        });
      }

      // Optimize: Run room check and conflict checks in parallel
      const [room, trainerConflict, roomConflict] = await Promise.all([
        // Check room availability
        prisma.room.findUnique({
          where: { id: room_id },
          select: { id: true, name: true, capacity: true, status: true },
        }),

        // Check schedule conflicts for trainer
        prisma.schedule.findFirst({
          where: {
            trainer_id: trainer.id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            OR: [
              {
                AND: [{ start_time: { lte: startDateTime } }, { end_time: { gt: startDateTime } }],
              },
              {
                AND: [{ start_time: { lt: endDateTime } }, { end_time: { gte: endDateTime } }],
              },
              {
                AND: [{ start_time: { gte: startDateTime } }, { end_time: { lte: endDateTime } }],
              },
            ],
          },
        }),

        // Check schedule conflicts for room
        prisma.schedule.findFirst({
          where: {
            room_id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            OR: [
              {
                AND: [{ start_time: { lte: startDateTime } }, { end_time: { gt: startDateTime } }],
              },
              {
                AND: [{ start_time: { lt: endDateTime } }, { end_time: { gte: endDateTime } }],
              },
              {
                AND: [{ start_time: { gte: startDateTime } }, { end_time: { lte: endDateTime } }],
              },
            ],
          },
        }),
      ]);

      // Validate room
      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phòng học',
          data: null,
        });
      }

      if (room.status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: 'Phòng học hiện không khả dụng',
          data: null,
        });
      }

      if (max_capacity > room.capacity) {
        return res.status(400).json({
          success: false,
          message: `Số lượng học viên không được vượt quá sức chứa của phòng (${room.capacity})`,
          data: null,
        });
      }

      // Check trainer conflict
      if (trainerConflict) {
        return res.status(409).json({
          success: false,
          message: 'Bạn đã có lịch dạy trùng giờ',
          data: {
            conflictSchedule: {
              id: trainerConflict.id,
              start_time: trainerConflict.start_time,
              end_time: trainerConflict.end_time,
            },
          },
        });
      }

      // Check room conflict
      if (roomConflict) {
        return res.status(409).json({
          success: false,
          message: 'Phòng đã được sử dụng trong khung giờ này',
          data: {
            conflictSchedule: {
              id: roomConflict.id,
              start_time: roomConflict.start_time,
              end_time: roomConflict.end_time,
            },
          },
        });
      }

      // Get or create gym class
      let gymClass = await prisma.gymClass.findFirst({
        where: {
          name: class_name,
          category,
          difficulty,
        },
      });

      if (!gymClass) {
        // Get price based on difficulty
        const price = PriceMappingService.getPriceByDifficulty(difficulty);

        // Map Difficulty to CertificationLevel
        // Difficulty: BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS
        // CertificationLevel: BASIC, INTERMEDIATE, ADVANCED, EXPERT
        // Note: EXPERT is required to teach ALL_LEVELS classes
        const difficultyToCertLevel = {
          BEGINNER: 'BASIC',
          INTERMEDIATE: 'INTERMEDIATE',
          ADVANCED: 'ADVANCED',
          ALL_LEVELS: 'EXPERT', // EXPERT is required to teach ALL_LEVELS
        };
        
        const requiredCertLevel = difficultyToCertLevel[difficulty] || 'BASIC';

        gymClass = await prisma.gymClass.create({
          data: {
            name: class_name,
            description: description || null,
            category,
            difficulty,
            price,
            duration: 60, // Default 60 minutes
            equipment_needed: [], // Required field in schema
            required_certification_level: requiredCertLevel, // Map difficulty to certification level
            is_active: true,
          },
        });
      }

      // Create schedule
      const schedule = await prisma.schedule.create({
        data: {
          trainer_id: trainer.id,
          class_id: gymClass.id,
          room_id,
          date: scheduleDate,
          start_time: startDateTime,
          end_time: endDateTime,
          max_capacity,
          current_bookings: 0,
          status: 'SCHEDULED',
          special_notes: special_notes || null,
        },
        include: {
          gym_class: true,
          room: true,
          trainer: {
            select: {
              id: true,
              full_name: true,
              user_id: true,
            },
          },
        },
      });


      // Increment rate limit counter ONLY after successful creation
      rateLimitService.incrementRateLimit(user_id, 'create_schedule', 24 * 60 * 60 * 1000);

      res.status(201).json({
        success: true,
        message: 'Tạo lịch dạy thành công',
        data: {
          id: schedule.id,
          class_name: schedule.gym_class.name,
          category: schedule.gym_class.category,
          difficulty: schedule.gym_class.difficulty,
          price: schedule.gym_class.price,
          trainer_name: schedule.trainer.full_name,
          room_name: schedule.room.name,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          max_capacity: schedule.max_capacity,
          current_bookings: schedule.current_bookings,
          status: schedule.status,
          special_notes: schedule.special_notes,
          created_at: schedule.created_at,
        },
      });
    } catch (error) {
      console.error('Create trainer schedule error:', error);

      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Lớp học với thông tin này đã tồn tại',
          data: null,
        });
      }

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu liên quan',
          data: null,
        });
      }

      if (error.name === 'PrismaClientValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không hợp lệ',
          data: { details: error.message },
        });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu tham chiếu không hợp lệ',
          data: null,
        });
      }

      // Generic error
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo lịch dạy',
        data: null,
      });
    }
  }

  /**
   * Get trainer certifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerCertifications(req, res) {
    try {
      const { user_id } = req.params;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get certifications
      const certifications = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: trainer.id,
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        select: {
          category: true,
          certification_level: true,
          certification_name: true,
          issued_date: true,
          expiration_date: true,
        },
        orderBy: { category: 'asc' },
      });

      res.json({
        success: true,
        message: 'Trainer certifications retrieved successfully',
        data: certifications,
      });
    } catch (error) {
      console.error('Get trainer certifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get available categories for trainer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAvailableCategories(req, res) {
    try {
      const { user_id } = req.params;

      // Get trainer by user_id
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get available categories from certifications
      const certifications = await prisma.trainerCertification.findMany({
        where: {
          trainer_id: trainer.id,
          verification_status: 'VERIFIED',
          is_active: true,
          OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
        },
        select: {
          category: true,
        },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      });

      const categories = certifications.map(cert => cert.category);

      res.json({
        success: true,
        message: 'Available categories retrieved successfully',
        data: categories,
      });
    } catch (error) {
      console.error('Get available categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update trainer's own schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateTrainerSchedule(req, res) {
    try {
      const { user_id, schedule_id } = req.params;
      const { class_name, description, max_capacity, special_notes, cancellation_reason } =
        req.body;

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get schedule and verify ownership
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: { status: 'CONFIRMED' },
            include: { member: true },
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch dạy',
          data: null,
        });
      }

      if (schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền sửa lịch dạy này',
          data: null,
        });
      }

      // Check if schedule can be modified (at least 7 days in advance)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      if (new Date(schedule.start_time) < sevenDaysFromNow) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể sửa lịch dạy trước ít nhất 7 ngày',
          data: null,
        });
      }

      // Update schedule
      const updatedSchedule = await prisma.schedule.update({
        where: { id: schedule_id },
        data: {
          max_capacity: max_capacity || schedule.max_capacity,
          special_notes: special_notes !== undefined ? special_notes : schedule.special_notes,
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      // Update gym class if needed
      if (class_name || description) {
        await prisma.gymClass.update({
          where: { id: schedule.gym_class_id },
          data: {
            name: class_name || schedule.gym_class.name,
            description: description !== undefined ? description : schedule.gym_class.description,
          },
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật lịch dạy thành công',
        data: { schedule: updatedSchedule },
      });
    } catch (error) {
      console.error('Update trainer schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật lịch dạy',
        data: null,
      });
    }
  }

  /**
   * Cancel trainer's own schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async cancelTrainerSchedule(req, res) {
    try {
      const { user_id, schedule_id } = req.params;
      const { cancellation_reason } = req.body;

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get schedule and verify ownership
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: { status: 'CONFIRMED' },
            include: { member: true },
          },
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch dạy',
          data: null,
        });
      }

      if (schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền hủy lịch dạy này',
          data: null,
        });
      }

      // Check if schedule can be cancelled (at least 24 hours in advance)
      const twentyFourHoursFromNow = new Date();
      twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

      if (new Date(schedule.start_time) < twentyFourHoursFromNow) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể hủy lịch dạy trước ít nhất 24 giờ',
          data: null,
        });
      }

      // Cancel all bookings and notify members
      const cancelledBookings = [];
      for (const booking of schedule.bookings) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            cancellation_reason: `Lịch dạy bị hủy bởi trainer: ${cancellation_reason || 'Không có lý do'}`,
          },
        });

        // Send notification to member
        try {
          await notificationService.sendNotification({
            type: 'SCHEDULE_CANCELLED',
            member_id: booking.member_id,
            schedule_id: schedule_id,
            data: {
              class_name: schedule.gym_class.name,
              trainer_name: trainer.full_name,
              start_time: schedule.start_time,
              cancellation_reason: cancellation_reason || 'Không có lý do',
            },
          });
        } catch (notificationError) {
          console.error('Send cancellation notification error:', notificationError);
        }

        cancelledBookings.push(booking.member_id);
      }

      // Update schedule status
      const updatedSchedule = await prisma.schedule.update({
        where: { id: schedule_id },
        data: {
          status: 'CANCELLED',
          special_notes: `Hủy bởi trainer: ${cancellation_reason || 'Không có lý do'}`,
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      res.json({
        success: true,
        message: 'Hủy lịch dạy thành công',
        data: {
          schedule: updatedSchedule,
          cancelled_bookings: cancelledBookings.length,
          notified_members: cancelledBookings,
        },
      });
    } catch (error) {
      console.error('Cancel trainer schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi hủy lịch dạy',
        data: null,
      });
    }
  }

  /**
   * Get waitlist statistics for trainer's schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWaitlistStats(req, res) {
    try {
      const { user_id, schedule_id } = req.params;

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get schedule and verify ownership
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch dạy',
          data: null,
        });
      }

      if (schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem thống kê lịch dạy này',
          data: null,
        });
      }

      // Get waitlist statistics
      const waitlistStats = await waitlistService.getWaitlistStats(schedule_id);
      const waitlist = await waitlistService.getWaitlistBySchedule(schedule_id);

      res.json({
        success: true,
        message: 'Thống kê waitlist retrieved successfully',
        data: {
          schedule: {
            id: schedule.id,
            class_name: schedule.gym_class.name,
            start_time: schedule.start_time,
            current_bookings: schedule.current_bookings,
            max_capacity: schedule.max_capacity,
            available_spots: schedule.max_capacity - schedule.current_bookings,
          },
          waitlist_stats: waitlistStats,
          waitlist_members: waitlist.map(member => ({
            member_id: member.member_id,
            waitlist_position: member.waitlist_position,
            booked_at: member.booked_at,
          })),
        },
      });
    } catch (error) {
      console.error('Get waitlist stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy thống kê waitlist',
        data: null,
      });
    }
  }

  /**
   * Request room change for trainer's schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async requestRoomChange(req, res) {
    try {
      const { user_id, schedule_id } = req.params;
      const { reason, requested_room_id } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Lý do yêu cầu đổi phòng là bắt buộc',
          data: null,
        });
      }

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Get schedule and verify ownership
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy lịch dạy',
          data: null,
        });
      }

      if (schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền yêu cầu đổi phòng cho lịch dạy này',
          data: null,
        });
      }

      // Get waitlist count
      const waitlistStats = await waitlistService.getWaitlistStats(schedule_id);

      // Create room change request
      const roomChangeRequest = await prisma.roomChangeRequest.create({
        data: {
          schedule_id,
          trainer_id: trainer.id,
          current_room_id: schedule.room_id,
          requested_room_id: requested_room_id || null,
          reason,
          waitlist_count: waitlistStats.total_waitlist,
          status: 'PENDING',
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              room: true,
            },
          },
          trainer: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Yêu cầu đổi phòng đã được gửi đến admin',
        data: { room_change_request: roomChangeRequest },
      });
    } catch (error) {
      console.error('Request room change error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi gửi yêu cầu đổi phòng',
        data: null,
      });
    }
  }

  /**
   * Get trainer revenue
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainerRevenue(req, res) {
    try {
      const { user_id } = req.params;
      const { from, to } = req.query;

      // Get trainer
      const trainer = await prisma.trainer.findUnique({
        where: { user_id },
        select: { id: true, full_name: true, user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trainer với user_id này',
          data: null,
        });
      }

      // Build date filter
      const dateFilter = {};
      if (from) {
        dateFilter.gte = new Date(from);
      }
      if (to) {
        dateFilter.lte = new Date(to);
      }

      // Get completed schedules with revenue
      const schedules = await prisma.schedule.findMany({
        where: {
          trainer_id: trainer.id,
          status: 'COMPLETED',
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        include: {
          gym_class: true,
          bookings: {
            where: { status: 'CONFIRMED' },
          },
        },
      });

      // Calculate revenue
      let totalRevenue = 0;
      let totalClasses = 0;
      let totalBookings = 0;

      const revenueByMonth = {};

      schedules.forEach(schedule => {
        const classPrice = schedule.price_override || schedule.gym_class.price || 0;
        const bookingCount = schedule.bookings.length;
        const classRevenue = classPrice * bookingCount;

        totalRevenue += classRevenue;
        totalClasses += 1;
        totalBookings += bookingCount;

        // Group by month
        const month = schedule.date.toISOString().substring(0, 7); // YYYY-MM
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = {
            revenue: 0,
            classes: 0,
            bookings: 0,
          };
        }
        revenueByMonth[month].revenue += classRevenue;
        revenueByMonth[month].classes += 1;
        revenueByMonth[month].bookings += bookingCount;
      });

      res.json({
        success: true,
        message: 'Trainer revenue retrieved successfully',
        data: {
          trainer: {
            id: trainer.id,
            full_name: trainer.full_name,
          },
          period: {
            from: from || 'All time',
            to: to || 'All time',
          },
          summary: {
            total_revenue: totalRevenue,
            total_classes: totalClasses,
            total_bookings: totalBookings,
            average_revenue_per_class: totalClasses > 0 ? totalRevenue / totalClasses : 0,
          },
          revenue_by_month: revenueByMonth,
        },
      });
    } catch (error) {
      console.error('Get trainer revenue error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy thông tin doanh thu',
        data: null,
      });
    }
  }
}

module.exports = new TrainerController();
