const crypto = require('crypto');
const path = require('path');
const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');
const databaseCertificationService = require('../services/database-certification.service.js');
const PriceMappingService = require('../services/price-mapping.service.js');
const rateLimitService = require('../services/rate-limit.service.js');
const waitlistService = require('../services/waitlist.service.js');
const notificationService = require('../services/notification.service.js');
const s3UploadService = require('../services/s3-upload.service.js');

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

  /**
   * Get trainers for notification (public endpoint, no auth required)
   * Supports both GET (with query params) and POST (with trainer_ids in body)
   * GET /trainers/for-notification?status=ACTIVE&specialization=YOGA
   * POST /trainers/for-notification { trainer_ids: ["id1", "id2"] }
   */
  async getTrainersForNotification(req, res) {
    try {
      // Support both GET (query params) and POST (body with trainer_ids)
      const trainer_ids = req.body?.trainer_ids || req.query?.trainer_ids;
      const { status, specialization, search } = req.query;

      let where = {};

      // If specific trainer_ids provided (POST or query param)
      if (trainer_ids) {
        const idsArray = Array.isArray(trainer_ids) ? trainer_ids : trainer_ids.split(',');
        where.id = { in: idsArray };
      } else {
        // Otherwise use filters
        if (status) where.status = status;
        if (specialization) {
          // Filter by specialization (array contains)
          where.specializations = { has: specialization };
        }

        // Search by name, email, or phone
        if (search && search.trim()) {
          const searchTerm = search.trim();
          where.OR = [
            { full_name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { phone: { contains: searchTerm, mode: 'insensitive' } },
          ];
        }
      }

      const trainers = await prisma.trainer.findMany({
        where,
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          phone: true,
          status: true,
          specializations: true,
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Trainers retrieved successfully for notification',
        data: { trainers },
      });
    } catch (error) {
      console.error('Get trainers for notification error:', error);
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

      // Validate required fields
      if (!user_id || !full_name || !email) {
        return res.status(400).json({
          success: false,
          message: 'user_id, full_name, and email are required',
          data: null,
        });
      }

      // Phone is required in schema, use a placeholder if not provided
      const trainerPhone = phone || `temp-${user_id.substring(0, 8)}`;

      console.log('[CREATE] Creating trainer in database:', {
        user_id,
        full_name,
        email,
        phone: trainerPhone,
      });

      const trainer = await prisma.trainer.create({
        data: {
          user_id,
          full_name,
          phone: trainerPhone,
          email,
          specializations: specializations || [],
          bio: bio || null,
          experience_years: parseInt(experience_years) || 0,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
          profile_photo: profile_photo || null,
        },
      });

      console.log('[SUCCESS] Trainer created successfully:', trainer.id);

      // Emit trainer:created event for real-time updates
      if (global.io) {
        const socketPayload = {
          trainer_id: trainer.id,
          id: trainer.id,
          user_id: trainer.user_id,
          full_name: trainer.full_name,
          email: trainer.email,
          phone: trainer.phone,
          status: trainer.status,
          specializations: trainer.specializations,
          created_at: trainer.created_at,
        };
        console.log('[SOCKET] Emitting trainer:created event:', socketPayload);
        global.io.emit('trainer:created', socketPayload);
        // Also emit to admin room
        global.io.to('admin').emit('trainer:created', socketPayload);
      }

      res.status(201).json({
        success: true,
        message: 'Trainer created successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('[ERROR] Create trainer error:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
      });

      // Handle unique constraint violations
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return res.status(409).json({
          success: false,
          message: `Trainer with this ${field} already exists`,
          data: null,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
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

      // If specializations are being updated directly, validate against verified certifications
      if (specializations && Array.isArray(specializations)) {
        const verifiedCerts = await prisma.trainerCertification.findMany({
          where: {
            trainer_id: id,
            verification_status: 'VERIFIED',
            is_active: true,
            OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
          },
          select: { category: true },
        });

        const verifiedCategories = verifiedCerts.map(cert => cert.category);
        const invalidSpecializations = specializations.filter(
          spec => !verifiedCategories.includes(spec)
        );

        if (invalidSpecializations.length > 0) {
          console.warn(
            `[WARNING] Warning: Attempting to set specializations without verified certifications: ${invalidSpecializations.join(
              ', '
            )}`
          );
          // Still allow the update but log a warning
          // In production, you might want to filter out invalid specializations or reject the request
        }
      }

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

      // Emit trainer:updated event for real-time updates
      if (global.io) {
        const socketPayload = {
          trainer_id: trainer.id,
          id: trainer.id,
          user_id: trainer.user_id,
          full_name: trainer.full_name,
          email: trainer.email,
          phone: trainer.phone,
          status: trainer.status,
          specializations: trainer.specializations,
          updated_at: trainer.updated_at,
        };
        console.log('[SOCKET] Emitting trainer:updated event:', socketPayload);
        global.io.emit('trainer:updated', socketPayload);
        // Also emit to admin room
        global.io.to('admin').emit('trainer:updated', socketPayload);
      }

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

      console.log('[UPDATE] updateTrainerByUserId called:', {
        user_id,
        full_name,
        phone,
        email,
        phoneType: typeof phone,
        emailType: typeof email,
      });

      const trainer = await prisma.trainer.findFirst({
        where: { user_id },
      });

      if (!trainer) {
        console.log('[WARN] Trainer not found for user_id:', user_id);
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Ensure phone is null if empty string or undefined
      const phoneValue = phone && phone.trim() !== '' ? phone.trim() : null;
      // Ensure email is not empty
      const emailValue = email && email.trim() !== '' ? email.trim() : null;

      if (!emailValue) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
          data: null,
        });
      }

      // If specializations are being updated directly, validate against verified certifications
      let shouldAutoSync = false;
      if (specializations && Array.isArray(specializations)) {
        const verifiedCerts = await prisma.trainerCertification.findMany({
          where: {
            trainer_id: trainer.id,
            verification_status: 'VERIFIED',
            is_active: true,
            OR: [{ expiration_date: null }, { expiration_date: { gt: new Date() } }],
          },
          select: { category: true },
        });

        const verifiedCategories = verifiedCerts.map(cert => cert.category);
        const invalidSpecializations = specializations.filter(
          spec => !verifiedCategories.includes(spec)
        );

        if (invalidSpecializations.length > 0) {
          console.warn(
            `[WARNING] Warning: Attempting to set specializations without verified certifications: ${invalidSpecializations.join(
              ', '
            )}`
          );
          // Auto-sync after update to ensure consistency
          shouldAutoSync = true;
        }
      }

      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          full_name,
          phone: phoneValue,
          email: emailValue,
          specializations: specializations || [],
          bio,
          experience_years: experience_years ? parseInt(experience_years) : undefined,
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : undefined,
          profile_photo,
          status,
        },
      });

      // Auto-sync specializations after manual update to ensure consistency
      if (shouldAutoSync || (specializations && Array.isArray(specializations))) {
        try {
          const specializationSyncService = require('../services/specialization-sync.service.js');
          console.log(
            `[SYNC] Auto-syncing specializations after manual update for trainer ${trainer.id}`
          );
          const syncResult = await specializationSyncService.updateTrainerSpecializations(
            trainer.id
          );
          if (syncResult && syncResult.success) {
            if (syncResult.changed) {
              console.log(
                `[SUCCESS] Specializations auto-synced after manual update - corrected to match certifications`
              );
              console.log(`   Before: [${syncResult.before.join(', ')}]`);
              console.log(`   After: [${syncResult.after.join(', ')}]`);
            } else {
              console.log(
                `[INFO] Specializations already match certifications - no changes needed`
              );
            }
          }
        } catch (syncError) {
          console.error(
            '[ERROR] Error auto-syncing specializations after manual update:',
            syncError
          );
          // Don't fail the request, just log the error
        }
      }

      console.log('[SUCCESS] Trainer updated successfully:', {
        trainerId: updatedTrainer.id,
        full_name: updatedTrainer.full_name,
        phone: updatedTrainer.phone,
        email: updatedTrainer.email,
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

      // Get trainer to get user_id before deletion
      const trainer = await prisma.trainer.findUnique({
        where: { id },
        select: { user_id: true },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Delete trainer from schedule service
      await prisma.trainer.delete({
        where: { id },
      });

      // Delete user from identity service
      if (trainer.user_id) {
        try {
          const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls.js');
          const axios = require('axios');

          console.log(`[DELETE] Deleting user ${trainer.user_id} from identity service`);
          const identityUrl = IDENTITY_SERVICE_URL;

          // Get auth token from request headers if available
          const authToken = req.headers.authorization;
          const headers = authToken ? { Authorization: authToken } : {};

          await axios.delete(`${identityUrl}/auth/users/${trainer.user_id}`, {
            headers,
            timeout: 10000,
          });

          console.log(
            `[SUCCESS] User ${trainer.user_id} deleted successfully from identity service`
          );
        } catch (identityError) {
          console.error(
            '[ERROR] Error deleting user from identity service:',
            identityError.message
          );
          // Continue even if identity service deletion fails
          // The trainer is already deleted from schedule service
          if (identityError.response?.status === 404) {
            console.log(
              '[WARN] User not found in identity service (may have been already deleted)'
            );
          }
        }
      }

      // Emit socket event for trainer deletion (user:deleted will be emitted by identity service)
      // But we also emit trainer:deleted for admin notifications
      if (global.io && trainer.user_id) {
        const socketPayload = {
          trainer_id: trainer.id,
          id: trainer.id,
          action: 'deleted',
          data: {
            id: trainer.id,
            user_id: trainer.user_id,
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to user room (user:deleted will be emitted by identity service)
        // This is just for admin notifications
        global.io.emit('trainer:deleted', socketPayload);
        console.log(`[SOCKET] Emitted trainer:deleted event for trainer ${trainer.id}`);
      }

      res.json({
        success: true,
        message: 'Trainer and associated user deleted successfully',
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

      // Delete trainer from schedule service
      await prisma.trainer.delete({
        where: { id: trainer.id },
      });

      // Delete user from identity service
      if (user_id) {
        try {
          const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls.js');
          const axios = require('axios');

          console.log(`[DELETE] Deleting user ${user_id} from identity service`);
          const identityUrl = IDENTITY_SERVICE_URL;

          // Get auth token from request headers if available
          const authToken = req.headers.authorization;
          const headers = authToken ? { Authorization: authToken } : {};

          await axios.delete(`${identityUrl}/auth/users/${user_id}`, {
            headers,
            timeout: 10000,
          });

          console.log(`[SUCCESS] User ${user_id} deleted successfully from identity service`);
        } catch (identityError) {
          console.error(
            '[ERROR] Error deleting user from identity service:',
            identityError.message
          );
          // Continue even if identity service deletion fails
          // The trainer is already deleted from schedule service
          if (identityError.response?.status === 404) {
            console.log(
              '[WARN] User not found in identity service (may have been already deleted)'
            );
          }
        }
      }

      // Emit socket event for trainer deletion (user:deleted will be emitted by identity service)
      if (global.io && user_id) {
        const socketPayload = {
          trainer_id: trainer.id,
          id: trainer.id,
          action: 'deleted',
          data: {
            id: trainer.id,
            user_id: user_id,
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to all admins (broadcast)
        global.io.emit('trainer:deleted', socketPayload);
        console.log(`[SOCKET] Emitted trainer:deleted event for trainer ${trainer.id}`);
      }

      res.json({
        success: true,
        message: 'Trainer and associated user deleted successfully',
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
          bookings: {
            where: {
              status: {
                not: 'CANCELLED',
              },
            },
          },
          attendance: true,
        },
      });

      // Calculate stats
      const totalClasses = schedules.length;
      const completedSessions = schedules.filter(s => s.status === 'completed').length;
      const upcomingClasses = schedules.filter(
        s => s.status === 'scheduled' && new Date(s.start_time) >= now
      ).length;

      // Get unique students from bookings (excluding cancelled)
      const allBookings = schedules.flatMap(s => s.bookings);
      const uniqueStudents = new Set(allBookings.map(b => b.member_id)).size;

      // Calculate monthly revenue (from completed sessions this month)
      const monthlySchedules = schedules.filter(
        s =>
          s.status === 'completed' &&
          new Date(s.start_time) >= startOfMonth &&
          new Date(s.start_time) <= endOfMonth
      );
      const monthlyRevenue = monthlySchedules.reduce((sum, s) => {
        const classPrice = s.price_override || 0; // Assuming price_override is the class price
        const bookingsCount = s.bookings.length;
        return sum + classPrice * bookingsCount;
      }, 0);

      // Get average rating from trainer's rating_average field
      const rating = trainer.rating_average || 0;

      // Achievements and goals are member-specific features, not applicable to trainers
      const achievements = 0;
      const goalsCompleted = 0;

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
      // Parse date string (YYYY-MM-DD) as UTC to avoid timezone issues
      let startDate, endDate;
      let baseDate;

      if (date) {
        // Parse date string as UTC (YYYY-MM-DD format)
        const [year, month, day] = date.split('-').map(Number);
        baseDate = new Date(Date.UTC(year, month - 1, day));
      } else {
        baseDate = new Date();
      }

      if (viewMode === 'day') {
        // Single day - use UTC
        const year = baseDate.getUTCFullYear();
        const month = baseDate.getUTCMonth();
        const day = baseDate.getUTCDate();
        startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      } else if (viewMode === 'week') {
        // Week starts on Monday (day 1), not Sunday (day 0)
        const year = baseDate.getUTCFullYear();
        const month = baseDate.getUTCMonth();
        const day = baseDate.getUTCDate();
        const dayOfWeek = baseDate.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

        // Calculate Monday of the week
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const mondayDate = day - daysToSubtract;

        startDate = new Date(Date.UTC(year, month, mondayDate, 0, 0, 0, 0));
        // End date is Sunday (6 days after Monday)
        endDate = new Date(Date.UTC(year, month, mondayDate + 6, 23, 59, 59, 999));
      } else {
        // month - use UTC
        const year = baseDate.getUTCFullYear();
        const month = baseDate.getUTCMonth();
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      }

      // Debug logging
      console.log('GetTrainerScheduleList - Query params:', {
        user_id,
        trainer_id: trainer.id,
        date: req.query.date,
        viewMode: req.query.viewMode,
        baseDate: baseDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const schedules = await prisma.schedule.findMany({
        where: {
          trainer_id: trainer.id,
          start_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          gym_class: true,
          room: true,
          bookings: {
            where: {
              status: {
                not: 'CANCELLED',
              },
            },
          },
          attendance: true,
        },
        orderBy: {
          start_time: 'asc',
        },
      });

      // Debug: Check total schedules for this trainer (without date filter)
      const totalSchedulesCount = await prisma.schedule.count({
        where: {
          trainer_id: trainer.id,
        },
      });

      console.log('GetTrainerScheduleList - Results:', {
        schedulesFound: schedules.length,
        totalSchedulesForTrainer: totalSchedulesCount,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
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

      const schedulesWithMembers = schedules.map(schedule => {
        // Extract date from start_time in YYYY-MM-DD format
        const startTime = new Date(schedule.start_time);
        const date = startTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        return {
          ...schedule,
          date: date, // Add computed date field for frontend compatibility
          bookings: schedule.bookings.map(booking => ({
            ...booking,
            member: memberMap[booking.member_id] || null,
          })),
          attendance: schedule.attendance.map(record => ({
            ...record,
            member: attendanceMemberMap[record.member_id] || null,
          })),
        };
      });

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
        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
        whereClause.start_time = {
          gte: startOfDay,
          lte: endOfDay,
        };
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
          class_date: schedule.start_time
            ? new Date(schedule.start_time).toISOString().split('T')[0]
            : null,
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
        const dateObj = new Date(date);
        const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
        const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));
        whereClause.start_time = {
          gte: startOfDay,
          lte: endOfDay,
        };
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
          class_date: schedule.start_time
            ? new Date(schedule.start_time).toISOString().split('T')[0]
            : null,
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
            class_date: schedule.start_time
              ? new Date(schedule.start_time).toISOString().split('T')[0]
              : null,
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
            class_date: schedule.start_time
              ? new Date(schedule.start_time).toISOString().split('T')[0]
              : null,
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
            trainer_reply: rating.trainer_reply,
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
            class_date: schedule.start_time
              ? new Date(schedule.start_time).toISOString().split('T')[0]
              : null,
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
   * Reply to a review/feedback
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async replyToReview(req, res) {
    try {
      const { user_id } = req.params;
      const { attendance_id } = req.params;
      const { reply_message } = req.body;

      if (!reply_message || reply_message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reply message is required',
          data: null,
        });
      }

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

      // Get attendance record
      const attendance = await prisma.attendance.findUnique({
        where: { id: attendance_id },
        include: {
          schedule: {
            include: {
              trainer: true,
            },
          },
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
          data: null,
        });
      }

      // Verify this attendance belongs to a schedule of this trainer
      if (attendance.schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reply to this review',
          data: null,
        });
      }

      // Update attendance with trainer reply
      const updatedAttendance = await prisma.attendance.update({
        where: { id: attendance_id },
        data: {
          trainer_reply: reply_message.trim(),
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Reply posted successfully',
        data: {
          attendance: updatedAttendance,
        },
      });
    } catch (error) {
      console.error('Reply to review error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Report a review (for inappropriate content)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async reportReview(req, res) {
    try {
      const { user_id } = req.params;
      const { attendance_id } = req.params;
      const { reason, additional_notes } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Report reason is required',
          data: null,
        });
      }

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

      // Get attendance record
      const attendance = await prisma.attendance.findUnique({
        where: { id: attendance_id },
        include: {
          schedule: {
            include: {
              trainer: true,
            },
          },
        },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
          data: null,
        });
      }

      // Verify this attendance belongs to a schedule of this trainer
      if (attendance.schedule.trainer_id !== trainer.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to report this review',
          data: null,
        });
      }

      // TODO: Store report in a separate table or send to admin
      // For now, just log it
      console.log('Review reported:', {
        attendance_id,
        trainer_id: trainer.id,
        reason,
        additional_notes,
        reported_at: new Date(),
      });

      res.json({
        success: true,
        message: 'Review reported successfully. Admin will review it.',
        data: null,
      });
    } catch (error) {
      console.error('Report review error:', error);
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
        minimum_participants: rawMinimumParticipants,
        special_notes: rawSpecialNotes,
      } = req.body;

      // TC-EDGE-004: Normalize empty strings to null
      const normalizeEmptyString = value => {
        if (value === '' || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        return value;
      };

      const category = rawCategory?.trim().toUpperCase();
      const difficulty = rawDifficulty?.trim().toUpperCase();
      const class_name = rawClassName?.trim().substring(0, 100);
      const description = normalizeEmptyString(rawDescription?.trim().substring(0, 500));
      const date = rawDate?.trim();
      const start_time = rawStartTime?.trim();
      const end_time = rawEndTime?.trim();
      const room_id = rawRoomId?.trim();

      // Parse max_capacity - will be set from GymClass.max_capacity if not provided
      let max_capacity = null;
      if (rawMaxCapacity !== undefined && rawMaxCapacity !== null && rawMaxCapacity !== '') {
        const parsed = parseInt(rawMaxCapacity);
        if (!isNaN(parsed) && parsed > 0) {
          max_capacity = parsed;
        }
      }

      // Parse minimum_participants - optional field
      let minimum_participants = null;
      if (
        rawMinimumParticipants !== undefined &&
        rawMinimumParticipants !== null &&
        rawMinimumParticipants !== ''
      ) {
        const parsed = parseInt(rawMinimumParticipants);
        if (!isNaN(parsed) && parsed > 0) {
          minimum_participants = parsed;
        }
      }

      const special_notes = normalizeEmptyString(rawSpecialNotes?.trim().substring(0, 200));

      // Check rate limit (only check, don't increment yet)
      if (
        !(await rateLimitService.canPerformOperation(
          user_id,
          'create_schedule',
          10,
          24 * 60 * 60 * 1000
        ))
      ) {
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

      // Validate required fields (max_capacity will be set from GymClass if not provided)
      if (
        !category ||
        !difficulty ||
        !class_name ||
        !date ||
        !start_time ||
        !end_time ||
        !room_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Thiếu thông tin bắt buộc. Vui lòng điền đầy đủ các trường: category, difficulty, class_name, date, start_time, end_time, room_id',
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

      // Calculate duration from start_time and end_time (already validated above)
      const scheduleDurationMs = endDateTime - startDateTime;
      const scheduleDurationMinutes = Math.round(scheduleDurationMs / (1000 * 60));

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

        // Get max_capacity from room.capacity (room is already fetched above)
        const classMaxCapacity = room.capacity;

        gymClass = await prisma.gymClass.create({
          data: {
            name: class_name,
            description: description || null,
            category,
            difficulty,
            price: price || null,
            duration: scheduleDurationMinutes, // Calculate from start_time and end_time
            max_capacity: classMaxCapacity, // Get from room.capacity
            equipment_needed: [], // Required field in schema
            required_certification_level: requiredCertLevel, // Map difficulty to certification level
            thumbnail: null, // No thumbnail when auto-creating
            is_active: true,
          },
        });
      }

      // If max_capacity not provided, use GymClass.max_capacity
      if (max_capacity === null || max_capacity === undefined) {
        max_capacity = gymClass.max_capacity;
      }

      // Validate max_capacity against GymClass.max_capacity
      if (max_capacity > gymClass.max_capacity) {
        return res.status(400).json({
          success: false,
          message: `Số lượng học viên không được vượt quá sức chứa của lớp học (${gymClass.max_capacity} người)`,
          data: null,
        });
      }

      // Validate max_capacity against room.capacity
      if (max_capacity > room.capacity) {
        return res.status(400).json({
          success: false,
          message: `Số lượng học viên không được vượt quá sức chứa của phòng (${room.capacity} người)`,
          data: null,
        });
      }

      // Validate max_capacity is positive
      if (max_capacity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Sức chứa phải lớn hơn 0',
          data: null,
        });
      }

      // Create schedule
      const schedule = await prisma.schedule.create({
        data: {
          trainer_id: trainer.id,
          class_id: gymClass.id,
          room_id,
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
      await rateLimitService.incrementRateLimit(user_id, 'create_schedule', 24 * 60 * 60 * 1000);

      // Notify admins and super-admins about new schedule
      console.log('[BELL] Checking if global.io exists:', !!global.io);
      if (global.io) {
        try {
          console.log('[BELL] Starting admin notification process for new schedule...');
          const admins = await notificationService.getAdminsAndSuperAdmins();
          console.log(
            `[LIST] Found ${admins.length} admin/super-admin users:`,
            admins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
          );

          // Create notifications for all admins
          const adminNotifications = admins.map(admin => ({
            user_id: admin.user_id,
            type: 'GENERAL',
            title: 'Lớp học mới được tạo',
            message: `${schedule.trainer.full_name} đã tạo lớp ${schedule.gym_class.name} tại phòng ${schedule.room.name}`,
            data: {
              schedule_id: schedule.id,
              class_id: schedule.gym_class.id,
              class_name: schedule.gym_class.name,
              trainer_id: schedule.trainer.id,
              trainer_name: schedule.trainer.full_name,
              room_id: schedule.room.id,
              room_name: schedule.room.name,
              room_capacity: schedule.room.capacity,
              date: schedule.start_time
                ? new Date(schedule.start_time).toISOString().split('T')[0]
                : null,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              max_capacity: schedule.max_capacity,
              created_at: schedule.created_at,
              role: 'TRAINER', // Add role to identify notification source
            },
            is_read: false,
            created_at: new Date(),
          }));

          // Create notifications in identity service
          if (adminNotifications.length > 0) {
            console.log(
              `💾 Creating ${adminNotifications.length} notifications in identity service...`
            );
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
                  `[ERROR] Failed to create notification for user ${notificationData.user_id}:`,
                  error.message
                );
              }
            }
            console.log(
              `[SUCCESS] Created ${createdNotifications.length} notifications in identity service`
            );

            // Emit socket events to all admins (only for notifications that were created)
            const validNotifications = createdNotifications.filter(n => n && n.id);
            console.log(
              `[EMIT] Starting to emit socket events to ${validNotifications.length} admin(s)...`
            );
            validNotifications.forEach(notification => {
              const roomName = `user:${notification.user_id}`;
              const socketData = {
                schedule_id: schedule.id,
                class_name: schedule.gym_class.name,
                trainer_name: schedule.trainer.full_name,
                room_name: schedule.room.name,
                room_capacity: schedule.room.capacity,
                date: schedule.start_time
                  ? new Date(schedule.start_time).toISOString().split('T')[0]
                  : null,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                max_capacity: schedule.max_capacity,
              };

              // Check if room has any sockets
              const room = global.io.sockets.adapter.rooms.get(roomName);
              const socketCount = room ? room.size : 0;

              console.log(
                `[EMIT] Emitting schedule:new to room ${roomName} (${socketCount} socket(s) connected)`,
                socketData
              );
              global.io.to(roomName).emit('schedule:new', socketData);

              // Also log all rooms for debugging
              const allRooms = Array.from(global.io.sockets.adapter.rooms.keys());
              const userRooms = allRooms.filter(r => r.startsWith('user:'));
              console.log(`[DATA] All user rooms:`, userRooms);
            });

            console.log(
              `[SUCCESS] Sent ${adminNotifications.length} notifications to admins about new schedule`
            );
          } else {
            console.warn('[WARN] No admin notifications to send (adminNotifications.length = 0)');
          }

          // Also emit schedule:created event to trainer for optimistic UI update
          if (schedule.trainer?.user_id) {
            const trainerRoomName = `user:${schedule.trainer.user_id}`;
            const trainerSocketData = {
              schedule_id: schedule.id,
              class_id: schedule.gym_class.id,
              class_name: schedule.gym_class.name,
              category: schedule.gym_class.category,
              difficulty: schedule.gym_class.difficulty,
              room_id: schedule.room.id,
              room_name: schedule.room.name,
              date: schedule.start_time
                ? new Date(schedule.start_time).toISOString().split('T')[0]
                : null,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              max_capacity: schedule.max_capacity,
              current_bookings: schedule.current_bookings,
              status: schedule.status,
              special_notes: schedule.special_notes,
              created_at: schedule.created_at,
            };

            const trainerRoom = global.io.sockets.adapter.rooms.get(trainerRoomName);
            const trainerSocketCount = trainerRoom ? trainerRoom.size : 0;

            console.log(
              `[EMIT] Emitting schedule:created to trainer room ${trainerRoomName} (${trainerSocketCount} socket(s) connected)`,
              trainerSocketData
            );
            global.io.to(trainerRoomName).emit('schedule:created', trainerSocketData);
            console.log(`[SUCCESS] Emitted schedule:created event to trainer`);
          }
        } catch (notifError) {
          console.error('[ERROR] Error sending admin notifications for new schedule:', notifError);
          console.error('Error stack:', notifError.stack);
          // Don't fail the request if notification fails
        }
      } else {
        console.warn('[WARN] global.io is not available, skipping admin notifications');
      }

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
   * Sync trainer specializations from verified certifications
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async syncTrainerSpecializations(req, res) {
    try {
      const { id } = req.params;

      const specializationSyncService = require('../services/specialization-sync.service.js');
      const result = await specializationSyncService.updateTrainerSpecializations(id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to sync specializations',
          data: null,
        });
      }

      // Get updated trainer
      const trainer = await prisma.trainer.findUnique({
        where: { id },
        select: {
          id: true,
          full_name: true,
          specializations: true,
        },
      });

      res.json({
        success: true,
        message: 'Specializations synced successfully',
        data: { trainer },
      });
    } catch (error) {
      console.error('Sync specializations error:', error);
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
      const {
        class_name,
        description,
        date,
        start_time,
        end_time,
        room_id,
        max_capacity,
        special_notes,
        cancellation_reason,
      } = req.body;

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
            select: {
              id: true,
              member_id: true,
              status: true,
              booked_at: true,
            },
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

      // TC-SCHED-002: Check if schedule has bookings before allowing update
      // Get accurate booking counts (including waitlist)
      const confirmedBookingsCount = await prisma.booking.count({
        where: {
          schedule_id,
          status: 'CONFIRMED',
          payment_status: { in: ['PAID', 'PENDING'] },
        },
      });

      const waitlistCount = await prisma.booking.count({
        where: {
          schedule_id,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
      });

      const totalBookings = confirmedBookingsCount + waitlistCount;

      if (totalBookings > 0) {
        // Allow update but warn about bookings
        // If changing time/date/room, need to notify members
        const isChangingTimeOrLocation =
          (date &&
            new Date(date).toISOString().split('T')[0] !==
              new Date(schedule.start_time).toISOString().split('T')[0]) ||
          (start_time && start_time !== schedule.start_time) ||
          (end_time && end_time !== schedule.end_time) ||
          (room_id && room_id !== schedule.room_id);

        if (isChangingTimeOrLocation) {
          // This will require notification to members - handled in update logic below
          console.log(
            `[WARNING] Updating schedule ${schedule_id} with ${totalBookings} booking(s) (${confirmedBookingsCount} confirmed + ${waitlistCount} waitlist). Members will be notified.`
          );
        }
      }

      // Validate max_capacity if provided
      if (max_capacity !== undefined) {
        // Validate max_capacity is positive
        if (max_capacity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Sức chứa phải lớn hơn 0',
            data: null,
          });
        }

        // Check if new max_capacity is less than current bookings
        if (max_capacity < totalBookings) {
          return res.status(400).json({
            success: false,
            message: `Sức chứa không được nhỏ hơn số lượng đặt chỗ hiện tại (${totalBookings} người: ${confirmedBookingsCount} đã xác nhận + ${waitlistCount} chờ)`,
            data: {
              current_bookings: totalBookings,
              confirmed_bookings: confirmedBookingsCount,
              waitlist_count: waitlistCount,
              requested_capacity: max_capacity,
            },
          });
        }

        // Check against room capacity
        if (schedule.room && max_capacity > schedule.room.capacity) {
          return res.status(400).json({
            success: false,
            message: `Sức chứa không được vượt quá sức chứa của phòng (${schedule.room.capacity} người)`,
            data: {
              room_capacity: schedule.room.capacity,
              room_name: schedule.room.name,
              requested_capacity: max_capacity,
            },
          });
        }

        // Check against gym class max capacity
        if (schedule.gym_class && max_capacity > schedule.gym_class.max_capacity) {
          return res.status(400).json({
            success: false,
            message: `Sức chứa không được vượt quá sức chứa của lớp học (${schedule.gym_class.max_capacity} người)`,
            data: {
              class_max_capacity: schedule.gym_class.max_capacity,
              class_name: schedule.gym_class.name,
              requested_capacity: max_capacity,
            },
          });
        }
      }

      // Check if schedule can be modified (at least 7 days in advance)
      // Use new date if provided, otherwise use current schedule date
      const dateToCheck = date
        ? new Date(date)
        : schedule.start_time
        ? new Date(schedule.start_time)
        : new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      if (dateToCheck < sevenDaysFromNow) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể sửa lịch dạy trước ít nhất 7 ngày',
          data: null,
        });
      }

      // Parse and validate date/time if provided
      // Initialize parsedDate from schedule start_time (extract date part only)
      let parsedDate = schedule.start_time 
        ? new Date(new Date(schedule.start_time).toISOString().split('T')[0]) 
        : null;
      let parsedStartTime = new Date(schedule.start_time);
      let parsedEndTime = new Date(schedule.end_time);

      if (date || start_time || end_time) {
        // Parse date - if provided, use it; otherwise keep date from schedule
        if (date) {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Ngày không hợp lệ',
              data: null,
            });
          }
          parsedDate = dateObj;
        } else {
          // If date not provided, extract date from schedule start_time
          parsedDate = schedule.start_time 
            ? new Date(new Date(schedule.start_time).toISOString().split('T')[0])
            : new Date();
        }

        // Parse start_time
        if (start_time) {
          const [hours, minutes] = start_time.split(':').map(Number);
          if (
            isNaN(hours) ||
            isNaN(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
          ) {
            return res.status(400).json({
              success: false,
              message: 'Giờ bắt đầu không hợp lệ',
              data: null,
            });
          }
          const startDate = new Date(parsedDate);
          startDate.setHours(hours, minutes, 0, 0);
          parsedStartTime = startDate;
        } else if (date) {
          // If only date changed, update start_time to use new date but keep old time
          const oldStart = new Date(schedule.start_time);
          parsedStartTime = new Date(parsedDate);
          parsedStartTime.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        } else {
          // If neither date nor start_time changed, keep original start_time
          parsedStartTime = new Date(schedule.start_time);
        }

        // Parse end_time
        if (end_time) {
          const [hours, minutes] = end_time.split(':').map(Number);
          if (
            isNaN(hours) ||
            isNaN(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
          ) {
            return res.status(400).json({
              success: false,
              message: 'Giờ kết thúc không hợp lệ',
              data: null,
            });
          }
          // Use same date as start_time to ensure correct duration calculation
          const endDate = new Date(parsedStartTime);
          endDate.setHours(hours, minutes, 0, 0);
          parsedEndTime = endDate;
        } else if (date) {
          // If only date changed, update end_time to use new date but keep old time
          const oldEnd = new Date(schedule.end_time);
          parsedEndTime = new Date(parsedDate);
          parsedEndTime.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0);
        } else {
          // If neither date nor end_time changed, keep original end_time
          parsedEndTime = new Date(schedule.end_time);
        }

        // Validate time logic
        if (parsedStartTime && parsedEndTime && parsedStartTime >= parsedEndTime) {
          return res.status(400).json({
            success: false,
            message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc',
            data: null,
          });
        }

        // Validate duration (15 minutes to 3 hours)
        if (parsedStartTime && parsedEndTime) {
          const durationMs = parsedEndTime.getTime() - parsedStartTime.getTime();
          const durationMinutes = Math.round(durationMs / (1000 * 60));
          if (durationMinutes < 15) {
            return res.status(400).json({
              success: false,
              message: 'Thời lượng lớp học tối thiểu 15 phút',
              data: null,
            });
          }
          if (durationMinutes > 180) {
            return res.status(400).json({
              success: false,
              message: 'Thời lượng lớp học tối đa 180 phút (3 giờ)',
              data: null,
            });
          }
        }

        // Check for conflicts with other schedules (trainer and room)
        const ACTIVE_SCHEDULE_STATUSES = ['SCHEDULED', 'IN_PROGRESS'];
        // Use new room_id if provided, otherwise use current room_id
        const targetRoomId = room_id || schedule.room_id;

        const [trainerConflict, roomConflict] = await Promise.all([
          // Check trainer conflict
          prisma.schedule.findFirst({
            where: {
              trainer_id: schedule.trainer_id,
              id: { not: schedule_id },
              status: { in: ACTIVE_SCHEDULE_STATUSES },
              start_time: { lt: parsedEndTime },
              end_time: { gt: parsedStartTime },
            },
          }),
          // Check room conflict (use target room - new or current)
          prisma.schedule.findFirst({
            where: {
              room_id: targetRoomId,
              id: { not: schedule_id },
              status: { in: ACTIVE_SCHEDULE_STATUSES },
              start_time: { lt: parsedEndTime },
              end_time: { gt: parsedStartTime },
            },
          }),
        ]);

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
      }

      // Get current schedule data before update for change detection
      const currentSchedule = {
        max_capacity: schedule.max_capacity,
        special_notes: schedule.special_notes,
        gym_class_name: schedule.gym_class.name,
        gym_class_description: schedule.gym_class.description,
        date: schedule.start_time
          ? new Date(schedule.start_time).toISOString().split('T')[0]
          : null,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        room_id: schedule.room_id,
        room_name: schedule.room.name,
      };

      // Prepare update data
      const updateData = {};
      if (max_capacity !== undefined && max_capacity !== schedule.max_capacity) {
        updateData.max_capacity = max_capacity;
      }
      if (special_notes !== undefined && special_notes !== schedule.special_notes) {
        updateData.special_notes = special_notes;
      }
      // Date is now derived from start_time, so we don't update date separately
      // If start_time changes, date will automatically change
      if (
        parsedStartTime &&
        parsedStartTime.getTime() !== new Date(schedule.start_time).getTime()
      ) {
        updateData.start_time = parsedStartTime;
      }
      if (parsedEndTime && parsedEndTime.getTime() !== new Date(schedule.end_time).getTime()) {
        updateData.end_time = parsedEndTime;
      }

      // Update schedule
      const updatedSchedule = await prisma.schedule.update({
        where: { id: schedule_id },
        data: updateData,
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            where: { status: 'CONFIRMED' },
            select: {
              id: true,
              member_id: true,
              status: true,
              booked_at: true,
            },
          },
        },
      });

      // Hydrate bookings with member info
      updatedSchedule.bookings = await hydrateBookingsWithMembers(updatedSchedule.bookings);

      // Notify waitlist members if capacity increased
      let waitlistNotificationResult = null;
      if (
        max_capacity !== undefined &&
        currentSchedule.max_capacity < max_capacity &&
        max_capacity > updatedSchedule.current_bookings
      ) {
        try {
          const waitlistService = require('../services/waitlist.service.js');
          const additionalSlots = max_capacity - currentSchedule.max_capacity;
          waitlistNotificationResult = await waitlistService.notifyWaitlistMembersAvailability(
            updatedSchedule.id,
            additionalSlots
          );
          console.log(
            `[WAITLIST] Trainer increased capacity for schedule ${updatedSchedule.id}. Notified ${waitlistNotificationResult.notified || 0} waitlist members.`
          );
        } catch (waitlistError) {
          console.error('[ERROR] Failed to notify waitlist members:', waitlistError);
          // Don't fail schedule update if waitlist notification fails
        }
      }

      // Update gym class if needed
      if (class_name || description) {
        await prisma.gymClass.update({
          where: { id: schedule.gym_class.id },
          data: {
            name: class_name || schedule.gym_class.name,
            description: description !== undefined ? description : schedule.gym_class.description,
          },
        });

        // Reload updated schedule with updated gym class
        const reloadedSchedule = await prisma.schedule.findUnique({
          where: { id: schedule_id },
          include: {
            gym_class: true,
            trainer: true,
            room: true,
            bookings: {
              where: { status: 'CONFIRMED' },
              select: {
                id: true,
                member_id: true,
                status: true,
                booked_at: true,
              },
            },
          },
        });

        if (reloadedSchedule) {
          Object.assign(updatedSchedule, reloadedSchedule);
          // Hydrate bookings with member info
          updatedSchedule.bookings = await hydrateBookingsWithMembers(reloadedSchedule.bookings);
        }
      }

      // Detect changes for notification
      const changes = [];
      if (currentSchedule.max_capacity !== updatedSchedule.max_capacity) {
        changes.push('sức chứa');
      }
      if (currentSchedule.special_notes !== updatedSchedule.special_notes) {
        changes.push('ghi chú đặc biệt');
      }
      if (class_name && currentSchedule.gym_class_name !== class_name) {
        changes.push('tên lớp');
      }
      if (description !== undefined && currentSchedule.gym_class_description !== description) {
        changes.push('mô tả lớp');
      }
      if (room_id && currentSchedule.room_id !== room_id) {
        changes.push('phòng');
      }
      if (
        parsedDate &&
        currentSchedule.start_time &&
        updatedSchedule.start_time &&
        new Date(currentSchedule.start_time).toISOString().split('T')[0] !==
          new Date(updatedSchedule.start_time).toISOString().split('T')[0]
      ) {
        changes.push('ngày');
      }
      if (
        parsedStartTime &&
        new Date(currentSchedule.start_time).getTime() !==
          new Date(updatedSchedule.start_time).getTime()
      ) {
        changes.push('giờ bắt đầu');
      }
      if (
        parsedEndTime &&
        new Date(currentSchedule.end_time).getTime() !==
          new Date(updatedSchedule.end_time).getTime()
      ) {
        changes.push('giờ kết thúc');
      }

      // Send notifications if there are changes
      if (changes.length > 0 && global.io) {
        try {
          const notificationService = require('../services/notification.service.js');
          const changesText = changes.join(', ');

          // 1. Notify admins and super-admins about schedule update
          console.log('[BELL] Starting admin notification process for schedule update...');
          const admins = await notificationService.getAdminsAndSuperAdmins();
          console.log(
            `[LIST] Found ${admins.length} admin/super-admin users:`,
            admins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
          );

          // Create notifications for all admins
          const adminNotifications = admins.map(admin => ({
            user_id: admin.user_id,
            type: 'GENERAL',
            title: 'Lịch dạy được cập nhật bởi trainer',
            message: `${trainer.full_name} đã cập nhật ${changesText} của lớp ${updatedSchedule.gym_class.name}`,
            data: {
              schedule_id: updatedSchedule.id,
              class_id: updatedSchedule.gym_class.id,
              class_name: updatedSchedule.gym_class.name,
              trainer_id: trainer.id,
              trainer_name: trainer.full_name,
              room_id: updatedSchedule.room.id,
              room_name: updatedSchedule.room.name,
              date: updatedSchedule.start_time
                ? new Date(updatedSchedule.start_time).toISOString().split('T')[0]
                : null,
              start_time: updatedSchedule.start_time,
              end_time: updatedSchedule.end_time,
              max_capacity: updatedSchedule.max_capacity,
              changes: changes,
              role: 'TRAINER', // Role indicates who performed the action
            },
            channels: ['IN_APP', 'PUSH'],
          }));

          // Create notifications in identity service
          if (adminNotifications.length > 0) {
            console.log(
              `💾 Creating ${adminNotifications.length} notifications in identity service for admins...`
            );

            const createdAdminNotifications = [];
            for (const notificationData of adminNotifications) {
              try {
                const created = await notificationService.createNotificationInIdentityService(
                  notificationData,
                  'normal'
                );
                if (created) {
                  createdAdminNotifications.push(created);
                }
              } catch (error) {
                console.error(
                  `[ERROR] Failed to create notification for admin ${notificationData.user_id}:`,
                  error.message
                );
              }
            }

            console.log(
              `[SUCCESS] Created ${createdAdminNotifications.length} notifications in identity service for admins`
            );

            // Emit socket events to all admins (only for notifications that were created)
            const validAdminNotifications = createdAdminNotifications.filter(n => n && n.id);
            if (validAdminNotifications.length > 0) {
              console.log(
                `[EMIT] Starting to emit socket events to ${validAdminNotifications.length} admin(s)...`
              );

              validAdminNotifications.forEach(notification => {
                const roomName = `user:${notification.user_id}`;
                const socketData = {
                  schedule_id: updatedSchedule.id,
                  class_id: updatedSchedule.gym_class.id,
                  class_name: updatedSchedule.gym_class.name,
                  class_category: updatedSchedule.gym_class.category,
                  trainer_id: trainer.id,
                  trainer_name: trainer.full_name,
                  room_name: updatedSchedule.room.name,
                  date: updatedSchedule.start_time
                    ? new Date(updatedSchedule.start_time).toISOString().split('T')[0]
                    : null,
                  start_time: updatedSchedule.start_time,
                  end_time: updatedSchedule.end_time,
                  max_capacity: updatedSchedule.max_capacity,
                  changes: changes,
                  created_at: updatedSchedule.created_at,
                };

                const room = global.io.sockets.adapter.rooms.get(roomName);
                const socketCount = room ? room.size : 0;

                console.log(
                  `[EMIT] Emitting schedule:updated to room ${roomName} (${socketCount} socket(s) connected)`,
                  socketData
                );
                global.io.to(roomName).emit('schedule:updated', socketData);

                // Also emit notification:new event
                if (notification.id) {
                  const notificationPayload = {
                    notification_id: notification.id,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    created_at: notification.created_at?.toISOString() || new Date().toISOString(),
                    is_read: false,
                  };
                  global.io.to(roomName).emit('notification:new', notificationPayload);
                }
              });

              console.log(
                `[SUCCESS] Sent ${adminNotifications.length} notifications to admins about schedule update`
              );
            }
          }

          // 2. Notify all members who booked this schedule
          if (updatedSchedule.bookings && updatedSchedule.bookings.length > 0) {
            const memberNotifications = updatedSchedule.bookings
              .filter(booking => booking.member?.user_id)
              .map(booking => ({
                user_id: booking.member.user_id,
                type: 'SCHEDULE_UPDATE',
                title: 'Lịch tập đã được cập nhật',
                message: `Trainer ${trainer.full_name} đã cập nhật ${changesText} của lớp ${updatedSchedule.gym_class.name} bạn đã đặt`,
                data: {
                  schedule_id: updatedSchedule.id,
                  booking_id: booking.id,
                  class_id: updatedSchedule.gym_class.id,
                  class_name: updatedSchedule.gym_class.name,
                  trainer_id: trainer.id,
                  trainer_name: trainer.full_name,
                  room_id: updatedSchedule.room.id,
                  room_name: updatedSchedule.room.name,
                  date: updatedSchedule.start_time
                    ? new Date(updatedSchedule.start_time).toISOString().split('T')[0]
                    : null,
                  start_time: updatedSchedule.start_time,
                  end_time: updatedSchedule.end_time,
                  max_capacity: updatedSchedule.max_capacity,
                  status: updatedSchedule.status,
                  changes: changes,
                  role: 'TRAINER', // Role indicates who performed the action
                },
                channels: ['IN_APP', 'PUSH'],
              }));

            // Create notifications in Identity Service (saves to database immediately)
            if (memberNotifications.length > 0) {
              try {
                const createdMemberNotifications = [];
                for (const notificationData of memberNotifications) {
                  try {
                    const created = await notificationService.createNotificationInIdentityService(
                      {
                        user_id: notificationData.user_id,
                        type: notificationData.type,
                        title: notificationData.title,
                        message: notificationData.message,
                        data: notificationData.data,
                        channels: notificationData.channels,
                      },
                      'normal' // Use normal priority for schedule updates
                    );
                    if (created) {
                      createdMemberNotifications.push(created);
                    }
                  } catch (error) {
                    console.error(
                      `[ERROR] Failed to create notification for member ${notificationData.user_id}:`,
                      error.message
                    );
                  }
                }

                console.log(
                  `[SUCCESS] Created ${createdMemberNotifications.length} notifications in Identity Service for members`
                );

                const notificationsWithIds = createdMemberNotifications;

                // Emit socket events to all members (only for notifications that were created)
                memberNotifications.forEach((notification, index) => {
                  const createdNotif = notificationsWithIds.find(
                    n => n && n.user_id === notification.user_id
                  );

                  // Emit notification:new event for NotificationDropdown (only if notification was created)
                  if (createdNotif && createdNotif.id) {
                    const notificationPayload = {
                      notification_id: createdNotif.id,
                      type: notification.type,
                      title: notification.title,
                      message: notification.message,
                      data: notification.data,
                      created_at:
                        createdNotif.created_at?.toISOString() || new Date().toISOString(),
                      is_read: false,
                    };

                    console.log(
                      `[EMIT] Emitting notification:new to member user:${notification.user_id}`,
                      notificationPayload
                    );
                    global.io
                      .to(`user:${notification.user_id}`)
                      .emit('notification:new', notificationPayload);
                  }

                  // Emit schedule:updated event for real-time UI update
                  const socketPayload = {
                    schedule_id: updatedSchedule.id,
                    booking_id: updatedSchedule.bookings.find(
                      b => b.member?.user_id === notification.user_id
                    )?.id,
                    class_name: updatedSchedule.gym_class.name,
                    room_name: updatedSchedule.room.name,
                    date: updatedSchedule.start_time
                      ? new Date(updatedSchedule.start_time).toISOString().split('T')[0]
                      : null,
                    start_time: updatedSchedule.start_time,
                    end_time: updatedSchedule.end_time,
                    max_capacity: updatedSchedule.max_capacity,
                    status: updatedSchedule.status,
                    changes: changes,
                    updated_at: updatedSchedule.updated_at,
                  };

                  console.log(
                    `[EMIT] Emitting schedule:updated to member user:${notification.user_id}`,
                    socketPayload
                  );
                  global.io
                    .to(`user:${notification.user_id}`)
                    .emit('schedule:updated', socketPayload);
                });

                console.log(
                  `[SUCCESS] Sent ${memberNotifications.length} notifications to members about schedule update`
                );
              } catch (notifError) {
                console.error('Error creating member notifications:', notifError);
              }
            }
          }

          // 3. Emit schedule:updated event to trainer for optimistic UI update
          if (updatedSchedule.trainer?.user_id) {
            const trainerRoomName = `user:${updatedSchedule.trainer.user_id}`;
            const trainerSocketData = {
              schedule_id: updatedSchedule.id,
              class_id: updatedSchedule.gym_class.id,
              class_name: updatedSchedule.gym_class.name,
              category: updatedSchedule.gym_class.category,
              difficulty: updatedSchedule.gym_class.difficulty,
              room_id: updatedSchedule.room.id,
              room_name: updatedSchedule.room.name,
              date: updatedSchedule.start_time
                ? new Date(updatedSchedule.start_time).toISOString().split('T')[0]
                : null,
              start_time: updatedSchedule.start_time,
              end_time: updatedSchedule.end_time,
              max_capacity: updatedSchedule.max_capacity,
              current_bookings: updatedSchedule.current_bookings,
              status: updatedSchedule.status,
              changes: changes,
              special_notes: updatedSchedule.special_notes,
              updated_at: updatedSchedule.updated_at,
            };

            const trainerRoom = global.io.sockets.adapter.rooms.get(trainerRoomName);
            const trainerSocketCount = trainerRoom ? trainerRoom.size : 0;

            console.log(
              `[EMIT] Emitting schedule:updated to trainer room ${trainerRoomName} (${trainerSocketCount} socket(s) connected)`,
              trainerSocketData
            );
            global.io.to(trainerRoomName).emit('schedule:updated', trainerSocketData);
            console.log(`[SUCCESS] Emitted schedule:updated event to trainer`);
          }
        } catch (notifError) {
          console.error('[ERROR] Error sending notifications for schedule update:', notifError);
          console.error('Error stack:', notifError.stack);
          // Don't fail the request if notification fails
        }
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
            select: {
              id: true,
              member_id: true,
              status: true,
              booked_at: true,
            },
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

      // Hydrate bookings with member info for later use
      schedule.bookings = await hydrateBookingsWithMembers(schedule.bookings);

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
            cancellation_reason: `Lịch dạy bị hủy bởi trainer: ${
              cancellation_reason || 'Không có lý do'
            }`,
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
          ...(Object.keys(dateFilter).length > 0 && { start_time: dateFilter }),
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
        const month = schedule.start_time
          ? new Date(schedule.start_time).toISOString().substring(0, 7)
          : null; // YYYY-MM
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

  /**
   * Upload trainer avatar
   */
  async uploadAvatar(req, res) {
    try {
      console.log('📤 Trainer avatar upload request received');

      // Get user_id from JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      const token = authHeader.split(' ')[1];
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          data: null,
        });
      }

      let payloadBase64 = tokenParts[1];
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      const userId = payload.userId || payload.id;

      // Find trainer by user_id
      const trainer = await prisma.trainer.findFirst({
        where: { user_id: userId },
      });

      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Trainer not found',
          data: null,
        });
      }

      // Get base64 image from request body
      const { base64Image, mimeType = 'image/jpeg', filename = 'avatar.jpg' } = req.body;

      if (!base64Image) {
        return res.status(400).json({
          success: false,
          message: 'No image data provided',
          data: null,
        });
      }

      // Validate MIME type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
          data: null,
        });
      }

      // Remove data:image/xxx;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
          data: null,
        });
      }

      // Validate minimum size (at least 1KB)
      const minSize = 1024; // 1KB
      if (imageBuffer.length < minSize) {
        return res.status(400).json({
          success: false,
          message: 'File too small. Please upload a valid image',
          data: null,
        });
      }

      console.log(`📷 Uploading avatar for trainer: ${trainer.id}`);

      // Upload to S3 with folder 'trainer-avatars'
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(filename) || '.jpg';
      const key = `trainer-avatars/${uniqueSuffix}${extension}`;

      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: imageBuffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000',
      });

      await s3Client.send(command);

      // Generate URL
      const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      // Delete old avatar if exists
      if (trainer.profile_photo) {
        try {
          const oldUrl = new URL(trainer.profile_photo);
          const oldKey = oldUrl.pathname.substring(1);
          if (oldKey.startsWith('trainer-avatars/')) {
            const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME,
              Key: oldKey,
            });
            await s3Client.send(deleteCommand);
            console.log(`[DELETE] Deleted old avatar: ${oldKey}`);
          }
        } catch (deleteError) {
          console.warn('[WARN] Error deleting old avatar (non-critical):', deleteError.message);
        }
      }

      // Update trainer with new avatar URL
      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          profile_photo: url,
          updated_at: new Date(),
        },
      });

      console.log(`[SUCCESS] Avatar uploaded successfully: ${url}`);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: url,
          trainer: updatedTrainer,
        },
      });
    } catch (error) {
      console.error('[ERROR] Upload trainer avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}

module.exports = new TrainerController();
