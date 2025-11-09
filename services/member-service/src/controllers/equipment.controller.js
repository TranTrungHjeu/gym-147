const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const s3UploadService = require('../services/s3-upload.service');

class EquipmentController {
  // ==================== EQUIPMENT MANAGEMENT ====================

  // Get all equipment
  async getAllEquipment(req, res) {
    try {
      const { page = 1, limit = 10, category, status, location } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (category) where.category = category;
      if (status) where.status = status;
      if (location) where.location = { contains: location, mode: 'insensitive' };

      const [equipment, total] = await Promise.all([
        prisma.equipment.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            _count: {
              select: {
                usage_logs: true,
                maintenance_logs: true,
                queue: true,
              },
            },
            usage_logs: {
              orderBy: { start_time: 'desc' },
              take: 1,
              include: {
                member: {
                  select: {
                    id: true,
                    full_name: true,
                    membership_number: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        prisma.equipment.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Equipment retrieved successfully',
        data: {
          equipment,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get all equipment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get equipment by ID
  async getEquipmentById(req, res) {
    try {
      const { id } = req.params;

      const equipment = await prisma.equipment.findUnique({
        where: { id },
        include: {
          usage_logs: {
            orderBy: { start_time: 'desc' },
            take: 10,
            include: {
              member: {
                select: {
                  id: true,
                  full_name: true,
                  membership_number: true,
                },
              },
            },
          },
          maintenance_logs: {
            orderBy: { completed_at: 'desc' },
            take: 5,
          },
        },
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Equipment not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Equipment retrieved successfully',
        data: { equipment },
      });
    } catch (error) {
      console.error('Get equipment by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create equipment
  async createEquipment(req, res) {
    try {
      const {
        name,
        category,
        brand,
        model,
        serial_number,
        purchase_date,
        warranty_until,
        location,
        max_weight,
        has_heart_monitor,
        has_calorie_counter,
        has_rep_counter,
        wifi_enabled,
        photo,
        status,
      } = req.body;

      // Remove description if present (not in schema)
      const { description, ...equipmentData } = req.body;

      const equipment = await prisma.equipment.create({
        data: {
          name,
          category,
          brand,
          model,
          serial_number,
          purchase_date: purchase_date ? new Date(purchase_date) : null,
          warranty_until: warranty_until ? new Date(warranty_until) : null,
          location,
          status: status || 'AVAILABLE',
          max_weight,
          has_heart_monitor: has_heart_monitor || false,
          has_calorie_counter: has_calorie_counter || false,
          photo: photo || null,
          has_rep_counter: has_rep_counter || false,
          wifi_enabled: wifi_enabled || false,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Equipment created successfully',
        data: { equipment },
      });
    } catch (error) {
      console.error('Create equipment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update equipment
  async updateEquipment(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that don't exist in the schema
      const { description, ...validUpdateData } = updateData;

      // Convert date strings to Date objects
      if (validUpdateData.purchase_date) {
        validUpdateData.purchase_date = new Date(validUpdateData.purchase_date);
      }
      if (validUpdateData.warranty_until) {
        validUpdateData.warranty_until = new Date(validUpdateData.warranty_until);
      }
      if (validUpdateData.last_maintenance) {
        validUpdateData.last_maintenance = new Date(validUpdateData.last_maintenance);
      }
      if (validUpdateData.next_maintenance) {
        validUpdateData.next_maintenance = new Date(validUpdateData.next_maintenance);
      }

      const equipment = await prisma.equipment.update({
        where: { id },
        data: {
          ...validUpdateData,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Equipment updated successfully',
        data: { equipment },
      });
    } catch (error) {
      console.error('Update equipment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== EQUIPMENT USAGE TRACKING ====================

  // Get member's equipment usage
  async getMemberEquipmentUsage(req, res) {
    try {
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { page = 1, limit = 10, equipment_id, start_date, end_date } = req.query;
      const skip = (page - 1) * limit;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: EquipmentUsage.member_id references Member.id
      const where = { member_id: memberId };
      if (equipment_id) where.equipment_id = equipment_id;
      if (start_date || end_date) {
        where.start_time = {};
        if (start_date) where.start_time.gte = new Date(start_date);
        if (end_date) where.start_time.lte = new Date(end_date);
      }

      const [usage, total] = await Promise.all([
        prisma.equipmentUsage.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
                category: true,
                location: true,
              },
            },
          },
          orderBy: { start_time: 'desc' },
        }),
        prisma.equipmentUsage.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Member equipment usage retrieved successfully',
        data: {
          usage,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get member equipment usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Start equipment usage
  async startEquipmentUsage(req, res) {
    try {
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { equipment_id, weight_used, reps_completed } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: EquipmentUsage.member_id references Member.id

      // Check if equipment is available
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipment_id },
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Equipment not found',
          data: null,
        });
      }

      if (equipment.status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: 'Equipment is not available',
          data: null,
        });
      }

      // Check if member has active usage of this equipment
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          member_id: memberId,
          equipment_id,
          end_time: null,
        },
      });

      if (activeUsage) {
        return res.status(400).json({
          success: false,
          message: 'Member is already using this equipment',
          data: null,
        });
      }

      // Find active gym session to link equipment usage
      const activeGymSession = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      console.log('🏋️ Active gym session check:', {
        found: !!activeGymSession,
        sessionId: activeGymSession?.id,
        memberId,
      });

      // If no active gym session, create one automatically
      let sessionToLink = activeGymSession;
      if (!activeGymSession) {
        console.log('⚠️ No active gym session found. Auto-creating one...');
        sessionToLink = await prisma.gymSession.create({
          data: {
            member_id: memberId,
            entry_method: 'MOBILE_APP',
            entry_gate: 'Equipment Station',
          },
        });
        console.log('✅ Auto-created gym session:', sessionToLink.id);
      }

      // Create usage record with auto-timeout after 3 hours
      const maxDuration = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
      const autoEndTime = new Date(Date.now() + maxDuration);

      const usageData = {
        member_id: memberId,
        equipment_id,
        session_id: sessionToLink?.id || null, // Link to gym session (existing or auto-created)
        weight_used,
        reps_completed,
        auto_end_at: autoEndTime, // Auto-end after 3 hours if not manually stopped
      };

      console.log('📝 Creating equipment usage with data:', {
        member_id: usageData.member_id,
        equipment_id: usageData.equipment_id,
        session_id: usageData.session_id,
        has_session: !!usageData.session_id,
        weight_used: usageData.weight_used,
        reps_completed: usageData.reps_completed,
      });

      const usage = await prisma.equipmentUsage.create({
        data: usageData,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
              location: true,
            },
          },
        },
      });

      console.log('✅ Equipment usage created:', {
        usageId: usage.id,
        session_id: usage.session_id,
        member_id: usage.member_id,
        equipment: usage.equipment.name,
        start_time: usage.start_time,
        VERIFIED: usage.session_id === sessionToLink?.id,
      });

      // Update equipment status to IN_USE
      await prisma.equipment.update({
        where: { id: equipment_id },
        data: { status: 'IN_USE' },
      });

      // Emit WebSocket event for equipment status change
      if (global.io) {
        global.io.to(`equipment:${equipment_id}`).emit('equipment:statusChanged', {
          equipment_id,
          status: 'IN_USE',
          member_id: memberId,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Equipment usage started successfully',
        data: { usage },
      });
    } catch (error) {
      console.error('Start equipment usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Stop equipment usage
  async stopEquipmentUsage(req, res) {
    try {
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const {
        usage_id,
        sets_completed,
        weight_used,
        reps_completed,
        heart_rate_avg,
        heart_rate_max,
        sensor_data,
      } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: EquipmentUsage.member_id references Member.id

      // Find active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          id: usage_id,
          member_id: memberId,
          end_time: null,
        },
        include: {
          equipment: true,
        },
      });

      if (!activeUsage) {
        return res.status(404).json({
          success: false,
          message: 'Active equipment usage not found',
          data: null,
        });
      }

      const endTime = new Date();

      // Calculate duration in seconds for accurate calorie calculation
      const durationInSeconds = Math.floor((endTime - activeUsage.start_time) / 1000);
      const durationInMinutes = Math.floor(durationInSeconds / 60); // For storage

      // Calculate calories burned based on equipment category
      // Rates based on MET (Metabolic Equivalent of Task) values (kcal per minute)
      const calorieRates = {
        CARDIO: 12, // High intensity: Treadmill, Bike, Rowing
        STRENGTH: 6, // Moderate: Weights, Machines
        FREE_WEIGHTS: 7, // Slightly higher: Dumbbells, Barbells
        FUNCTIONAL: 8, // Dynamic movements: TRX, Kettlebells
        STRETCHING: 3, // Low intensity: Yoga, Stretching
        RECOVERY: 2, // Very low: Foam rolling, Massage
        SPECIALIZED: 5, // Variable: Special equipment
      };

      const caloriesPerMinute = calorieRates[activeUsage.equipment.category] || 6; // Default 6 kcal/min

      // Calculate calories per second for accurate measurement
      const caloriesPerSecond = caloriesPerMinute / 60;
      const exactCalories = durationInSeconds * caloriesPerSecond;
      // Ensure at least 1 calorie if duration > 0, to avoid discouraging short workouts
      const calories_burned = durationInSeconds > 0 ? Math.max(1, Math.round(exactCalories)) : 0;

      console.log('⏱️ Duration & Calories calculation:', {
        equipmentCategory: activeUsage.equipment.category,
        durationInSeconds,
        durationInMinutes,
        caloriesPerMinute,
        caloriesPerSecond: caloriesPerSecond.toFixed(4),
        exactCalories: exactCalories.toFixed(2),
        calories_burned_rounded: Math.round(exactCalories),
        calories_burned_final: calories_burned,
      });

      // Update usage record
      console.log('💾 About to save to database:', {
        usage_id,
        duration_minutes: durationInMinutes,
        calories_burned,
        session_id: activeUsage.session_id,
      });

      const usage = await prisma.equipmentUsage.update({
        where: { id: usage_id },
        data: {
          end_time: endTime,
          duration: durationInMinutes,
          calories_burned,
          sets_completed,
          weight_used,
          reps_completed,
          heart_rate_avg,
          heart_rate_max,
          sensor_data,
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
              location: true,
            },
          },
        },
      });

      console.log('✅ Saved to database:', {
        usage_id: usage.id,
        duration_stored: usage.duration,
        calories_stored: usage.calories_burned,
        session_id: usage.session_id,
        VERIFIED: usage.calories_burned === calories_burned,
      });

      // Update equipment status back to AVAILABLE
      // Calculate usage hours accurately (use seconds for precision)
      const usageHoursToAdd = durationInSeconds / 3600; // Convert seconds to hours (decimal)

      await prisma.equipment.update({
        where: { id: activeUsage.equipment_id },
        data: {
          status: 'AVAILABLE',
          usage_hours: { increment: usageHoursToAdd },
        },
      });

      // Check queue and notify next person
      const nextInQueue = await prisma.equipmentQueue.findFirst({
        where: {
          equipment_id: activeUsage.equipment_id,
          status: 'WAITING',
        },
        orderBy: {
          position: 'asc',
        },
        include: {
          member: {
            select: {
              id: true,
              user_id: true,
              full_name: true,
            },
          },
        },
      });

      if (nextInQueue) {
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes to claim

        // Update queue status to NOTIFIED
        await prisma.equipmentQueue.update({
          where: { id: nextInQueue.id },
          data: {
            status: 'NOTIFIED',
            notified_at: new Date(),
            expires_at: expiresAt,
          },
        });

        console.log(
          `🔔 Notifying ${nextInQueue.member.full_name} - ${activeUsage.equipment.name} is available`
        );

        // Emit WebSocket event to notify user (for online users)
        if (global.io) {
          global.io.to(`equipment:${activeUsage.equipment_id}`).emit('equipment:available', {
            equipment_id: activeUsage.equipment_id,
            next_member_id: nextInQueue.member_id,
          });

          // Emit to specific user room if exists
          global.io.to(`user:${nextInQueue.member.user_id}`).emit('queue:your_turn', {
            equipment_id: activeUsage.equipment_id,
            equipment_name: activeUsage.equipment.name,
            queue_id: nextInQueue.id,
            position: nextInQueue.position,
            expires_at: expiresAt,
            expires_in_minutes: 5,
          });
        }

        // Send Push Notification (for offline users)
        if (nextInQueue.member.user_id) {
          const { sendPushNotification } = require('../utils/push-notification');
          await sendPushNotification(
            nextInQueue.member.user_id,
            "🎉 It's Your Turn!",
            `${activeUsage.equipment.name} is now available. You have 5 minutes to claim it.`,
            {
              type: 'QUEUE_YOUR_TURN',
              equipment_id: activeUsage.equipment_id,
              equipment_name: activeUsage.equipment.name,
              queue_id: nextInQueue.id,
              expires_at: expiresAt.toISOString(),
            }
          );
        }
      }

      // Emit WebSocket event for equipment status change
      if (global.io) {
        global.io.to(`equipment:${activeUsage.equipment_id}`).emit('equipment:statusChanged', {
          equipment_id: activeUsage.equipment_id,
          status: 'AVAILABLE',
        });
      }

      res.json({
        success: true,
        message: 'Equipment usage stopped successfully',
        data: { usage },
      });
    } catch (error) {
      console.error('Stop equipment usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get active usage for a member and equipment
  async getActiveUsage(req, res) {
    try {
      const { equipmentId, memberId } = req.params; // memberId must be Member.id (not user_id)

      if (!memberId || !equipmentId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID and Equipment ID are required',
          data: null,
      });
      }

      // memberId must be Member.id (not user_id)
      // Schema: EquipmentUsage.member_id references Member.id

      // Find active usage (no end_time)
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          member_id: memberId,
          equipment_id: equipmentId,
          end_time: null,
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
              location: true,
            },
          },
        },
        orderBy: {
          start_time: 'desc',
        },
      });

      if (!activeUsage) {
        return res.json({
          success: true,
          message: 'No active usage found',
          data: { activeUsage: null },
        });
      }

      res.json({
        success: true,
        message: 'Active usage retrieved successfully',
        data: { activeUsage },
      });
    } catch (error) {
      console.error('Error getting active usage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active usage',
        data: null,
        error: error.message,
      });
    }
  }

  // Auto-stop expired sessions (called by cron job or interval)
  async autoStopExpiredSessions(req, res) {
    try {
      const now = new Date();

      // Find all active sessions that have passed auto_end_at time
      const expiredSessions = await prisma.equipmentUsage.findMany({
        where: {
          end_time: null,
          auto_end_at: {
            lte: now, // Less than or equal to now
          },
        },
        include: {
          equipment: true,
          member: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      });

      if (expiredSessions.length === 0) {
        return res.json({
          success: true,
          message: 'No expired sessions found',
          data: { stopped: 0 },
        });
      }

      const stoppedSessions = [];

      for (const session of expiredSessions) {
        const endTime = session.auto_end_at || new Date();

        // Calculate duration in seconds for accurate calorie calculation
        const durationInSeconds = Math.floor((endTime - session.start_time) / 1000);
        const durationInMinutes = Math.floor(durationInSeconds / 60); // For storage

        // Calculate calories based on category (kcal per minute)
        const calorieRates = {
          CARDIO: 12,
          FUNCTIONAL: 8,
          FREE_WEIGHTS: 7,
          STRENGTH: 6,
          SPECIALIZED: 5,
          STRETCHING: 3,
          RECOVERY: 2,
        };
        const caloriesPerMinute = calorieRates[session.equipment.category] || 6;

        // Calculate calories per second for accurate measurement
        const caloriesPerSecond = caloriesPerMinute / 60;
        const exactCalories = durationInSeconds * caloriesPerSecond;

        // Ensure at least 1 calorie if duration > 0
        const calories_burned = durationInSeconds > 0 ? Math.max(1, Math.round(exactCalories)) : 0;

        console.log('⏱️ [AUTO-STOP] Duration & Calories calculation:', {
          sessionId: session.id,
          equipmentCategory: session.equipment.category,
          durationInSeconds,
          durationInMinutes,
          caloriesPerMinute,
          caloriesPerSecond: caloriesPerSecond.toFixed(4),
          exactCalories: exactCalories.toFixed(2),
          calories_burned_rounded: Math.round(exactCalories),
          calories_burned_final: calories_burned,
        });

        console.log('💾 [AUTO-STOP] About to save to database:', {
          usage_id: session.id,
          duration_minutes: durationInMinutes,
          calories_burned,
          session_id: session.session_id,
        });

        // Update usage record
        const updatedUsage = await prisma.equipmentUsage.update({
          where: { id: session.id },
          data: {
            end_time: endTime,
            duration: durationInMinutes,
            calories_burned,
          },
        });

        console.log('✅ [AUTO-STOP] Saved to database:', {
          usage_id: updatedUsage.id,
          duration_stored: updatedUsage.duration,
          calories_stored: updatedUsage.calories_burned,
          session_id: updatedUsage.session_id,
          VERIFIED: updatedUsage.calories_burned === calories_burned,
        });

        // Update equipment status to AVAILABLE and increment usage hours
        const usageHoursToAdd = durationInSeconds / 3600; // Convert seconds to hours (decimal)

        await prisma.equipment.update({
          where: { id: session.equipment_id },
          data: {
            status: 'AVAILABLE',
            usage_hours: { increment: usageHoursToAdd },
          },
        });

        // Notify next in queue (if any)
        const nextInQueue = await prisma.equipmentQueue.findFirst({
          where: {
            equipment_id: session.equipment_id,
            status: 'WAITING',
          },
          orderBy: { position: 'asc' },
          include: {
            member: {
              select: {
                id: true,
                user_id: true,
                full_name: true,
              },
            },
          },
        });

        if (nextInQueue && nextInQueue.member) {
          await prisma.equipmentQueue.update({
            where: { id: nextInQueue.id },
            data: {
              status: 'NOTIFIED',
              notified_at: new Date(),
              expires_at: new Date(Date.now() + 5 * 60 * 1000),
            },
          });

          // Emit WebSocket events
          // Socket rooms use user_id (from Identity Service), not member_id
          if (global.io && nextInQueue.member.user_id) {
            global.io.to(`equipment:${session.equipment_id}`).emit('equipment:available', {
              equipment_id: session.equipment_id,
              auto_stopped: true,
            });

            global.io.to(`user:${nextInQueue.member.user_id}`).emit('queue:yourTurn', {
              equipment_id: session.equipment_id,
              equipment_name: session.equipment.name,
            });
          }
        }

        stoppedSessions.push({
          session_id: session.id,
          member: session.member.full_name,
          equipment: session.equipment.name,
          duration: `${durationInMinutes} minutes`,
          calories: calories_burned,
        });

        console.log(
          `⏱️ Auto-stopped expired session: ${session.id} for ${session.member.full_name}`
        );
      }

      res.json({
        success: true,
        message: `Auto-stopped ${stoppedSessions.length} expired session(s)`,
        data: { stopped: stoppedSessions.length, sessions: stoppedSessions },
      });
    } catch (error) {
      console.error('Error auto-stopping expired sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to auto-stop expired sessions',
        data: null,
        error: error.message,
      });
    }
  }

  // Get equipment usage statistics
  async getEquipmentUsageStats(req, res) {
    try {
      const { id: memberId } = req.params; // Must be Member.id (not user_id)
      const { period = '30' } = req.query;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      // memberId must be Member.id (not user_id)
      // Schema: EquipmentUsage.member_id references Member.id
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalUsage, totalDuration, totalCalories, equipmentStats, recentUsage] =
        await Promise.all([
          prisma.equipmentUsage.count({
            where: {
              member_id: memberId,
              start_time: { gte: startDate },
            },
          }),
          prisma.equipmentUsage.aggregate({
            where: {
              member_id: memberId,
              start_time: { gte: startDate },
              duration: { not: null },
            },
            _sum: { duration: true },
          }),
          prisma.equipmentUsage.aggregate({
            where: {
              member_id: memberId,
              start_time: { gte: startDate },
              calories_burned: { not: null },
            },
            _sum: { calories_burned: true },
          }),
          prisma.equipmentUsage.groupBy({
            by: ['equipment_id'],
            where: {
              member_id: memberId,
              start_time: { gte: startDate },
            },
            _count: { id: true },
            _sum: { duration: true, calories_burned: true },
          }),
          prisma.equipmentUsage.findMany({
            where: {
              member_id: memberId,
              start_time: { gte: startDate },
            },
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
            orderBy: { start_time: 'desc' },
            take: 10,
          }),
        ]);

      res.json({
        success: true,
        message: 'Equipment usage statistics retrieved successfully',
        data: {
          stats: {
            totalUsage,
            totalDuration: totalDuration._sum.duration || 0,
            totalCalories: totalCalories._sum.calories_burned || 0,
          },
          equipmentStats,
          recentUsage,
        },
      });
    } catch (error) {
      console.error('Get equipment usage stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get equipment usage stats by status (for admin/reports)
  async getEquipmentUsageStatsByStatus(req, res) {
    try {
      console.log('📊 Getting equipment usage stats by status...');
      
      // Get all equipment grouped by status
      const equipmentStats = await prisma.equipment.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      console.log('📊 Equipment stats:', equipmentStats);

      // Format response
      const stats = equipmentStats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
      }));

      // If no equipment found, return empty array instead of error
      if (stats.length === 0) {
        return res.json({
          success: true,
          message: 'Equipment usage statistics retrieved successfully',
          data: [],
        });
      }

      res.json({
        success: true,
        message: 'Equipment usage statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get equipment usage stats by status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // ==================== MAINTENANCE MANAGEMENT ====================

  // Get equipment maintenance logs
  async getMaintenanceLogs(req, res) {
    try {
      const { id } = req.params;

      const logs = await prisma.maintenanceLog.findMany({
        where: { equipment_id: id },
        orderBy: { completed_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Maintenance logs retrieved successfully',
        data: { logs },
      });
    } catch (error) {
      console.error('Get maintenance logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create maintenance log
  async createMaintenanceLog(req, res) {
    try {
      const { id } = req.params;
      const { maintenance_type, description, performed_by, cost, parts_replaced, next_due } =
        req.body;

      const log = await prisma.maintenanceLog.create({
        data: {
          equipment_id: id,
          maintenance_type,
          description,
          performed_by,
          cost: cost ? parseFloat(cost) : null,
          parts_replaced: parts_replaced || [],
          next_due: next_due ? new Date(next_due) : null,
        },
      });

      // Update equipment maintenance info
      await prisma.equipment.update({
        where: { id },
        data: {
          last_maintenance: new Date(),
          next_maintenance: next_due ? new Date(next_due) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Maintenance log created successfully',
        data: { log },
      });
    } catch (error) {
      console.error('Create maintenance log error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== QUEUE MANAGEMENT ====================

  // Join equipment queue
  async joinQueue(req, res) {
    try {
      const { id } = req.params; // equipment_id
      const { member_id } = req.body; // Must be Member.id (not user_id)

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
      });
      }

      // member_id must be Member.id (not user_id)
      // Schema: EquipmentQueue.member_id references Member.id

      // Check if equipment exists
      const equipment = await prisma.equipment.findUnique({ where: { id } });
      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Equipment not found',
          data: null,
        });
      }

      // If equipment is AVAILABLE, suggest to start using directly
      if (equipment.status === 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message:
            'Equipment is available. Please start using it directly instead of joining queue.',
          data: { shouldStartUsage: true },
        });
      }

      // Only allow queue for equipment that is IN_USE
      if (equipment.status !== 'IN_USE') {
        return res.status(400).json({
          success: false,
          message: `Cannot join queue. Equipment is ${equipment.status}`,
          data: null,
        });
      }

      // Check if member already in queue
      const existingQueue = await prisma.equipmentQueue.findFirst({
        where: { equipment_id: id, member_id, status: 'WAITING' },
      });
      if (existingQueue) {
        return res.status(400).json({
          success: false,
          message: 'Already in queue',
          data: null,
        });
      }

      // Get current queue position
      const maxPosition = await prisma.equipmentQueue.aggregate({
        where: { equipment_id: id, status: 'WAITING' },
        _max: { position: true },
      });
      const position = (maxPosition._max.position || 0) + 1;

      const queueEntry = await prisma.equipmentQueue.create({
        data: { member_id, equipment_id: id, position },
        include: {
          member: { select: { full_name: true } },
          equipment: { select: { name: true } },
        },
      });

      // Emit WebSocket event
      if (global.io) {
        global.io.emit('equipment:queue:updated', {
          equipment_id: id,
          queue: queueEntry,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Joined queue successfully',
        data: { queue: queueEntry },
      });
    } catch (error) {
      console.error('Join queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Leave equipment queue
  async leaveQueue(req, res) {
    try {
      const { id } = req.params; // queue_id

      const queue = await prisma.equipmentQueue.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Reorder positions
      await prisma.equipmentQueue.updateMany({
        where: {
          equipment_id: queue.equipment_id,
          position: { gt: queue.position },
          status: 'WAITING',
        },
        data: { position: { decrement: 1 } },
      });

      // Emit WebSocket event
      if (global.io) {
        global.io.emit('equipment:queue:updated', {
          equipment_id: queue.equipment_id,
        });
      }

      res.json({
        success: true,
        message: 'Left queue successfully',
        data: null,
      });
    } catch (error) {
      console.error('Leave queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get equipment queue
  async getEquipmentQueue(req, res) {
    try {
      const { id } = req.params; // equipment_id

      const queue = await prisma.equipmentQueue.findMany({
        where: { equipment_id: id, status: 'WAITING' },
        include: {
          member: { select: { full_name: true, membership_number: true } },
        },
        orderBy: { position: 'asc' },
      });

      res.json({
        success: true,
        message: 'Queue retrieved successfully',
        data: { queue },
      });
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== ISSUE REPORTING ====================

  // Report equipment issue
  async reportIssue(req, res) {
    try {
      const { id } = req.params; // equipment_id
      const { member_id, issue_type, description, severity, images } = req.body; // member_id must be Member.id (not user_id)

      if (!member_id) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
      });
      }

      // member_id must be Member.id (not user_id)
      // Schema: EquipmentIssueReport.member_id references Member.id

      const report = await prisma.equipmentIssueReport.create({
        data: {
          equipment_id: id,
          member_id,
          issue_type,
          description,
          severity,
          images: images || [],
        },
        include: {
          member: { select: { full_name: true } },
          equipment: { select: { name: true, location: true } },
        },
      });

      // If CRITICAL or HIGH, update equipment status
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        await prisma.equipment.update({
          where: { id },
          data: { status: 'OUT_OF_ORDER' },
        });

        if (global.io) {
          global.io.emit('equipment:status:changed', {
            equipment_id: id,
            status: 'OUT_OF_ORDER',
          });
        }
      }

      // Emit WebSocket event
      if (global.io) {
        global.io.emit('equipment:issue:reported', {
          equipment_id: id,
          report,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Issue reported successfully',
        data: { report },
      });
    } catch (error) {
      console.error('Report issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get equipment issues
  async getEquipmentIssues(req, res) {
    try {
      const { id } = req.params; // equipment_id
      const { status } = req.query;

      const where = { equipment_id: id };
      if (status) where.status = status;

      const issues = await prisma.equipmentIssueReport.findMany({
        where,
        include: { member: { select: { full_name: true } } },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Issues retrieved successfully',
        data: { issues },
      });
    } catch (error) {
      console.error('Get issues error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== QR CODE ====================

  // Validate equipment QR code
  async validateQRCode(req, res) {
    try {
      const { qr_code } = req.body;

      const equipment = await prisma.equipment.findFirst({
        where: { sensor_id: qr_code },
        select: {
          id: true,
          name: true,
          status: true,
          location: true,
          category: true,
          brand: true,
          model: true,
        },
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Equipment not found',
          data: {
            valid: false,
            equipment: null,
            canUse: false,
            canQueue: false,
            reason: 'NOT_FOUND',
          },
        });
      }

      // Define professional status messages
      const statusMessages = {
        MAINTENANCE:
          'This equipment is currently undergoing maintenance. Please check back later or contact staff for assistance.',
        OUT_OF_ORDER:
          'This equipment is temporarily out of service. Please use alternative equipment or notify staff.',
        RESERVED:
          'This equipment is currently reserved. You may join the waiting queue to be notified when available.',
        IN_USE:
          'This equipment is currently in use by another member. Join the queue to reserve your turn.',
        AVAILABLE: 'Equipment is ready for use. You can start your workout now.',
      };

      // Check equipment status and return consistent structure
      const unavailableStatuses = ['MAINTENANCE', 'OUT_OF_ORDER'];

      if (unavailableStatuses.includes(equipment.status)) {
        // Equipment cannot be used at all
        return res.json({
          success: true, // Changed to true to make frontend handling consistent
          message: statusMessages[equipment.status] || 'Equipment is not available',
          data: {
            valid: true,
            equipment,
            canUse: false,
            canQueue: false,
            reason: equipment.status,
          },
        });
      }

      if (equipment.status === 'RESERVED') {
        // Equipment is reserved - can only join queue
        return res.json({
          success: true,
          message: statusMessages.RESERVED,
          data: {
            valid: true,
            equipment,
            canUse: false,
            canQueue: true,
            reason: 'RESERVED',
          },
        });
      }

      if (equipment.status === 'IN_USE') {
        // Equipment is in use - can join queue
        return res.json({
          success: true,
          message: statusMessages.IN_USE,
          data: {
            valid: true,
            equipment,
            canUse: false,
            canQueue: true,
            reason: 'IN_USE',
          },
        });
      }

      // AVAILABLE - can use immediately
      res.json({
        success: true,
        message: statusMessages.AVAILABLE,
        data: {
          valid: true,
          equipment,
          canUse: true,
          canQueue: false,
          reason: 'AVAILABLE',
        },
      });
    } catch (error) {
      console.error('Validate QR error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {
          valid: false,
          equipment: null,
          canUse: false,
          canQueue: false,
          reason: 'ERROR',
        },
      });
    }
  }

  // Upload equipment photo
  async uploadEquipmentPhoto(req, res) {
    try {
      const { photo } = req.body; // Base64 data URL from frontend

      if (!photo || !photo.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid photo data. Expected base64 data URL.',
          data: null,
        });
      }

      // Extract mime type and base64 data
      const matches = photo.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({
          success: false,
          message: 'Invalid base64 format',
          data: null,
        });
      }

      const mimeType = `image/${matches[1]}`;
      const base64Data = matches[2];
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const originalName = `equipment_${Date.now()}.${matches[1]}`;

      // Get user ID from token if available
      let userId = 'unknown';
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            let payloadBase64 = tokenParts[1];
            while (payloadBase64.length % 4) {
              payloadBase64 += '=';
            }
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
            userId = payload.userId || payload.id || 'unknown';
          }
        } catch (error) {
          console.warn('⚠️ Could not extract user ID from token:', error.message);
        }
      }

      // Upload to S3 with folder 'equipment'
      const uploadResult = await s3UploadService.uploadFile(fileBuffer, originalName, mimeType, userId, {
        folder: 'equipment',
        optimize: true, // Optimize equipment photos
      });

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: uploadResult.error || 'Failed to upload photo',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Photo uploaded successfully',
        data: {
          photo: uploadResult.url,
          key: uploadResult.key,
        },
      });
    } catch (error) {
      console.error('Upload equipment photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new EquipmentController();
