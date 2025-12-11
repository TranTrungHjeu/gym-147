const { prisma } = require('../lib/prisma.js');
const {
  validateClassCreation,
  getAvailableCategories: getAvailableCategoriesForTrainer,
} = require('../services/class-validation.service.js');
const memberService = require('../services/member.service.js');
const { createHttpClient } = require('../services/http-client.js');
const smartSchedulingService = require('../services/smart-scheduling.service.js');
const vectorSearchService = require('../services/vector-search.service.js');
const scoringService = require('../services/scoring.service.js');
const cacheService = require('../services/cache.service.js');
const embeddingService = require('../services/embedding.service.js');

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
                data: {
                  errors: [
                    `Sức chứa không được vượt quá sức chứa của phòng (${room.capacity} người)`,
                  ],
                },
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
            equipmentArray = equipment_needed
              .split(',')
              .map(item => item.trim())
              .filter(Boolean);
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

      // Generate and update class_embedding after class creation
      try {
        console.log(`[EMBEDDING] Generating class embedding for class ${gymClass.id}...`);
        const classDescriptionText = embeddingService.buildClassDescriptionText(gymClass);
        
        if (classDescriptionText && classDescriptionText.trim().length > 0) {
          const embedding = await embeddingService.generateEmbedding(classDescriptionText);
          
          // Format vector for PostgreSQL
          const vectorString = embeddingService.formatVectorForPostgres(embedding);
          
          // Update class_embedding using raw query (Prisma doesn't support vector type directly)
          // Use parameterized query to prevent SQL injection
          await prisma.$executeRaw`
            UPDATE schedule_schema.gym_classes 
            SET class_embedding = ${vectorString}::vector 
            WHERE id = ${gymClass.id}
          `;
          
          console.log(`[SUCCESS] [EMBEDDING] Updated class_embedding for class ${gymClass.id}`);
        } else {
          console.warn(`[WARNING] [EMBEDDING] Class description text is empty for class ${gymClass.id}, skipping embedding generation`);
        }
      } catch (embeddingError) {
        // Don't fail the creation if embedding generation fails
        console.error('[ERROR] [EMBEDDING] Failed to generate class embedding:', {
          classId: gymClass.id,
          error: embeddingError.message,
          stack: embeddingError.stack,
        });
      }

      // Notify admins and super-admins about new class creation
      // Only notify if class is created by a trainer (trainer_id is provided)
      if (trainer_id && global.io) {
        try {
          const notificationService = require('../services/notification.service.js');
          console.log('[BELL] Starting admin notification process for new class...');

          const admins = await notificationService.getAdminsAndSuperAdmins();
          console.log(
            `[LIST] Found ${admins.length} admin/super-admin users:`,
            admins.map(a => ({ user_id: a.user_id, email: a.email, role: a.role }))
          );

          // Get trainer info if trainer_id is provided
          let trainerInfo = null;
          if (trainer_id) {
            const trainer = await prisma.trainer.findUnique({
              where: { id: trainer_id },
              select: {
                id: true,
                full_name: true,
                user_id: true,
              },
            });
            trainerInfo = trainer;
          }

          // Create notifications for all admins
          const adminNotifications = admins.map(admin => ({
            user_id: admin.user_id,
            type: 'GENERAL',
            title: 'Lớp học mới được tạo',
            message: trainerInfo
              ? `${trainerInfo.full_name} đã tạo lớp học mới: ${gymClass.name}`
              : `Lớp học mới đã được tạo: ${gymClass.name}`,
            data: {
              class_id: gymClass.id,
              class_name: gymClass.name,
              class_category: gymClass.category,
              class_difficulty: gymClass.difficulty,
              class_duration: gymClass.duration,
              class_max_capacity: gymClass.max_capacity,
              class_price: gymClass.price,
              trainer_id: trainerInfo?.id || null,
              trainer_name: trainerInfo?.full_name || null,
              created_at: gymClass.created_at,
              role: 'TRAINER', // Add role to identify notification source
            },
            channels: ['IN_APP', 'PUSH'],
          }));

          // Create notifications in identity service
          if (adminNotifications.length > 0) {
            console.log(
              `💾 Creating ${adminNotifications.length} notifications in identity service...`
            );

            const createdNotifications = [];
            for (const notificationData of adminNotifications) {
              try {
                const created = await notificationService.createNotificationInIdentityService(
                  notificationData,
                  'normal'
                );
                createdNotifications.push(created);
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
            if (validNotifications.length > 0) {
              console.log(
                `[EMIT] Starting to emit socket events to ${validNotifications.length} admin(s)...`
              );

              validNotifications.forEach(notification => {
                const roomName = `user:${notification.user_id}`;
                const socketData = {
                  class_id: gymClass.id,
                  class_name: gymClass.name,
                  class_category: gymClass.category,
                  class_difficulty: gymClass.difficulty,
                  trainer_name: trainerInfo?.full_name || null,
                  created_at: gymClass.created_at,
                };

                const room = global.io.sockets.adapter.rooms.get(roomName);
                const socketCount = room ? room.size : 0;

                console.log(
                  `[EMIT] Emitting class:new to room ${roomName} (${socketCount} socket(s) connected)`,
                  socketData
                );
                global.io.to(roomName).emit('class:new', socketData);
              });

              console.log(
                `[SUCCESS] Sent ${adminNotifications.length} notifications to admins about new class`
              );
            }
          } else {
            console.warn('[WARN] No admin notifications to send (adminNotifications.length = 0)');
          }
        } catch (notifError) {
          console.error('[ERROR] Error sending admin notifications for new class:', notifError);
          console.error('Error stack:', notifError.stack);
          // Don't fail the request if notification fails
        }
      }

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

      // Generate and update class_embedding if class data changed
      // Check if any embedding-relevant fields were updated
      const embeddingRelevantFields = ['name', 'description', 'category', 'difficulty', 'equipment_needed', 'duration'];
      const hasEmbeddingRelevantChanges = embeddingRelevantFields.some(
        field => req.body[field] !== undefined
      );

      if (hasEmbeddingRelevantChanges) {
        try {
          console.log(`[EMBEDDING] Regenerating class embedding for class ${gymClass.id}...`);
          const classDescriptionText = embeddingService.buildClassDescriptionText(gymClass);
          
          if (classDescriptionText && classDescriptionText.trim().length > 0) {
            const embedding = await embeddingService.generateEmbedding(classDescriptionText);
            
            // Format vector for PostgreSQL
            const vectorString = embeddingService.formatVectorForPostgres(embedding);
            
            // Update class_embedding using raw query (Prisma doesn't support vector type directly)
            // Use parameterized query to prevent SQL injection
            await prisma.$executeRaw`
              UPDATE schedule_schema.gym_classes 
              SET class_embedding = ${vectorString}::vector 
              WHERE id = ${gymClass.id}
            `;
            
            console.log(`[SUCCESS] [EMBEDDING] Updated class_embedding for class ${gymClass.id}`);
          } else {
            console.warn(`[WARNING] [EMBEDDING] Class description text is empty for class ${gymClass.id}, skipping embedding generation`);
          }
        } catch (embeddingError) {
          // Don't fail the update if embedding generation fails
          console.error('[ERROR] [EMBEDDING] Failed to generate class embedding:', {
            classId: gymClass.id,
            error: embeddingError.message,
            stack: embeddingError.stack,
          });
        }
      }

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
      const { useAI = 'true', useVector = 'true', skipCache = 'false' } = req.query;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // Generate cache key
      const cacheParams = {
        useAI: useAI === 'true' ? '1' : '0',
        useVector: useVector === 'true' ? '1' : '0',
      };
      const cacheKey = cacheService.generateRecommendationKey(memberId, cacheParams);

      // Try to get from cache first (unless skipCache is true)
      if (skipCache !== 'true') {
        const cachedResult = await cacheService.get(cacheKey);
        if (cachedResult) {
          console.log('[SUCCESS] Returning cached recommendations for member:', memberId);
          return res.json({
            success: true,
            message: 'Class recommendations retrieved successfully (cached)',
            data: {
              ...cachedResult,
              cached: true,
            },
          });
        }
      }

      // Get member data from member-service (graceful fallback if unavailable)
      let member;
      let canUseAI = false;
      try {
        console.log(`[SEARCH] [getClassRecommendations] Fetching member ${memberId}...`);
        member = await memberService.getMemberById(memberId);
        if (!member) {
          console.warn(`[WARNING] [getClassRecommendations] Member ${memberId} not found`);
          return res.status(404).json({
            success: false,
            message: 'Member not found',
            data: null,
          });
        }
        console.log(
          `[SUCCESS] [getClassRecommendations] Member fetched: ${member.full_name || member.id}`,
          {
            hasProfileEmbedding: !!member.profile_embedding,
            profileEmbeddingType: member.profile_embedding
              ? typeof member.profile_embedding
              : 'none',
            profileEmbeddingLength: member.profile_embedding?.length || 0,
          }
        );
        // Check if member has AI recommendations enabled (Premium feature)
        canUseAI =
          ['PREMIUM', 'VIP'].includes(member.membership_type) &&
          member.ai_class_recommendations_enabled === true;
        console.log(
          `[INFO] [getClassRecommendations] AI enabled: ${canUseAI} (membership: ${member.membership_type}, ai_enabled: ${member.ai_class_recommendations_enabled})`
        );
      } catch (memberError) {
        console.error(
          '[ERROR] [getClassRecommendations] Failed to fetch member data, using rule-based recommendations:',
          {
            memberId,
            error: memberError.message,
            stack: memberError.stack,
          }
        );
        // Continue with rule-based recommendations without member data
        member = null;
        canUseAI = false;
      }

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

      // Try vector-based recommendations first (if member has embedding)
      const useVectorParam = useVector === 'true'; // Default: true
      console.log('[SEARCH] [getClassRecommendations] Vector-based check:', {
        useVectorParam,
        hasMember: !!member,
        hasProfileEmbedding: !!member?.profile_embedding,
        profileEmbeddingType: member?.profile_embedding ? typeof member.profile_embedding : 'none',
        profileEmbeddingLength: member?.profile_embedding?.length || 0,
      });

      if (useVectorParam && member && member.profile_embedding) {
        try {
          console.log('[SEARCH] [getClassRecommendations] Using vector-based recommendations');
          recommendations = await this.generateVectorBasedRecommendations({
            member,
            memberId,
            attendanceHistory,
            bookingsHistory,
            favorites,
            upcomingSchedules,
          });

          if (recommendations && recommendations.length > 0) {
            console.log(
              `[SUCCESS] [getClassRecommendations] Generated ${recommendations.length} vector-based recommendations`
            );

            // Cache the result (TTL: 1 hour = 3600 seconds)
            const resultData = {
              recommendations,
              method: 'vector_embedding',
              generatedAt: new Date().toISOString(),
            };
            await cacheService.set(cacheKey, resultData, 3600);

            return res.json({
              success: true,
              message: 'Class recommendations retrieved successfully (vector-based)',
              data: {
                ...resultData,
                cached: false,
              },
            });
          }
        } catch (vectorError) {
          console.warn(
            '[WARNING] [getClassRecommendations] Vector-based recommendations failed, falling back:',
            {
              message: vectorError.message,
              stack: vectorError.stack,
              memberId,
            }
          );
          // Continue to AI or rule-based
        }
      } else {
        console.warn('[WARNING] [getClassRecommendations] Skipping vector-based recommendations:', {
          useVectorParam,
          hasMember: !!member,
          hasProfileEmbedding: !!member?.profile_embedding,
          reason: !member
            ? 'No member data'
            : !member.profile_embedding
            ? 'No profile_embedding'
            : 'useVector=false',
        });
      }

      if (useAI === 'true' && canUseAI) {
        try {
          const { MEMBER_SERVICE_URL } = require('../config/serviceUrls.js');
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
            console.log('[SUCCESS] AI class recommendations generated:', recommendations.length);
          } else {
            // Check if it's a rate limit error
            const errorCode = response.data?.data?.errorCode || response.data?.errorCode;
            if (errorCode === 'RATE_LIMIT_EXCEEDED') {
              console.log(
                '[WARNING] AI rate limit exceeded, falling back to rule-based recommendations'
              );
            } else {
              console.log('[WARNING] AI recommendations failed, falling back to rule-based');
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
          const isRateLimit =
            aiError.response?.status === 429 ||
            aiError.response?.data?.errorCode === 'RATE_LIMIT_EXCEEDED';
          const isTimeout = aiError.code === 'ECONNABORTED' || aiError.message.includes('timeout');

          if (isRateLimit) {
            console.log(
              '[WARNING] AI service rate limit exceeded, falling back to rule-based recommendations'
            );
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
      } else if (useAI === 'true' && !canUseAI && member) {
        // Member wants AI but doesn't have access - return message
        console.log('[WARNING] Member requested AI but does not have access:', {
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
          member: member || null,
        });
      }

      // Prepare response data
      const resultData = {
        recommendations,
        analysis,
        method:
          recommendations.length > 0 && recommendations[0].type === 'VECTOR_RECOMMENDATION'
            ? 'vector_embedding'
            : analysis
            ? 'ai_based'
            : 'rule_based',
        generatedAt: new Date().toISOString(),
      };

      // Cache the result (TTL: 1 hour = 3600 seconds)
      await cacheService.set(cacheKey, resultData, 3600);

      res.json({
        success: true,
        message: 'Class recommendations retrieved successfully',
        data: {
          ...resultData,
          cached: false,
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

  /**
   * Generate recommendations using vector embedding and scoring formula
   * Implements: Vector Search -> Filtering -> Scoring -> Ranking
   */
  async generateVectorBasedRecommendations({
    member,
    memberId,
    attendanceHistory,
    bookingsHistory,
    favorites,
    upcomingSchedules,
  }) {
    try {
      // Step 1: Get member vector embedding
      let memberVector = null;
      if (member.profile_embedding) {
        // profile_embedding is an array from member-service (already parsed from string)
        memberVector = member.profile_embedding;
      } else {
        // Fallback: try to get from member service
        try {
          const memberData = await memberService.getMemberById(memberId);
          if (memberData?.profile_embedding) {
            memberVector = memberData.profile_embedding;
          }
        } catch (e) {
          console.warn('Could not fetch member embedding:', e.message);
        }
      }

      if (!memberVector) {
        throw new Error('Member vector embedding not available');
      }

      // Convert array to PostgreSQL vector string format if needed
      // searchSimilarClasses will handle the conversion, but we log it here
      console.log('[SEARCH] [generateVectorBasedRecommendations] Using member vector:', {
        isArray: Array.isArray(memberVector),
        length: Array.isArray(memberVector) ? memberVector.length : 0,
        type: typeof memberVector,
      });

      // Step 2: Vector Search - Get top 50 candidates
      console.log('[SEARCH] [generateVectorBasedRecommendations] Starting vector search...');
      const candidates = await vectorSearchService.searchSimilarClasses(memberVector, 50);
      console.log(
        `[STATS] [generateVectorBasedRecommendations] Vector search returned ${candidates.length} candidates`
      );

      if (candidates.length === 0) {
        console.warn(
          '[WARNING] [generateVectorBasedRecommendations] No candidates found from vector search'
        );
        return [];
      }

      // Step 3: Apply filtering constraints
      console.log(
        `[SEARCH] [generateVectorBasedRecommendations] Filtering ${candidates.length} candidates...`
      );
      const filteredCandidates = this.filterCandidates({
        candidates,
        member,
        attendanceHistory,
        upcomingSchedules,
      });
      console.log(
        `[STATS] [generateVectorBasedRecommendations] After filtering: ${filteredCandidates.length} candidates remaining`
      );

      if (filteredCandidates.length === 0) {
        console.warn(
          '[WARNING] [generateVectorBasedRecommendations] All candidates were filtered out'
        );
        return [];
      }

      // Step 4: Calculate metrics for scoring
      console.log(
        `[SEARCH] [generateVectorBasedRecommendations] Calculating metrics for ${filteredCandidates.length} candidates...`
      );
      const classesWithMetrics = await Promise.all(
        filteredCandidates.map(async candidate => {
          // Get popularity metrics
          const attendanceStats = await prisma.attendance.groupBy({
            by: ['schedule_id'],
            where: {
              schedule: {
                class_id: candidate.id,
              },
            },
            _count: true,
          });

          const bookingStats = await prisma.booking.groupBy({
            by: ['schedule_id'],
            where: {
              schedule: {
                class_id: candidate.id,
              },
            },
            _count: true,
          });

          const ratings = await prisma.attendance.findMany({
            where: {
              schedule: {
                class_id: candidate.id,
              },
              class_rating: { not: null },
            },
            select: {
              class_rating: true,
            },
          });

          const attendanceCount = attendanceStats.length;
          const bookingCount = bookingStats.length;
          const averageRating =
            ratings.length > 0
              ? ratings.reduce((sum, r) => sum + (r.class_rating || 0), 0) / ratings.length
              : 0;
          const completionRate = bookingCount > 0 ? attendanceCount / bookingCount : 0;

          // Get last schedule date for recency
          const lastSchedule = await prisma.schedule.findFirst({
            where: {
              class_id: candidate.id,
              status: { in: ['COMPLETED', 'IN_PROGRESS'] },
            },
            orderBy: { start_time: 'desc' },
            select: { start_time: true },
          });

          return {
            ...candidate,
            popularity: scoringService.calculatePopularity({
              attendanceCount,
              bookingCount,
              averageRating,
              completionRate,
              maxCapacity: candidate.max_capacity || 20,
            }),
            recency: scoringService.calculateRecency(lastSchedule?.start_time || null),
          };
        })
      );

      // Step 5: Calculate final scores and rank
      console.log(
        `[STATS] [generateVectorBasedRecommendations] Calculated metrics for ${classesWithMetrics.length} classes`
      );
      const recentCategories = attendanceHistory
        .slice(0, 10)
        .map(a => a.schedule?.gym_class?.category)
        .filter(Boolean);

      console.log(
        `[SEARCH] [generateVectorBasedRecommendations] Scoring and ranking ${classesWithMetrics.length} classes...`
      );
      const rankedClasses = scoringService.scoreAndRankClasses(
        classesWithMetrics,
        recentCategories
      );
      console.log(
        `[STATS] [generateVectorBasedRecommendations] Ranked ${rankedClasses.length} classes`
      );

      // Step 6: Convert to recommendation format (top 5)
      const recommendations = rankedClasses.slice(0, 5).map((classItem, index) => ({
        type: 'VECTOR_RECOMMENDATION',
        priority: index < 2 ? 'HIGH' : 'MEDIUM',
        title: classItem.name,
        message: `Lớp học phù hợp với mục tiêu của bạn (điểm: ${(
          classItem.finalScore * 100
        ).toFixed(1)}%)`,
        action: 'VIEW_SCHEDULE',
        data: {
          classId: classItem.id,
          classCategory: classItem.category,
          similarity: classItem.similarity,
          finalScore: classItem.finalScore,
        },
        reasoning: `Cosine similarity: ${(classItem.similarity * 100).toFixed(1)}%, Popularity: ${(
          classItem.popularity * 100
        ).toFixed(1)}%, Recency: ${(classItem.recency * 100).toFixed(1)}%`,
      }));

      console.log(
        `[SUCCESS] [generateVectorBasedRecommendations] Generated ${recommendations.length} vector-based recommendations:`,
        recommendations.map(r => ({
          title: r.title,
          priority: r.priority,
          similarity: r.data?.similarity,
        }))
      );

      return recommendations;
    } catch (error) {
      console.error('[ERROR] Error in vector-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Filter candidates based on constraints
   */
  filterCandidates({ candidates, member, attendanceHistory, upcomingSchedules }) {
    let filteredCount = 0;
    const filtered = candidates.filter(candidate => {
      // Filter 1: Difficulty matching (skip if member level unknown)
      // Filter 2: Medical conditions (skip if no medical data)
      if (member?.medical_conditions && member.medical_conditions.length > 0) {
        // Basic check: skip high-intensity classes if member has heart conditions
        const hasHeartCondition = member.medical_conditions.some(
          cond => cond.toLowerCase().includes('tim') || cond.toLowerCase().includes('heart')
        );
        if (
          hasHeartCondition &&
          candidate.difficulty === 'ADVANCED' &&
          candidate.category === 'CARDIO'
        ) {
          filteredCount++;
          console.log(
            `🚫 [filterCandidates] Filtered out ${candidate.name} (heart condition + ADVANCED CARDIO)`
          );
          return false;
        }
      }

      // Filter 3: Active classes only
      // Note: candidates from vector search don't have is_active field, so this check might filter everything
      // We should check if the field exists before filtering
      if (candidate.hasOwnProperty('is_active') && !candidate.is_active) {
        filteredCount++;
        console.log(`🚫 [filterCandidates] Filtered out ${candidate.name} (not active)`);
        return false;
      }

      return true;
    });

    if (filteredCount > 0) {
      console.log(
        `[STATS] [filterCandidates] Filtered out ${filteredCount} candidates, ${filtered.length} remaining`
      );
    }

    return filtered;
  }

  generateRuleBasedRecommendations({
    attendanceHistory,
    bookingsHistory,
    favorites,
    upcomingSchedules,
    member,
  }) {
    const recommendations = [];

    // Check if member has never attended classes
    if (attendanceHistory.length === 0 && bookingsHistory.length === 0) {
      recommendations.push({
        type: 'NEW_CLASS',
        priority: 'HIGH',
        title: 'Start Your Class Journey',
        message:
          "You haven't attended any classes yet. Try a beginner-friendly class to get started!",
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
          message: `Your attendance rate is ${attendanceRate.toFixed(
            1
          )}%. Consider booking classes at times that work better for your schedule.`,
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
      const allCategories = [
        'CARDIO',
        'STRENGTH',
        'YOGA',
        'PILATES',
        'DANCE',
        'MARTIAL_ARTS',
        'AQUA',
        'FUNCTIONAL',
        'RECOVERY',
      ];
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

    // If no recommendations and no member data, suggest basic classes
    if (recommendations.length === 0 && !member) {
      recommendations.push({
        type: 'EXPLORE_CLASSES',
        priority: 'MEDIUM',
        title: 'Explore Available Classes',
        message: 'Discover new classes and find what works best for you!',
        action: 'VIEW_SCHEDULE',
        data: {},
        reasoning: 'Member data unavailable, showing general recommendations',
      });
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
      // Get memberId from req.params directly (safe in catch block)
      const errorMemberId = req.params?.memberId || 'unknown';
      // Build options safely for logging (may not exist if error occurred early)
      const errorOptions = {
        classId: req.query?.classId || null,
        category: req.query?.category || null,
        trainerId: req.query?.trainerId || null,
        dateRange: req.query?.dateRange ? parseInt(req.query.dateRange) : 30,
        useAI: req.query?.useAI !== 'false',
      };
      console.error('Get scheduling suggestions error:', {
        memberId: errorMemberId,
        error: error.message,
        stack: error.stack,
        options: errorOptions,
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
