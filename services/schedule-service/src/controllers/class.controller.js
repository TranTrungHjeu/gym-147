const { prisma } = require('../lib/prisma.js');
const {
  validateClassCreation,
  getAvailableCategories: getAvailableCategoriesForTrainer,
} = require('../services/class-validation.service.js');
const memberService = require('../services/member.service.js');
const { createHttpClient } = require('../services/http-client.js');
const smartSchedulingService = require('../services/smart-scheduling.service.js');

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

const hydrateScheduleBookings = async schedule => {
  const bookings = schedule.bookings || [];
  const memberIds = [...new Set(bookings.map(booking => booking.member_id).filter(Boolean))];

  if (memberIds.length === 0) {
    return {
      ...schedule,
      bookings: bookings.map(booking => ({ ...booking, member: null })),
    };
  }

  try {
    const members = await memberService.getMembersByIds(memberIds);
    const memberMap = toMemberMap(members);

    return {
      ...schedule,
      bookings: bookings.map(booking => ({
        ...booking,
        member: memberMap[booking.member_id] || null,
      })),
    };
  } catch (error) {
    console.error('ClassController:hydrateScheduleBookings error:', error.message);
    return {
      ...schedule,
      bookings: bookings.map(booking => ({ ...booking, member: null })),
    };
  }
};

class ClassController {
  async getAllClasses(req, res) {
    try {
      const classes = await prisma.gymClass.findMany({
        include: {
          schedules: {
            include: {
              trainer: true,
              room: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Classes retrieved successfully',
        data: { classes },
      });
    } catch (error) {
      console.error('Get classes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getClassById(req, res) {
    try {
      const { id } = req.params;
      const gymClass = await prisma.gymClass.findUnique({
        where: { id },
        include: {
          schedules: {
            include: {
              trainer: true,
              room: true,
              bookings: true,
            },
          },
        },
      });

      if (!gymClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found',
          data: null,
        });
      }

      // Hydrate bookings with member details for all schedules
      const schedulesWithMembers = await Promise.all(
        gymClass.schedules.map(schedule => hydrateScheduleBookings(schedule))
      );

      const gymClassWithHydratedSchedules = {
        ...gymClass,
        schedules: schedulesWithMembers,
      };

      res.json({
        success: true,
        message: 'Class retrieved successfully',
        data: { class: gymClassWithHydratedSchedules },
      });
    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createClass(req, res) {
    try {
      const {
        name,
        description,
        category,
        duration,
        max_capacity,
        difficulty,
        equipment_needed,
        price,
        thumbnail,
        required_certification_level,
        trainer_id, // Add trainer_id for validation
        room_id, // Add room_id to get max_capacity from room
      } = req.body;

      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Class name is required',
          data: { errors: ['Tên lớp học là bắt buộc'] },
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Class category is required',
          data: { errors: ['Danh mục lớp học là bắt buộc'] },
        });
      }

      if (!difficulty) {
        return res.status(400).json({
          success: false,
          message: 'Class difficulty is required',
          data: { errors: ['Cấp độ lớp học là bắt buộc'] },
        });
      }

      // Validate and parse duration
      // duration is REQUIRED in schema (no default), so must be provided
      let parsedDuration;
      if (duration === undefined || duration === null || duration === '') {
        return res.status(400).json({
          success: false,
          message: 'Duration is required',
          data: { errors: ['Thời lượng là bắt buộc'] },
        });
      }
      parsedDuration = parseInt(duration);
      if (isNaN(parsedDuration) || parsedDuration < 15 || parsedDuration > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid duration',
          data: { errors: ['Thời lượng phải từ 15 đến 180 phút'] },
        });
      }

      // Validate and parse max_capacity
      // max_capacity should be taken from room.capacity if room_id is provided
      let parsedMaxCapacity;
      if (room_id) {
        // Get room to retrieve its capacity
        const room = await prisma.room.findUnique({
          where: { id: room_id },
        });

        if (!room) {
          return res.status(404).json({
            success: false,
            message: 'Room not found',
            data: { errors: ['Không tìm thấy phòng học'] },
          });
        }

        // Use room.capacity as max_capacity for GymClass
        parsedMaxCapacity = room.capacity;

        // If max_capacity is also provided, validate it doesn't exceed room.capacity
        if (max_capacity !== undefined && max_capacity !== null && max_capacity !== '') {
          const providedCapacity = parseInt(max_capacity);
          if (!isNaN(providedCapacity) && providedCapacity > 0) {
            if (providedCapacity > room.capacity) {
              return res.status(400).json({
                success: false,
                message: 'Invalid max capacity',
                data: { errors: [`Sức chứa không được vượt quá sức chứa của phòng (${room.capacity} người)`] },
              });
            }
            // Use provided capacity if it's valid and <= room.capacity
            parsedMaxCapacity = providedCapacity;
          }
        }
      } else {
        // If no room_id provided, validate max_capacity if provided
        if (max_capacity === undefined || max_capacity === null || max_capacity === '') {
          return res.status(400).json({
            success: false,
            message: 'Room ID or max capacity is required',
            data: { errors: ['Phải cung cấp room_id hoặc max_capacity'] },
          });
        }
        parsedMaxCapacity = parseInt(max_capacity);
        if (isNaN(parsedMaxCapacity) || parsedMaxCapacity < 1 || parsedMaxCapacity > 100) {
          return res.status(400).json({
            success: false,
            message: 'Invalid max capacity',
            data: { errors: ['Sức chứa phải từ 1 đến 100 người'] },
          });
        }
      }

      // Validate equipment_needed is an array
      let equipmentArray = [];
      if (equipment_needed) {
        if (Array.isArray(equipment_needed)) {
          equipmentArray = equipment_needed;
        } else if (typeof equipment_needed === 'string') {
          // Try to parse as JSON array if it's a string
          try {
            equipmentArray = JSON.parse(equipment_needed);
          } catch {
            // If not JSON, treat as comma-separated string
            equipmentArray = equipment_needed.split(',').map(item => item.trim()).filter(Boolean);
          }
        }
      }

      // Validate and parse price
      let parsedPrice = null;
      if (price !== undefined && price !== null && price !== '') {
        parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid price',
            data: { errors: ['Giá không hợp lệ'] },
          });
        }
      }

      // Validate trainer certification if trainer_id is provided
      if (trainer_id) {
        const validation = await validateClassCreation(trainer_id, {
          category,
          required_certification_level: required_certification_level || 'BASIC',
        });

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Class creation validation failed',
            data: {
              errors: validation.errors,
            },
          });
        }

        // Add warnings if any
        if (validation.errors.length > 0) {
          console.warn('Class creation warnings:', validation.errors);
        }
      }

      const gymClass = await prisma.gymClass.create({
        data: {
          name: name.trim(),
          description: description && description.trim() ? description.trim() : null,
          category,
          duration: parsedDuration,
          max_capacity: parsedMaxCapacity,
          difficulty,
          equipment_needed: equipmentArray,
          price: parsedPrice,
          thumbnail: thumbnail && thumbnail.trim() ? thumbnail.trim() : null,
          required_certification_level: required_certification_level || 'BASIC',
          is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: { class: gymClass },
      });
    } catch (error) {
      console.error('Create class error:', error);
      
      // Handle Prisma validation errors
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Duplicate entry',
          data: { errors: ['Lớp học với thông tin này đã tồn tại'] },
        });
      }

      // Handle Prisma constraint errors
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reference',
          data: { errors: ['Thông tin tham chiếu không hợp lệ'] },
        });
      }

      // Handle validation errors
      if (error.name === 'PrismaClientValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          data: { errors: ['Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.'] },
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  async updateClass(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        duration,
        max_capacity,
        difficulty,
        equipment_needed,
        price,
        thumbnail,
        is_active,
      } = req.body;

      const gymClass = await prisma.gymClass.update({
        where: { id },
        data: {
          name,
          description,
          category,
          duration: duration ? parseInt(duration) : undefined,
          max_capacity: max_capacity ? parseInt(max_capacity) : undefined,
          difficulty,
          equipment_needed: equipment_needed || [],
          price: price ? parseFloat(price) : undefined,
          thumbnail,
          is_active,
        },
      });

      res.json({
        success: true,
        message: 'Class updated successfully',
        data: { class: gymClass },
      });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteClass(req, res) {
    try {
      const { id } = req.params;

      await prisma.gymClass.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Class deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getAvailableCategories(req, res) {
    try {
      const { trainerId } = req.params;

      const categories = await getAvailableCategoriesForTrainer(trainerId);

      res.json({
        success: true,
        message: 'Available categories retrieved successfully',
        data: { categories },
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

  // Get personalized class recommendations (AI-powered)
  async getClassRecommendations(req, res) {
    try {
      const { memberId } = req.params;
      const { useAI = 'true' } = req.query;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // Get member data from member-service
      const member = await memberService.getMemberById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Check if member has AI recommendations enabled (Premium feature)
      const canUseAI = 
        ['PREMIUM', 'VIP'].includes(member.membership_type) &&
        (member.ai_class_recommendations_enabled === true);

      // Get attendance history
      const attendanceHistory = await prisma.attendance.findMany({
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
        take: 50,
      });

      // Get bookings history
      const bookingsHistory = await prisma.booking.findMany({
        where: {
          member_id: memberId,
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      });

      // Get favorites
      const favorites = await prisma.memberFavorite.findMany({
        where: {
          member_id: memberId,
        },
      });

      // Get upcoming schedules
      const upcomingSchedules = await prisma.schedule.findMany({
        where: {
          start_time: { gte: new Date() },
          bookings: {
            some: {
              member_id: memberId,
              status: { in: ['CONFIRMED', 'WAITLIST'] },
            },
          },
        },
        include: {
          gym_class: true,
          trainer: true,
        },
        orderBy: { start_time: 'asc' },
        take: 10,
      });

      // Call AI service from member-service
      let recommendations = [];
      let analysis = null;

      if (useAI === 'true' && canUseAI) {
        try {
          if (!process.env.MEMBER_SERVICE_URL) {
            throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
          }
          const MEMBER_SERVICE_URL = process.env.MEMBER_SERVICE_URL;
          const aiClient = createHttpClient(MEMBER_SERVICE_URL, { timeout: 60000 }); // Increase timeout to 60s for AI calls

          // Send only necessary fields to reduce payload size
          const memberData = {
            id: member.id,
            full_name: member.full_name,
            fitness_goals: member.fitness_goals || [],
            medical_conditions: member.medical_conditions || [],
            membership_type: member.membership_type,
            height: member.height,
            weight: member.weight,
            body_fat_percent: member.body_fat_percent,
          };

          const response = await aiClient.post('/ai/class-recommendations', {
            member: memberData,
            attendanceHistory: attendanceHistory.slice(0, 50), // Limit to last 50
            bookingsHistory: bookingsHistory.slice(0, 50), // Limit to last 50
            favorites: favorites.slice(0, 20), // Limit to 20 favorites
            upcomingSchedules: upcomingSchedules.slice(0, 10), // Limit to 10 upcoming
            fitnessGoals: member.fitness_goals || [],
          });

          if (response.data?.success && response.data?.data?.recommendations) {
            recommendations = response.data.data.recommendations;
            analysis = response.data.data.analysis;
            console.log('✅ AI class recommendations generated:', recommendations.length);
          } else {
            // Check if it's a rate limit error
            const errorCode = response.data?.data?.errorCode || response.data?.errorCode;
            if (errorCode === 'RATE_LIMIT_EXCEEDED') {
              console.log('⚠️ AI rate limit exceeded, falling back to rule-based recommendations');
            } else {
              console.log('⚠️ AI recommendations failed, falling back to rule-based');
            }
            recommendations = this.generateRuleBasedRecommendations({
              attendanceHistory,
              bookingsHistory,
              favorites,
              upcomingSchedules,
              member,
            });
          }
        } catch (aiError) {
          const isRateLimit = aiError.response?.status === 429 || 
                             aiError.response?.data?.errorCode === 'RATE_LIMIT_EXCEEDED';
          const isTimeout = aiError.code === 'ECONNABORTED' || aiError.message.includes('timeout');
          
          if (isRateLimit) {
            console.log('⚠️ AI service rate limit exceeded, falling back to rule-based recommendations');
          } else {
            console.error('AI recommendations error:', {
              message: aiError.message,
              code: aiError.code,
              status: aiError.response?.status,
              isTimeout: isTimeout,
            });
          }
          
          // Fall back to rule-based recommendations
          recommendations = this.generateRuleBasedRecommendations({
            attendanceHistory,
            bookingsHistory,
            favorites,
            upcomingSchedules,
            member,
          });
        }
      } else if (useAI === 'true' && !canUseAI) {
        // Member wants AI but doesn't have access - return message
        console.log('⚠️ Member requested AI but does not have access:', {
          membership_type: member.membership_type,
          ai_enabled: member.ai_class_recommendations_enabled,
        });
        // Fall back to rule-based
        recommendations = this.generateRuleBasedRecommendations({
          attendanceHistory,
          bookingsHistory,
          favorites,
          upcomingSchedules,
          member,
        });
      } else {
        // Use rule-based recommendations
        recommendations = this.generateRuleBasedRecommendations({
          attendanceHistory,
          bookingsHistory,
          favorites,
          upcomingSchedules,
          member,
        });
      }

      res.json({
        success: true,
        message: 'Class recommendations retrieved successfully',
        data: {
          recommendations,
          analysis,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Get class recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  generateRuleBasedRecommendations({ attendanceHistory, bookingsHistory, favorites, upcomingSchedules, member }) {
    const recommendations = [];

    // Check if member has never attended classes
    if (attendanceHistory.length === 0 && bookingsHistory.length === 0) {
      recommendations.push({
        type: 'NEW_CLASS',
        priority: 'HIGH',
        title: 'Start Your Class Journey',
        message: 'You haven\'t attended any classes yet. Try a beginner-friendly class to get started!',
        action: 'VIEW_SCHEDULE',
        data: {
          classCategory: 'CARDIO',
        },
        reasoning: 'No class attendance history',
      });
      return recommendations;
    }

    // Check for favorite classes that haven't been attended recently
    const favoriteClassIds = favorites
      .filter(f => f.favorite_type === 'CLASS')
      .map(f => f.favorite_id);

    if (favoriteClassIds.length > 0) {
      const recentAttendedClasses = new Set(
        attendanceHistory
          .filter(a => {
            const date = new Date(a.schedule?.start_time || a.created_at);
            return date > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
          })
          .map(a => a.schedule?.gym_class?.id)
          .filter(Boolean)
      );

      const unvisitedFavorites = favoriteClassIds.filter(id => !recentAttendedClasses.has(id));
      if (unvisitedFavorites.length > 0) {
        recommendations.push({
          type: 'REPEAT_CLASS',
          priority: 'MEDIUM',
          title: 'Return to Your Favorite Classes',
          message: `You have ${unvisitedFavorites.length} favorite class(es) you haven't attended recently. Consider booking them again!`,
          action: 'VIEW_SCHEDULE',
          data: {
            classIds: unvisitedFavorites,
          },
          reasoning: 'Favorite classes not attended recently',
        });
      }
    }

    // Check attendance rate
    if (bookingsHistory.length > 0) {
      const attendanceRate = (attendanceHistory.length / bookingsHistory.length) * 100;
      if (attendanceRate < 70) {
        recommendations.push({
          type: 'TIME_SUGGESTION',
          priority: 'HIGH',
          title: 'Improve Your Attendance',
          message: `Your attendance rate is ${attendanceRate.toFixed(1)}%. Consider booking classes at times that work better for your schedule.`,
          action: 'VIEW_SCHEDULE',
          data: {},
          reasoning: `Low attendance rate: ${attendanceRate.toFixed(1)}%`,
        });
      }
    }

    // Check for category exploration
    if (attendanceHistory.length > 0) {
      const attendedCategories = new Set(
        attendanceHistory.map(a => a.schedule?.gym_class?.category).filter(Boolean)
      );
      const allCategories = ['CARDIO', 'STRENGTH', 'YOGA', 'PILATES', 'DANCE', 'MARTIAL_ARTS', 'AQUA', 'FUNCTIONAL', 'RECOVERY'];
      const unexploredCategories = allCategories.filter(cat => !attendedCategories.has(cat));

      if (unexploredCategories.length > 0) {
        recommendations.push({
          type: 'CATEGORY_EXPLORATION',
          priority: 'MEDIUM',
          title: 'Try New Class Categories',
          message: `You haven't tried ${unexploredCategories.length} category/categories yet. Explore new types of classes for variety!`,
          action: 'EXPLORE_CATEGORY',
          data: {
            categories: unexploredCategories,
          },
          reasoning: `Unexplored categories: ${unexploredCategories.join(', ')}`,
        });
      }
    }

    return recommendations;
  }

  // Get smart scheduling suggestions for a member
  async getSchedulingSuggestions(req, res) {
    try {
      const { memberId } = req.params;
      const { classId, category, trainerId, dateRange, useAI } = req.query;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      const options = {
        classId: classId || null,
        category: category || null,
        trainerId: trainerId || null,
        dateRange: dateRange ? parseInt(dateRange) : 30,
        useAI: useAI !== 'false', // Default to true
      };

      const result = await smartSchedulingService.getSchedulingSuggestions(memberId, options);

      res.json({
        success: true,
        message: 'Scheduling suggestions retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Get scheduling suggestions error:', {
        memberId,
        error: error.message,
        stack: error.stack,
        options,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
        data: null,
      });
    }
  }
}

module.exports = new ClassController();
