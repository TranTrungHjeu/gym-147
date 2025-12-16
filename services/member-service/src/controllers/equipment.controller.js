// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const s3UploadService = require('../services/s3-upload.service');
const challengeService = require('../services/challenge.service.js');
const notificationService = require('../services/notification.service');
const { notifyNextInQueue } = require('./queue.controller');
let distributedLock = null;
try {
  distributedLock =
    require('../../../packages/shared-utils/dist/redis-lock.utils.js').distributedLock;
} catch (e) {
  try {
    distributedLock =
      require('../../../packages/shared-utils/src/redis-lock.utils.ts').distributedLock;
  } catch (e2) {
    console.warn(
      '[WARNING] Distributed lock utility not available, equipment usage will use database transactions only'
    );
  }
}

class EquipmentController {
  // ==================== HELPER FUNCTIONS ====================

  /**
   * Calculate calories with activity validation (multi-layer fallback)
   * @param {Object} params
   * @param {number} params.durationInSeconds - Duration in seconds
   * @param {string} params.equipmentCategory - Equipment category
   * @param {number} params.heart_rate_avg - Average heart rate (optional)
   * @param {number} params.heart_rate_max - Max heart rate (optional)
   * @param {Object} params.sensor_data - Sensor data with movement info (optional)
   * @param {number} params.reps_completed - Reps completed (optional)
   * @param {number} params.sets_completed - Sets completed (optional)
   * @param {Date} params.last_activity_check - Last activity check timestamp (optional)
   * @returns {number} Calculated calories
   */
  calculateCaloriesWithActivity({
    durationInSeconds,
    equipmentCategory,
    heart_rate_avg,
    heart_rate_max,
    sensor_data,
    reps_completed,
    sets_completed,
    last_activity_check,
  }) {
    const MINIMUM_ACTIVITY_MINUTES = 5;
    const durationInMinutes = Math.floor(durationInSeconds / 60);

    // Base calculation
    const calorieRates = {
      CARDIO: 12,
      STRENGTH: 6,
      FREE_WEIGHTS: 7,
      FUNCTIONAL: 8,
      STRETCHING: 3,
      RECOVERY: 2,
      SPECIALIZED: 5,
    };

    const caloriesPerMinute = calorieRates[equipmentCategory] || 6;
    const caloriesPerSecond = caloriesPerMinute / 60;
    const baseCalories = durationInSeconds * caloriesPerSecond;

    // 1. Minimum activity threshold
    if (durationInMinutes < MINIMUM_ACTIVITY_MINUTES) {
      return Math.round(baseCalories * 0.1); // 10% to encourage
    }

    // 2. Activity score - MULTI-LAYER VALIDATION
    let activityScore = 1.0;
    let hasActivityData = false;

    // Layer 1: Heart Rate (if available) - Highest accuracy
    if (heart_rate_avg) {
      hasActivityData = true;
      if (heart_rate_avg < 80) {
        activityScore *= 0.5; // Resting - reduce 50%
      } else if (heart_rate_avg >= 100) {
        activityScore *= 1.2; // Active - increase 20%
      }
    }

    // Layer 2: Movement/Sensor Data (if available) - Medium accuracy
    if (sensor_data) {
      hasActivityData = true;
      const movement = sensor_data.movement || sensor_data.movementIntensity || 0;

      if (movement < 0.1) {
        // Very little movement
        activityScore *= 0.3; // Reduce 70%
      } else if (movement > 0.5) {
        // Good movement
        activityScore *= 1.1; // Increase 10%
      }
    }

    // Layer 3: Activity Data (reps, sets) - If user entered
    if (reps_completed || sets_completed) {
      hasActivityData = true;
      // Has reps/sets → Actually working out
      // No need to reduce score
    }

    // Layer 4: Periodic Check-in - If has last_activity_check
    if (last_activity_check) {
      const minutesSinceCheckIn = Math.floor(
        (Date.now() - new Date(last_activity_check).getTime()) / (1000 * 60)
      );

      if (minutesSinceCheckIn > 5) {
        // No check-in for 5 minutes → Might be resting
        // Reduce calories for inactive period
        const activeMinutes = Math.max(0, durationInMinutes - (minutesSinceCheckIn - 5));
        const activeCalories = activeMinutes * caloriesPerMinute;
        return Math.max(1, Math.round(activeCalories * activityScore));
      }
    }

    // If no activity data at all
    if (!hasActivityData) {
      // Fallback: Based on duration and periodic check-in
      if (last_activity_check) {
        // Has periodic updates → User is active (at least app is open)
        // Calculate 70% calories (assume user might be working out but no sensor data)
        activityScore = 0.7;
      } else {
        // No periodic updates → Might be resting
        // Calculate 50% calories
        activityScore = 0.5;
      }
    }

    // Final calculation
    const adjustedCalories = baseCalories * activityScore;
    return Math.max(1, Math.round(adjustedCalories));
  }

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

      const [equipmentList, total] = await Promise.all([
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

      // Calculate accurate queue count (only WAITING and NOTIFIED status)
      // Use a single query to get all queue counts at once to avoid N+1
      const equipmentIds = equipmentList.map(eq => eq.id);
      const queueCounts = await prisma.equipmentQueue.groupBy({
        by: ['equipment_id'],
        where: {
          equipment_id: { in: equipmentIds },
          status: {
            in: ['WAITING', 'NOTIFIED'],
          },
        },
        _count: {
          id: true,
        },
      });

      // Create a map for quick lookup
      const queueCountMap = new Map(queueCounts.map(qc => [qc.equipment_id, qc._count.id]));

      // Update equipment with accurate queue counts
      const equipment = equipmentList.map(eq => ({
        ...eq,
        _count: {
          ...eq._count,
          queue: queueCountMap.get(eq.id) || 0,
        },
      }));

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

      // Get old equipment data to check if status changed
      const oldEquipment = await prisma.equipment.findUnique({
        where: { id },
        select: { status: true, name: true },
      });

      const equipment = await prisma.equipment.update({
        where: { id },
        data: {
          ...validUpdateData,
          updated_at: new Date(),
        },
      });

      // If status changed, create notification for admin
      if (
        validUpdateData.status &&
        oldEquipment &&
        oldEquipment.status !== validUpdateData.status
      ) {
        await notificationService.createEquipmentNotificationForAdmin({
          equipmentId: id,
          equipmentName: equipment.name || oldEquipment.name,
          status: validUpdateData.status,
          action: 'status_changed',
        });

        // Emit socket event
        if (global.io) {
          global.io.emit('equipment:status:changed', {
            equipment_id: id,
            equipment_name: equipment.name || oldEquipment.name,
            old_status: oldEquipment.status,
            new_status: validUpdateData.status,
          });
        }
      }

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

      // TC-EQUIP-001: Use transaction to prevent race condition in equipment status check
      // TC-EQUIP-002: Check equipment status (including maintenance)
      // TC-EQUIP-004: Check member subscription status
      const result = await prisma.$transaction(async tx => {
        // Check member exists and has active subscription
        const member = await tx.member.findUnique({
          where: { id: memberId },
          select: {
            id: true,
            membership_status: true,
            access_enabled: true,
          },
        });

        if (!member) {
          throw new Error('MEMBER_NOT_FOUND');
        }

        if (!member.access_enabled) {
          throw new Error('ACCESS_DISABLED');
        }

        // TC-EQUIP-004: Check subscription status
        if (member.membership_status !== 'ACTIVE') {
          throw new Error('SUBSCRIPTION_EXPIRED');
        }

        // Check if equipment is available (with lock to prevent race condition)
        const equipment = await tx.equipment.findUnique({
          where: { id: equipment_id },
        });

        if (!equipment) {
          throw new Error('EQUIPMENT_NOT_FOUND');
        }

        // TC-EQUIP-002: Check equipment status (including maintenance)
        if (equipment.status !== 'AVAILABLE') {
          throw new Error('EQUIPMENT_NOT_AVAILABLE');
        }

        // Check if member has active usage of this equipment
        const activeUsage = await tx.equipmentUsage.findFirst({
          where: {
            member_id: memberId,
            equipment_id,
            end_time: null,
          },
        });

        if (activeUsage) {
          throw new Error('ALREADY_USING');
        }

        return { member, equipment };
      });

      const { member, equipment } = result;

      // Find active gym session to link equipment usage
      const activeGymSession = await prisma.gymSession.findFirst({
        where: {
          member_id: memberId,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      console.log('[GYM] Active gym session check:', {
        found: !!activeGymSession,
        sessionId: activeGymSession?.id,
        memberId,
      });

      // If no active gym session, create one automatically
      let sessionToLink = activeGymSession;
      if (!activeGymSession) {
        console.log('[WARNING] No active gym session found. Auto-creating one...');
        sessionToLink = await prisma.gymSession.create({
          data: {
            member_id: memberId,
            entry_method: 'MOBILE_APP',
            entry_gate: 'Equipment Station',
          },
        });
        console.log('[SUCCESS] Auto-created gym session:', sessionToLink.id);
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

      console.log('[PROCESS] Creating equipment usage with data:', {
        member_id: usageData.member_id,
        equipment_id: usageData.equipment_id,
        session_id: usageData.session_id,
        has_session: !!usageData.session_id,
        weight_used: usageData.weight_used,
        reps_completed: usageData.reps_completed,
      });

      // TC-EQUIP-001: Create usage and update equipment status atomically
      const usage = await prisma.$transaction(async tx => {
        // Create usage record
        const newUsage = await tx.equipmentUsage.create({
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

        // Update equipment status to IN_USE atomically
        await tx.equipment.update({
          where: { id: equipment_id },
          data: { status: 'IN_USE' },
        });

        return newUsage;
      });

      console.log('[SUCCESS] Equipment usage created:', {
        usageId: usage.id,
        session_id: usage.session_id,
        member_id: usage.member_id,
        equipment: usage.equipment.name,
        start_time: usage.start_time,
        VERIFIED: usage.session_id === sessionToLink?.id,
      });

      // Equipment status already updated to IN_USE in transaction above

      // Remove user from queue if they were in queue (they claimed the equipment)
      const queueEntry = await prisma.equipmentQueue.findFirst({
        where: {
          member_id: memberId,
          equipment_id: equipment_id,
          status: { in: ['WAITING', 'NOTIFIED'] },
        },
      });

      if (queueEntry) {
        const removedPosition = queueEntry.position;

        // Delete queue entry
        await prisma.equipmentQueue.delete({
          where: { id: queueEntry.id },
        });

        console.log(
          `[SUCCESS] Removed queue entry for member ${memberId} (position ${removedPosition})`
        );

        // Reorder remaining queue entries
        await prisma.equipmentQueue.updateMany({
          where: {
            equipment_id: equipment_id,
            status: { in: ['WAITING', 'NOTIFIED'] },
            position: { gt: removedPosition },
          },
          data: {
            position: { decrement: 1 },
          },
        });

        // Emit WebSocket event for queue update
        if (global.io) {
          const newQueueLength = await prisma.equipmentQueue.count({
            where: {
              equipment_id: equipment_id,
              status: { in: ['WAITING', 'NOTIFIED'] },
            },
          });

          global.io.to(`equipment:${equipment_id}`).emit('queue:updated', {
            equipment_id: equipment_id,
            queue_length: newQueueLength,
            action: 'claimed',
            member_id: memberId,
          });
        }
      }

      // Emit WebSocket event for equipment status change
      if (global.io) {
        global.io.to(`equipment:${equipment_id}`).emit('equipment:statusChanged', {
          equipment_id,
          status: 'IN_USE',
          member_id: memberId,
        });
      }

      // [SUCCESS] Fix: Auto-update EQUIPMENT challenges when starting equipment usage (async, don't wait)
      challengeService.autoUpdateEquipmentChallenges(memberId, 1, 0).catch(err => {
        console.error('Auto-update equipment challenges error:', err);
      });

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

  // Update activity data during equipment usage (periodic updates)
  async updateActivityData(req, res) {
    try {
      const { id: memberId } = req.params;
      const { usage_id, heart_rate_avg, heart_rate_max, sensor_data } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          message: 'Member ID is required',
          data: null,
        });
      }

      if (!usage_id) {
        return res.status(400).json({
          success: false,
          message: 'Usage ID is required',
          data: null,
        });
      }

      // Verify authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Missing token',
          data: null,
        });
      }

      let userId = null;
      try {
        const token = authHeader.split(' ')[1];
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          let payloadBase64 = tokenParts[1];
          while (payloadBase64.length % 4) {
            payloadBase64 += '=';
          }
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
          userId = payload.userId || payload.id;
        }
      } catch (error) {
        console.error('Token decode error:', error);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token',
          data: null,
        });
      }

      // Verify member exists and matches user
      const member = await prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      if (member.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update your own activity data',
          data: null,
        });
      }

      // Find active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          id: usage_id,
          member_id: memberId,
          end_time: null, // Must be active
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

      // Prepare update data
      const updateData = {
        last_activity_check: new Date(),
      };

      // Update heart rate if provided
      if (heart_rate_avg !== undefined && heart_rate_avg !== null) {
        // If we already have heart_rate_avg, calculate running average
        if (activeUsage.heart_rate_avg) {
          // Simple running average (can be improved with weighted average)
          updateData.heart_rate_avg = Math.round((activeUsage.heart_rate_avg + heart_rate_avg) / 2);
        } else {
          updateData.heart_rate_avg = Math.round(heart_rate_avg);
        }
      }

      if (heart_rate_max !== undefined && heart_rate_max !== null) {
        // Keep the maximum value
        if (activeUsage.heart_rate_max) {
          updateData.heart_rate_max = Math.max(
            activeUsage.heart_rate_max,
            Math.round(heart_rate_max)
          );
        } else {
          updateData.heart_rate_max = Math.round(heart_rate_max);
        }
      }

      // Update sensor data if provided
      if (sensor_data) {
        // Merge with existing sensor_data
        const existingSensorData = activeUsage.sensor_data || {};
        updateData.sensor_data = {
          ...existingSensorData,
          ...sensor_data,
          last_updated: new Date().toISOString(),
        };
      }

      // Update the usage record
      const updatedUsage = await prisma.equipmentUsage.update({
        where: { id: usage_id },
        data: updateData,
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Activity data updated successfully',
        data: {
          usage: updatedUsage,
        },
      });
    } catch (error) {
      console.error('Update activity data error:', error);
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

      if (!usage_id) {
        return res.status(400).json({
          success: false,
          message: 'Usage ID is required',
          data: null,
        });
      }

      // Verify authentication - get userId from token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Missing token',
          data: null,
        });
      }

      let userId = null;
      try {
        const token = authHeader.split(' ')[1];
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          let payloadBase64 = tokenParts[1];
          while (payloadBase64.length % 4) {
            payloadBase64 += '=';
          }
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
          userId = payload.userId || payload.id;
        }
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid token',
          data: null,
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Could not extract user ID from token',
          data: null,
        });
      }

      // Verify that memberId belongs to the authenticated user
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, user_id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      if (member.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only end your own equipment usage',
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
        console.error('[ERROR] Active usage not found:', {
          usage_id,
          member_id: memberId,
          user_id: userId,
        });
        return res.status(404).json({
          success: false,
          message: 'Active equipment usage not found',
          data: null,
        });
      }

      const equipment_id = activeUsage.equipment_id;

      // Acquire distributed lock for equipment usage stop
      let lockAcquired = false;
      let lockId = null;

      if (distributedLock) {
        const lockResult = await distributedLock.acquire('equipment', equipment_id, {
          ttl: 30, // 30 seconds
          retryAttempts: 3,
          retryDelay: 100,
        });

        if (!lockResult.acquired) {
          return res.status(409).json({
            success: false,
            message: 'Equipment đang được xử lý, vui lòng thử lại sau',
            data: null,
          });
        }

        lockAcquired = true;
        lockId = lockResult.lockId;
      }

      try {
        const endTime = new Date();

        // Calculate duration in seconds for accurate calorie calculation
        const durationInSeconds = Math.floor((endTime - activeUsage.start_time) / 1000);
        const durationInMinutes = Math.floor(durationInSeconds / 60); // For storage

        // Calculate calories with activity validation (multi-layer fallback)
        const calories_burned = this.calculateCaloriesWithActivity({
          durationInSeconds,
          equipmentCategory: activeUsage.equipment.category,
          heart_rate_avg: heart_rate_avg || activeUsage.heart_rate_avg,
          heart_rate_max: heart_rate_max || activeUsage.heart_rate_max,
          sensor_data: sensor_data || activeUsage.sensor_data,
          reps_completed,
          sets_completed,
          last_activity_check: activeUsage.last_activity_check,
        });

        console.log('[TIMER] Duration & Calories calculation (with activity validation):', {
          equipmentCategory: activeUsage.equipment.category,
          durationInSeconds,
          durationInMinutes,
          calories_burned,
          has_heart_rate: !!(heart_rate_avg || activeUsage.heart_rate_avg),
          has_sensor_data: !!(sensor_data || activeUsage.sensor_data),
          has_activity_check: !!activeUsage.last_activity_check,
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

        console.log('[SUCCESS] Saved to database:', {
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

        // [SUCCESS] Fix: Auto-update FITNESS challenges (calories) - async, don't wait
        if (calories_burned > 0) {
          challengeService.autoUpdateFitnessChallenges(memberId, calories_burned, 0).catch(err => {
            console.error('Auto-update fitness challenges error:', err);
          });
        }

        // [SUCCESS] Fix: Auto-update EQUIPMENT challenges (count) - async, don't wait
        challengeService
          .autoUpdateEquipmentChallenges(memberId, 1, durationInMinutes)
          .catch(err => {
            console.error('Auto-update equipment challenges error:', err);
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
            `[BELL] Notifying ${nextInQueue.member.full_name} - ${activeUsage.equipment.name} is available`
          );

          // Create in-app notification in database
          try {
            await notificationService.createQueueNotification({
              memberId: nextInQueue.member.id,
              type: 'QUEUE_YOUR_TURN',
              title: '[CELEBRATE] Đến lượt bạn!',
              message: `${activeUsage.equipment.name} đã có sẵn. Bạn có 5 phút để sử dụng.`,
              data: {
                equipment_id: activeUsage.equipment_id,
                equipment_name: activeUsage.equipment.name,
                queue_id: nextInQueue.id,
                position: nextInQueue.position,
                expires_at: expiresAt.toISOString(),
                expires_in_minutes: 5,
              },
            });
            console.log(
              `[SUCCESS] Created database notification for member ${nextInQueue.member.id}`
            );
          } catch (notifError) {
            console.error('[ERROR] Failed to create queue notification in database:', notifError);
            // Continue even if notification creation fails
          }

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
            console.log(`[SOCKET] Emitted queue:your_turn to user:${nextInQueue.member.user_id}`);
          }

          // Send Push Notification (for offline users)
          if (nextInQueue.member.user_id) {
            try {
              const { sendPushNotification } = require('../utils/push-notification');
              await sendPushNotification(
                nextInQueue.member.user_id,
                "[CELEBRATE] It's Your Turn!",
                `${activeUsage.equipment.name} is now available. You have 5 minutes to claim it.`,
                {
                  type: 'QUEUE_YOUR_TURN',
                  equipment_id: activeUsage.equipment_id,
                  equipment_name: activeUsage.equipment.name,
                  queue_id: nextInQueue.id,
                  expires_at: expiresAt.toISOString(),
                }
              );
            } catch (pushError) {
              console.warn('[WARNING] Push notification utility not available:', pushError.message);
              // Continue without push notification
            }
          }
        }

        // Create notification for admin when equipment becomes available
        await notificationService.createEquipmentNotificationForAdmin({
          equipmentId: activeUsage.equipment_id,
          equipmentName: activeUsage.equipment.name,
          status: 'AVAILABLE',
          action: 'available',
        });

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
      } finally {
        // Release distributed lock
        if (lockAcquired && lockId && distributedLock) {
          try {
            await distributedLock.release('equipment', equipment_id, lockId);
          } catch (releaseError) {
            console.error('Error releasing equipment lock:', releaseError);
          }
        }
      }
    } catch (error) {
      console.error('Stop equipment usage outer error:', error);
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

      // IMPROVEMENT: Send warning notifications 10 minutes before auto-stop
      const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
      const elevenMinutesFromNow = new Date(now.getTime() + 11 * 60 * 1000);

      const sessionsForWarning = await prisma.equipmentUsage.findMany({
        where: {
          end_time: null,
          auto_end_at: {
            gte: tenMinutesFromNow,
            lte: elevenMinutesFromNow,
          },
        },
        include: {
          equipment: true,
          member: {
            select: {
              id: true,
              user_id: true,
              full_name: true,
            },
          },
        },
      });

      // Send warning notifications
      for (const session of sessionsForWarning) {
        try {
          if (session.member?.user_id) {
            await notificationService.sendNotification({
              user_id: session.member.user_id,
              type: 'EQUIPMENT_WARNING',
              title: 'Cảnh báo: Thiết bị sẽ tự động dừng',
              message: `Thiết bị ${session.equipment.name} sẽ tự động dừng sau 10 phút. Vui lòng kết thúc sử dụng hoặc gia hạn thêm thời gian!`,
              data: {
                equipment_id: session.equipment_id,
                equipment_name: session.equipment.name,
                usage_id: session.id,
                auto_end_at: session.auto_end_at,
                warning_type: 'AUTO_STOP_10MIN',
              },
              channels: ['IN_APP', 'PUSH'],
            });
          }
        } catch (error) {
          console.error(`[ERROR] Failed to send warning for session ${session.id}:`, error);
        }
      }

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

        console.log('[TIMER] [AUTO-STOP] Duration & Calories calculation:', {
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

        console.log('[SUCCESS] [AUTO-STOP] Saved to database:', {
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

        // TC-EQUIP-AUTO-STOP-001: Notify next person in queue when equipment becomes available
        // Use the centralized notifyNextInQueue function for consistency
        try {
          await notifyNextInQueue(session.equipment_id, session.equipment.name);
          console.log(
            `[AUTO-STOP] Notified next person in queue for equipment ${session.equipment.name}`
          );
        } catch (notifyError) {
          console.error(
            `[AUTO-STOP] Error notifying next in queue for equipment ${session.equipment_id}:`,
            notifyError.message
          );
          // Don't fail the whole operation if notification fails
        }

        stoppedSessions.push({
          session_id: session.id,
          member: session.member.full_name,
          equipment: session.equipment.name,
          duration: `${durationInMinutes} minutes`,
          calories: calories_burned,
        });

        console.log(
          `[TIMER] Auto-stopped expired session: ${session.id} for ${session.member.full_name}`
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
      console.log('[STATS] Getting equipment usage stats by status...');

      // Get all equipment grouped by status
      const equipmentStats = await prisma.equipment.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      console.log('[STATS] Equipment stats:', equipmentStats);

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

      // Create notification for admin for ALL issue reports (regardless of severity)
      try {
        await notificationService.createEquipmentIssueNotificationForAdmin({
          equipmentId: id,
          equipmentName: report.equipment.name,
          memberId: member_id,
          memberName: report.member.full_name,
          issueType,
          severity,
          description,
          reportId: report.id,
        });
      } catch (notificationError) {
        console.error(
          '[ERROR] Failed to create equipment issue notification for admin:',
          notificationError
        );
        // Don't fail the report creation if notification fails
      }

      // If CRITICAL or HIGH, update equipment status
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        await prisma.equipment.update({
          where: { id },
          data: { status: 'OUT_OF_ORDER' },
        });

        // Create additional notification for admin when equipment status changes to OUT_OF_ORDER
        const equipment = await prisma.equipment.findUnique({
          where: { id },
          select: { id: true, name: true },
        });

        if (equipment) {
          await notificationService.createEquipmentNotificationForAdmin({
            equipmentId: id,
            equipmentName: equipment.name,
            status: 'OUT_OF_ORDER',
            action: 'status_changed',
          });
        }

        if (global.io) {
          global.io.emit('equipment:status:changed', {
            equipment_id: id,
            status: 'OUT_OF_ORDER',
          });
        }
      }

      // Emit WebSocket event (keep existing socket event for backward compatibility)
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

  // Generate QR code for equipment
  async generateQRCode(req, res) {
    try {
      const { id } = req.params;

      // Get equipment
      const equipment = await prisma.equipment.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          sensor_id: true,
        },
      });

      if (!equipment) {
        return res.status(404).json({
          success: false,
          message: 'Equipment not found',
          data: null,
        });
      }

      // Check if equipment has sensor_id
      if (!equipment.sensor_id) {
        return res.status(400).json({
          success: false,
          message: 'Equipment does not have a sensor ID. Please add a sensor ID first.',
          data: null,
        });
      }

      const qrcode = require('qrcode');

      // Generate QR code as data URL (PNG base64)
      // QR code will contain the sensor_id which mobile app will scan
      const qrCodeDataURL = await qrcode.toDataURL(equipment.sensor_id, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Also generate as SVG string
      const qrCodeSVG = await qrcode.toString(equipment.sensor_id, {
        type: 'svg',
        width: 300,
        margin: 2,
      });

      res.json({
        success: true,
        message: 'QR code generated successfully',
        data: {
          equipment_id: equipment.id,
          equipment_name: equipment.name,
          sensor_id: equipment.sensor_id,
          qr_code_data_url: qrCodeDataURL,
          qr_code_svg: qrCodeSVG,
        },
      });
    } catch (error) {
      console.error('Generate QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate QR code',
        data: null,
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
          console.warn('[WARNING] Could not extract user ID from token:', error.message);
        }
      }

      // Upload to S3 with folder 'equipment'
      const uploadResult = await s3UploadService.uploadFile(
        fileBuffer,
        originalName,
        mimeType,
        userId,
        {
          folder: 'equipment',
          optimize: true, // Optimize equipment photos
        }
      );

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
