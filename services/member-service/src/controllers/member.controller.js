const { prisma } = require('../lib/prisma.js');

class MemberController {
  // Get all members with pagination and filters
  async getAllMembers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        membershipType,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = req.query;

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      // Build where clause
      const where = {};

      if (search) {
        where.OR = [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { membership_number: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.membership_status = status;
      }

      if (membershipType) {
        where.membership_type = membershipType;
      }

      // Get members with pagination
      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortOrder },
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
            gym_sessions: {
              orderBy: { entry_time: 'desc' },
              take: 1,
            },
          },
        }),
        prisma.member.count({ where }),
      ]);

      const totalPages = Math.ceil(total / take);

      res.json({
        success: true,
        message: 'Members retrieved successfully',
        data: {
          items: members,
          pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member by ID
  async getMemberById(req, res) {
    try {
      const { id } = req.params;

      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          memberships: {
            orderBy: { created_at: 'desc' },
          },
          gym_sessions: {
            orderBy: { entry_time: 'desc' },
            take: 10,
          },
          health_metrics: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
          equipment_usage: {
            orderBy: { start_time: 'desc' },
            take: 10,
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member retrieved successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Get member by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create new member
  async createMember(req, res) {
    try {
      const {
        user_id,
        full_name,
        phone,
        email,
        date_of_birth,
        gender,
        address,
        emergency_contact,
        emergency_phone,
        height,
        weight,
        body_fat_percent,
        fitness_goals,
        medical_conditions,
        allergies,
        membership_type = 'BASIC',
      } = req.body;

      // Validate required fields
      if (!user_id || !full_name || !phone || !email) {
        return res.status(400).json({
          success: false,
          message: 'user_id, full_name, phone, and email are required',
          data: null,
        });
      }

      // Generate unique membership number
      const membershipNumber = `GYM${Date.now()}`;

      // Generate user_id if not provided (auto-generate from email or phone)
      const generatedUserId =
        user_id || `USER_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // Create member
      const member = await prisma.member.create({
        data: {
          user_id,
          membership_number: membershipNumber,
          full_name,
          phone,
          email,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          gender,
          address,
          emergency_contact,
          emergency_phone,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          body_fat_percent: body_fat_percent ? parseFloat(body_fat_percent) : null,
          fitness_goals: fitness_goals || [],
          medical_conditions: medical_conditions || [],
          allergies: allergies || [],
          membership_type,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
        include: {
          memberships: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Create member error:', error);

      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Member with this email, phone, or user_id already exists',
          data: null,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update member
  async updateMember(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.membership_number;
      delete updateData.created_at;

      // Parse numeric fields
      if (updateData.height) updateData.height = parseFloat(updateData.height);
      if (updateData.weight) updateData.weight = parseFloat(updateData.weight);
      if (updateData.body_fat_percent)
        updateData.body_fat_percent = parseFloat(updateData.body_fat_percent);

      // Parse date fields
      if (updateData.date_of_birth) updateData.date_of_birth = new Date(updateData.date_of_birth);
      if (updateData.expires_at) updateData.expires_at = new Date(updateData.expires_at);

      const member = await prisma.member.update({
        where: { id },
        data: updateData,
        include: {
          memberships: true,
          access_logs: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
        },
      });

      res.json({
        success: true,
        message: 'Member updated successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Update member error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Email or phone already exists',
          data: null,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete member (soft delete by changing status)
  async deleteMember(req, res) {
    try {
      const { id } = req.params;

      const member = await prisma.member.update({
        where: { id },
        data: {
          membership_status: 'INACTIVE',
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Member deactivated successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Delete member error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member statistics
  async getMemberStats(req, res) {
    try {
      const [
        totalMembers,
        activeMembers,
        inactiveMembers,
        expiringMembers,
        membersByType,
        recentMembers,
      ] = await Promise.all([
        prisma.member.count(),
        prisma.member.count({ where: { membership_status: 'ACTIVE' } }),
        prisma.member.count({ where: { membership_status: 'EXPIRED' } }),
        prisma.member.count({
          where: {
            expires_at: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
            },
            membership_status: 'ACTIVE',
          },
        }),
        prisma.member.groupBy({
          by: ['membership_type'],
          _count: true,
        }),
        prisma.member.findMany({
          orderBy: { created_at: 'desc' },
          take: 5,
          select: {
            id: true,
            full_name: true,
            membership_number: true,
            created_at: true,
            membership_type: true,
          },
        }),
      ]);

      res.json({
        success: true,
        message: 'Member statistics retrieved successfully',
        data: {
          overview: {
            totalMembers,
            activeMembers,
            inactiveMembers,
            expiringMembers,
          },
          membersByType,
          recentMembers,
        },
      });
    } catch (error) {
      console.error('Get member stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member memberships
  async getMemberMemberships(req, res) {
    try {
      const { id } = req.params;

      const memberships = await prisma.membership.findMany({
        where: { member_id: id },
        orderBy: { created_at: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Member memberships retrieved successfully',
        data: { memberships },
      });
    } catch (error) {
      console.error('Get member memberships error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Create new membership for member
  async createMembership(req, res) {
    try {
      const { id } = req.params;
      const { type, duration_months, start_date, price } = req.body;

      // Calculate end date
      const startDate = start_date ? new Date(start_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (duration_months || 1));

      const membership = await prisma.membership.create({
        data: {
          member_id: id,
          type: type || 'BASIC',
          start_date: startDate,
          end_date: endDate,
          price: price ? parseFloat(price) : 0,
          is_active: true,
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        data: { membership },
      });
    } catch (error) {
      console.error('Create membership error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get member access logs
  async getMemberAccessLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;
      const take = parseInt(limit);

      const [gymSessions, total] = await Promise.all([
        prisma.gymSession.findMany({
          where: { member_id: id },
          orderBy: { entry_time: 'desc' },
          skip,
          take,
        }),
        prisma.gymSession.count({ where: { member_id: id } }),
      ]);

      res.json({
        success: true,
        message: 'Member access logs retrieved successfully',
        data: {
          accessLogs: gymSessions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / take),
            totalItems: total,
            itemsPerPage: take,
          },
        },
      });
    } catch (error) {
      console.error('Get member access logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Member check-in
  async memberCheckIn(req, res) {
    try {
      const { id } = req.params;
      const { method = 'MANUAL', location } = req.body;

      // Check if member exists and is active
      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          memberships: {
            where: {
              is_active: true,
              end_date: { gte: new Date() },
            },
          },
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      if (member.membership_status !== 'ACTIVE') {
        return res.status(400).json({
          success: false,
          message: 'Member is not active',
          data: null,
        });
      }

      if (!member.memberships.length) {
        return res.status(400).json({
          success: false,
          message: 'No active membership found',
          data: null,
        });
      }

      // Check if already checked in
      const existingCheckIn = await prisma.gymSession.findFirst({
        where: {
          member_id: id,
          entry_time: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          exit_time: null,
        },
      });

      if (existingCheckIn) {
        return res.status(400).json({
          success: false,
          message: 'Member already checked in',
          data: { checkInTime: existingCheckIn.entry_time },
        });
      }

      // Create gym session
      const gymSession = await prisma.gymSession.create({
        data: {
          member_id: id,
          entry_method: method,
          entry_time: new Date(),
          entry_gate: location || 'Main Entrance',
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Member checked in successfully',
        data: { accessLog: gymSession },
      });
    } catch (error) {
      console.error('Member check-in error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Member check-out
  async memberCheckOut(req, res) {
    try {
      const { id } = req.params;

      // Find active gym session
      const gymSession = await prisma.gymSession.findFirst({
        where: {
          member_id: id,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      if (!gymSession) {
        return res.status(400).json({
          success: false,
          message: 'Member is not checked in',
          data: null,
        });
      }

      // Update gym session with exit time
      const updatedGymSession = await prisma.gymSession.update({
        where: { id: gymSession.id },
        data: {
          exit_time: new Date(),
          duration: Math.floor((new Date() - gymSession.entry_time) / 60000),
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Member checked out successfully',
        data: { accessLog: updatedGymSession },
      });
    } catch (error) {
      console.error('Member check-out error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { MemberController };
