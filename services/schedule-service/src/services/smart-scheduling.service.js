const { prisma } = require('../lib/prisma.js');
const memberService = require('./member.service.js');
const { createHttpClient } = require('./http-client.js');

class SmartSchedulingService {
  /**
   * Analyze member's attendance patterns and suggest optimal booking times
   * @param {string} memberId - Member ID
   * @param {Object} options - Options for analysis
   * @returns {Promise<Object>} Scheduling suggestions
   */
  async getSchedulingSuggestions(memberId, options = {}) {
    const {
      classId = null,
      category = null,
      trainerId = null,
      dateRange = 30, // days
      useAI = true,
    } = options;

    try {
      // Get member data
      let member;
      try {
        member = await memberService.getMemberById(memberId);
      } catch (memberError) {
        console.error('Smart scheduling: Failed to fetch member:', {
          memberId,
          error: memberError.message,
        });
        throw new Error(`Failed to fetch member information: ${memberError.message}`);
      }
      
      if (!member) {
        throw new Error(`Member not found: ${memberId}`);
      }

      // Get attendance history
      let attendanceHistory = [];
      try {
        attendanceHistory = await prisma.attendance.findMany({
        where: {
          member_id: memberId,
        },
        include: {
          schedule: {
            include: {
              gym_class: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  difficulty: true,
                },
              },
              trainer: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 100,
        });
      } catch (attendanceError) {
        console.error('Smart scheduling: Failed to fetch attendance history:', attendanceError.message);
        // Continue with empty array
      }

      // Get bookings history
      let bookingsHistory = [];
      try {
        bookingsHistory = await prisma.booking.findMany({
        where: {
          member_id: memberId,
        },
        include: {
          schedule: {
            include: {
              gym_class: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
              trainer: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
        orderBy: { booked_at: 'desc' },
        take: 100,
        });
      } catch (bookingError) {
        console.error('Smart scheduling: Failed to fetch bookings history:', bookingError.message);
        // Continue with empty array
      }

      // Get upcoming schedules (for conflict checking)
      let upcomingBookings = [];
      try {
        upcomingBookings = await prisma.booking.findMany({
        where: {
          member_id: memberId,
          status: { in: ['CONFIRMED', 'WAITLIST'] },
          schedule: {
            start_time: { gte: new Date() },
          },
        },
        include: {
          schedule: {
            select: {
              id: true,
              start_time: true,
              end_time: true,
              gym_class: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
        });
      } catch (upcomingError) {
        console.error('Smart scheduling: Failed to fetch upcoming bookings:', upcomingError.message);
        // Continue with empty array
      }

      // Analyze patterns
      const patterns = this.analyzeAttendancePatterns({
        attendanceHistory,
        bookingsHistory,
        upcomingBookings,
        dateRange,
      });

      // Get available schedules
      let availableSchedules = [];
      try {
        availableSchedules = await this.getAvailableSchedules({
        classId,
        category,
        trainerId,
        dateRange,
        memberId,
        patterns,
        });
      } catch (schedulesError) {
        console.error('Smart scheduling: Failed to fetch available schedules:', schedulesError.message);
        // Continue with empty array
      }

      // Generate suggestions
      let suggestions = [];

      if (useAI) {
        try {
          const aiSuggestions = await this.generateAISuggestions({
            member,
            patterns,
            availableSchedules,
            attendanceHistory,
            bookingsHistory,
          });

          if (aiSuggestions && aiSuggestions.length > 0) {
            suggestions = aiSuggestions;
          } else {
            suggestions = this.generateRuleBasedSuggestions({
              patterns,
              availableSchedules,
              upcomingBookings,
            });
          }
        } catch (aiError) {
          const isRateLimit = aiError.response?.status === 429 || 
                             aiError.response?.data?.errorCode === 'RATE_LIMIT_EXCEEDED';
          
          if (isRateLimit) {
            console.log('⚠️ AI service rate limit exceeded, falling back to rule-based suggestions');
          } else {
            console.error('AI suggestions error:', {
              message: aiError.message,
              code: aiError.code,
              status: aiError.response?.status,
            });
          }
          
          suggestions = this.generateRuleBasedSuggestions({
            patterns,
            availableSchedules,
            upcomingBookings,
          });
        }
      } else {
        suggestions = this.generateRuleBasedSuggestions({
          patterns,
          availableSchedules,
          upcomingBookings,
        });
      }

      return {
        success: true,
        suggestions,
        patterns,
        availableCount: availableSchedules.length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Smart scheduling service error:', {
        memberId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Analyze attendance patterns from history
   */
  analyzeAttendancePatterns({ attendanceHistory, bookingsHistory, upcomingBookings, dateRange }) {
    const patterns = {
      preferredHours: {}, // { hour: count }
      preferredDays: {}, // { dayOfWeek: count }
      preferredCategories: {}, // { category: count }
      preferredTrainers: {}, // { trainerId: count }
      averageAttendanceRate: 0,
      cancellationRate: 0,
      noShowRate: 0,
      typicalBookingWindow: 0, // hours before class
      conflicts: [],
    };

    // Analyze attendance times
    attendanceHistory.forEach((attendance) => {
      const schedule = attendance.schedule;
      if (!schedule) return;

      const startTime = new Date(schedule.start_time);
      const hour = startTime.getHours();
      const dayOfWeek = startTime.getDay(); // 0 = Sunday, 6 = Saturday

      patterns.preferredHours[hour] = (patterns.preferredHours[hour] || 0) + 1;
      patterns.preferredDays[dayOfWeek] = (patterns.preferredDays[dayOfWeek] || 0) + 1;

      if (schedule.gym_class) {
        const category = schedule.gym_class.category;
        patterns.preferredCategories[category] =
          (patterns.preferredCategories[category] || 0) + 1;
      }

      if (schedule.trainer) {
        const trainerId = schedule.trainer.id;
        patterns.preferredTrainers[trainerId] = (patterns.preferredTrainers[trainerId] || 0) + 1;
      }
    });

    // Analyze booking patterns
    bookingsHistory.forEach((booking) => {
      const schedule = booking.schedule;
      if (!schedule) return;

      const bookedAt = new Date(booking.booked_at);
      const startTime = new Date(schedule.start_time);
      const hoursBefore = (startTime - bookedAt) / (1000 * 60 * 60);

      if (patterns.typicalBookingWindow === 0) {
        patterns.typicalBookingWindow = hoursBefore;
      } else {
        patterns.typicalBookingWindow = (patterns.typicalBookingWindow + hoursBefore) / 2;
      }
    });

    // Calculate attendance rate
    const totalBookings = bookingsHistory.length;
    const totalAttended = attendanceHistory.length;
    if (totalBookings > 0) {
      patterns.averageAttendanceRate = (totalAttended / totalBookings) * 100;
    }

    // Calculate cancellation rate
    const cancelledBookings = bookingsHistory.filter(
      (b) => b.status === 'CANCELLED' && b.cancelled_at
    ).length;
    if (totalBookings > 0) {
      patterns.cancellationRate = (cancelledBookings / totalBookings) * 100;
    }

    // Calculate no-show rate (booked but no attendance)
    const bookedIds = new Set(bookingsHistory.map((b) => b.schedule_id));
    const attendedIds = new Set(attendanceHistory.map((a) => a.schedule_id));
    const noShowCount = Array.from(bookedIds).filter((id) => !attendedIds.has(id)).length;
    if (totalBookings > 0) {
      patterns.noShowRate = (noShowCount / totalBookings) * 100;
    }

    // Identify conflicts (upcoming bookings)
    patterns.conflicts = upcomingBookings.map((booking) => ({
      scheduleId: booking.schedule_id,
      startTime: booking.schedule.start_time,
      endTime: booking.schedule.end_time,
      className: booking.schedule.gym_class?.name || 'Unknown',
    }));

    return patterns;
  }

  /**
   * Get available schedules based on filters and patterns
   */
  async getAvailableSchedules({ classId, category, trainerId, dateRange, memberId, patterns }) {
    const now = new Date();
    const endDate = new Date(now.getTime() + dateRange * 24 * 60 * 60 * 1000);

    const where = {
      start_time: {
        gte: now,
        lte: endDate,
      },
      status: 'SCHEDULED',
    };

    if (classId) {
      where.class_id = classId;
    }

    if (category) {
      where.gym_class = { category };
    }

    if (trainerId) {
      where.trainer_id = trainerId;
    }

    // Exclude schedules where member already has a booking
    const existingBookingScheduleIds = await prisma.booking
      .findMany({
        where: {
          member_id: memberId,
          status: { in: ['CONFIRMED', 'WAITLIST'] },
          schedule: {
            start_time: { gte: now },
          },
        },
        select: { schedule_id: true },
      })
      .then((bookings) => bookings.map((b) => b.schedule_id));

    if (existingBookingScheduleIds.length > 0) {
      where.id = { notIn: existingBookingScheduleIds };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        gym_class: {
          select: {
            id: true,
            name: true,
            category: true,
            difficulty: true,
            duration: true,
          },
        },
        trainer: {
          select: {
            id: true,
            full_name: true,
            profile_photo: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            capacity: true,
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { id: true },
        },
      },
      orderBy: { start_time: 'asc' },
      take: 50,
    });

    // Filter schedules that have available spots or waitlist
    const availableSchedulesFiltered = schedules.filter((schedule) => {
      // Calculate actual bookings count from bookings array (CONFIRMED status)
      const confirmedBookings = schedule.bookings?.length || 0;
      // Use current_bookings field if available, otherwise calculate from bookings
      const currentBookings = schedule.current_bookings ?? confirmedBookings;
      const spotsLeft = schedule.max_capacity - currentBookings;
      return spotsLeft > 0 || schedule.waitlist_count < 10;
    });

    // Score schedules based on patterns
    const scoredSchedules = availableSchedulesFiltered.map((schedule) => {
      const score = this.scoreSchedule(schedule, patterns);
      return {
        ...schedule,
        suggestionScore: score,
      };
    });

    // Sort by score (highest first)
    return scoredSchedules.sort((a, b) => b.suggestionScore - a.suggestionScore);
  }

  /**
   * Score a schedule based on member patterns
   */
  scoreSchedule(schedule, patterns) {
    let score = 0;

    const startTime = new Date(schedule.start_time);
    const hour = startTime.getHours();
    const dayOfWeek = startTime.getDay();

    // Preferred hour (+20 points per match)
    const hourCount = patterns.preferredHours[hour] || 0;
    if (hourCount > 0) {
      score += 20 * Math.min(hourCount / 5, 1); // Cap at 20 points
    }

    // Preferred day of week (+15 points per match)
    const dayCount = patterns.preferredDays[dayOfWeek] || 0;
    if (dayCount > 0) {
      score += 15 * Math.min(dayCount / 3, 1); // Cap at 15 points
    }

    // Preferred category (+25 points per match)
    if (schedule.gym_class) {
      const categoryCount = patterns.preferredCategories[schedule.gym_class.category] || 0;
      if (categoryCount > 0) {
        score += 25 * Math.min(categoryCount / 10, 1); // Cap at 25 points
      }
    }

    // Preferred trainer (+30 points per match)
    if (schedule.trainer) {
      const trainerCount = patterns.preferredTrainers[schedule.trainer.id] || 0;
      if (trainerCount > 0) {
        score += 30 * Math.min(trainerCount / 5, 1); // Cap at 30 points
      }
    }

    // Availability bonus (+10 points if plenty of spots)
    // Calculate spotsLeft from schedule data
    const confirmedBookings = schedule.bookings?.length || 0;
    const currentBookings = schedule.current_bookings ?? confirmedBookings;
    const spotsLeft = schedule.max_capacity - currentBookings;
    const availabilityRatio = spotsLeft / schedule.max_capacity;
    if (availabilityRatio > 0.5) {
      score += 10;
    } else if (availabilityRatio > 0.2) {
      score += 5;
    }

    // Time preference (morning, afternoon, evening)
    if (hour >= 6 && hour < 12) {
      // Morning preference
      if (Object.keys(patterns.preferredHours).some((h) => h >= 6 && h < 12)) {
        score += 5;
      }
    } else if (hour >= 12 && hour < 18) {
      // Afternoon preference
      if (Object.keys(patterns.preferredHours).some((h) => h >= 12 && h < 18)) {
        score += 5;
      }
    } else if (hour >= 18 && hour < 22) {
      // Evening preference
      if (Object.keys(patterns.preferredHours).some((h) => h >= 18 && h < 22)) {
        score += 5;
      }
    }

    return Math.round(score);
  }

  /**
   * Generate AI-powered suggestions
   */
  async generateAISuggestions({ member, patterns, availableSchedules, attendanceHistory, bookingsHistory }) {
    try {
      const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL || 'http://localhost:3002';
      const aiClient = createHttpClient(MEMBER_SERVICE_URL, { timeout: 60000 }); // Increase timeout to 60s for AI calls

      const analysis = {
        member: {
          id: member.id,
          fullName: member.full_name || member.fullName || 'Unknown',
          fitnessGoals: Array.isArray(member.fitness_goals) ? member.fitness_goals : (member.fitnessGoals || []),
          medicalConditions: Array.isArray(member.medical_conditions) ? member.medical_conditions : (member.medicalConditions || []),
        },
        patterns: {
          preferredHours: Object.entries(patterns.preferredHours)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([hour, count]) => ({ hour: parseInt(hour), count })),
          preferredDays: Object.entries(patterns.preferredDays)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([day, count]) => ({ day: parseInt(day), count })),
          preferredCategories: Object.entries(patterns.preferredCategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count })),
          averageAttendanceRate: patterns.averageAttendanceRate,
          cancellationRate: patterns.cancellationRate,
        },
        availableSchedules: availableSchedules.slice(0, 20).map((s) => {
          // Calculate spotsLeft from schedule data
          const confirmedBookings = s.bookings?.length || 0;
          const currentBookings = s.current_bookings ?? confirmedBookings;
          const spotsLeft = s.max_capacity - currentBookings;
          
          return {
            id: s.id,
            className: s.gym_class?.name,
            category: s.gym_class?.category,
            startTime: s.start_time,
            trainer: s.trainer?.full_name,
            spotsLeft,
            score: s.suggestionScore,
          };
        }),
      };

      const response = await aiClient.post('/ai/scheduling-suggestions', {
        member,
        analysis,
        attendanceHistory: attendanceHistory.slice(0, 20),
        bookingsHistory: bookingsHistory.slice(0, 20),
      });

      if (response.data?.success && response.data?.data?.suggestions) {
        return response.data.data.suggestions;
      }

      // Check if it's a rate limit error
      const errorCode = response.data?.data?.errorCode || response.data?.errorCode;
      if (errorCode === 'RATE_LIMIT_EXCEEDED') {
        console.log('⚠️ AI rate limit exceeded for scheduling suggestions');
      }

      return null;
    } catch (error) {
      const isRateLimit = error.response?.status === 429 || 
                         error.response?.data?.errorCode === 'RATE_LIMIT_EXCEEDED';
      
      if (isRateLimit) {
        console.log('⚠️ AI service rate limit exceeded for scheduling suggestions');
      } else {
        console.error('AI scheduling suggestions error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
        });
      }
      
      return null;
    }
  }

  /**
   * Generate rule-based suggestions
   */
  generateRuleBasedSuggestions({ patterns, availableSchedules, upcomingBookings }) {
    const suggestions = [];

    // Top 5 scored schedules
    const topSchedules = availableSchedules.slice(0, 5);

    topSchedules.forEach((schedule, index) => {
      const startTime = new Date(schedule.start_time);

      let reason = '';
      let priority = 'MEDIUM';

      // Check if matches preferred hour
      const hour = startTime.getHours();
      if (patterns.preferredHours[hour]) {
        reason += `Matches your preferred time (${hour}:00). `;
        priority = 'HIGH';
      }

      // Check if matches preferred category
      if (schedule.gym_class && patterns.preferredCategories[schedule.gym_class.category]) {
        reason += `You often attend ${schedule.gym_class.category} classes. `;
        priority = 'HIGH';
      }

      // Check if matches preferred trainer
      if (schedule.trainer && patterns.preferredTrainers[schedule.trainer.id]) {
        reason += `Your favorite trainer is teaching. `;
        priority = 'HIGH';
      }

      // Check availability - calculate spotsLeft from schedule data
      const confirmedBookings = schedule.bookings?.length || 0;
      const currentBookings = schedule.current_bookings ?? confirmedBookings;
      const spotsLeftCalc = schedule.max_capacity - currentBookings;
      const availabilityRatio = spotsLeftCalc / schedule.max_capacity;
      
      if (availabilityRatio > 0.5) {
        reason += `Plenty of spots available. `;
      } else if (availabilityRatio < 0.2) {
        reason += `Limited spots - book soon! `;
        priority = 'HIGH';
      }

      if (!reason) {
        reason = 'Good match based on your preferences.';
      }

      suggestions.push({
        scheduleId: schedule.id,
        className: schedule.gym_class?.name || 'Unknown',
        category: schedule.gym_class?.category || 'Unknown',
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        trainer: schedule.trainer
          ? {
              id: schedule.trainer.id,
              name: schedule.trainer.full_name,
              avatar: schedule.trainer.profile_photo,
            }
          : null,
        room: schedule.room
          ? {
              id: schedule.room.id,
              name: schedule.room.name,
              capacity: schedule.room.capacity,
            }
          : null,
        spotsLeft: spotsLeftCalc,
        maxCapacity: schedule.max_capacity,
        score: schedule.suggestionScore,
        priority,
        reason: reason.trim(),
        isWaitlist: spotsLeftCalc === 0,
      });
    });

    return suggestions;
  }
}

module.exports = new SmartSchedulingService();

