const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
      } = req.body;

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
          max_weight,
          has_heart_monitor: has_heart_monitor || false,
          has_calorie_counter: has_calorie_counter || false,
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

      // Convert date strings to Date objects
      if (updateData.purchase_date) {
        updateData.purchase_date = new Date(updateData.purchase_date);
      }
      if (updateData.warranty_until) {
        updateData.warranty_until = new Date(updateData.warranty_until);
      }
      if (updateData.last_maintenance) {
        updateData.last_maintenance = new Date(updateData.last_maintenance);
      }
      if (updateData.next_maintenance) {
        updateData.next_maintenance = new Date(updateData.next_maintenance);
      }

      const equipment = await prisma.equipment.update({
        where: { id },
        data: {
          ...updateData,
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
      const { id } = req.params;
      const { page = 1, limit = 10, equipment_id, start_date, end_date } = req.query;
      const skip = (page - 1) * limit;

      const where = { member_id: id };
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
      const { id } = req.params;
      const { equipment_id, weight_used, reps_completed } = req.body;

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
          member_id: id,
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

      // Create usage record
      const usage = await prisma.equipmentUsage.create({
        data: {
          member_id: id,
          equipment_id,
          weight_used,
          reps_completed,
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

      // Update equipment status to IN_USE
      await prisma.equipment.update({
        where: { id: equipment_id },
        data: { status: 'IN_USE' },
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

  // Stop equipment usage
  async stopEquipmentUsage(req, res) {
    try {
      const { id } = req.params;
      const {
        usage_id,
        sets_completed,
        weight_used,
        reps_completed,
        heart_rate_avg,
        heart_rate_max,
        sensor_data,
      } = req.body;

      // Find active usage
      const activeUsage = await prisma.equipmentUsage.findFirst({
        where: {
          id: usage_id,
          member_id: id,
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
      const duration = Math.floor((endTime - activeUsage.start_time) / (1000 * 60)); // minutes

      // Estimate calories burned (rough calculation based on equipment type)
      let calories_burned = null;
      if (activeUsage.equipment.category === 'CARDIO') {
        calories_burned = Math.floor(duration * 10); // 10 calories per minute for cardio
      } else if (activeUsage.equipment.category === 'STRENGTH') {
        calories_burned = Math.floor(duration * 5); // 5 calories per minute for strength
      }

      // Update usage record
      const usage = await prisma.equipmentUsage.update({
        where: { id: usage_id },
        data: {
          end_time: endTime,
          duration,
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

      // Update equipment status back to AVAILABLE
      await prisma.equipment.update({
        where: { id: activeUsage.equipment_id },
        data: {
          status: 'AVAILABLE',
          usage_hours: { increment: Math.floor(duration / 60) }, // Add hours to total usage
        },
      });

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

  // Get equipment usage statistics
  async getEquipmentUsageStats(req, res) {
    try {
      const { id } = req.params;
      const { period = '30' } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalUsage, totalDuration, totalCalories, equipmentStats, recentUsage] =
        await Promise.all([
          prisma.equipmentUsage.count({
            where: {
              member_id: id,
              start_time: { gte: startDate },
            },
          }),
          prisma.equipmentUsage.aggregate({
            where: {
              member_id: id,
              start_time: { gte: startDate },
              duration: { not: null },
            },
            _sum: { duration: true },
          }),
          prisma.equipmentUsage.aggregate({
            where: {
              member_id: id,
              start_time: { gte: startDate },
              calories_burned: { not: null },
            },
            _sum: { calories_burned: true },
          }),
          prisma.equipmentUsage.groupBy({
            by: ['equipment_id'],
            where: {
              member_id: id,
              start_time: { gte: startDate },
            },
            _count: { id: true },
            _sum: { duration: true, calories_burned: true },
          }),
          prisma.equipmentUsage.findMany({
            where: {
              member_id: id,
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
}

module.exports = new EquipmentController();
