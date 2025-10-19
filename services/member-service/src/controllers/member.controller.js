const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MemberController {
  // ==================== MEMBER CRUD OPERATIONS ====================

  // Get all members with pagination and filters
  async getAllMembers(req, res) {
    try {
      const { page = 1, limit = 10, status, membership_type, search } = req.query;
      const skip = (page - 1) * limit;

      const where = {};
      if (status) where.membership_status = status;
      if (membership_type) where.membership_type = membership_type;
      if (search) {
        where.OR = [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { membership_number: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            memberships: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                gym_sessions: true,
                equipment_usage: true,
                health_metrics: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        prisma.member.count({ where }),
      ]);

      res.json({
        success: true,
        message: 'Members retrieved successfully',
        data: {
          members,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Get all members error:', error);
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
          equipment_usage: {
            orderBy: { start_time: 'desc' },
            take: 10,
            include: {
              equipment: true,
            },
          },
          health_metrics: {
            orderBy: { recorded_at: 'desc' },
            take: 20,
          },
          workout_plans: {
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
          },
          achievements: {
            orderBy: { unlocked_at: 'desc' },
          },
          notifications: {
            where: { is_read: false },
            orderBy: { created_at: 'desc' },
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

  // Get member by user_id (for cross-service integration)
  async getMemberByUserId(req, res) {
    try {
      const { user_id } = req.params;

      const member = await prisma.member.findUnique({
        where: { user_id },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
            take: 1,
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
      console.error('Get member by user_id error:', error);
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
        membership_type,
        membership_status,
        expires_at,
      } = req.body;

      // Validate required fields
      if (!user_id || !full_name || !phone || !email) {
        return res.status(400).json({
          success: false,
          message: 'User ID, full name, phone, and email are required',
          data: null,
        });
      }

      // Check if user_id already exists
      const existingMember = await prisma.member.findUnique({
        where: { user_id },
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Member with this user ID already exists',
          data: null,
        });
      }

      // Generate membership number
      const membership_number = `MEM${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create member
      const member = await prisma.member.create({
        data: {
          user_id,
          membership_number,
          full_name,
          phone,
          email,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          gender,
          address,
          emergency_contact,
          emergency_phone,
          height,
          weight,
          body_fat_percent,
          fitness_goals: fitness_goals || [],
          medical_conditions: medical_conditions || [],
          allergies: allergies || [],
          membership_status: membership_status || 'ACTIVE',
          membership_type: membership_type || 'BASIC',
          expires_at: expires_at ? new Date(expires_at) : null,
        },
        include: {
          memberships: true,
        },
      });

      // Create initial membership record
      if (membership_type || membership_status) {
        await prisma.membership.create({
          data: {
            member_id: member.id,
            type: membership_type || 'BASIC',
            start_date: new Date(),
            end_date: expires_at
              ? new Date(expires_at)
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
            status: membership_status || 'ACTIVE',
            price: 0, // Will be set by billing service
            benefits: [],
          },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Member created successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Create member error:', error);
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
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.membership_number;
      delete updateData.created_at;

      // Convert date strings to Date objects
      if (updateData.date_of_birth) {
        updateData.date_of_birth = new Date(updateData.date_of_birth);
      }
      if (updateData.expires_at) {
        updateData.expires_at = new Date(updateData.expires_at);
      }

      const member = await prisma.member.update({
        where: { id },
        data: {
          ...updateData,
          updated_at: new Date(),
        },
        include: {
          memberships: {
            orderBy: { created_at: 'desc' },
            take: 1,
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
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update member by user_id (for cross-service integration)
  async updateMemberByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const { full_name, phone, email } = req.body;

      const member = await prisma.member.update({
        where: { user_id },
        data: {
          full_name,
          phone,
          email,
          updated_at: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Member updated successfully',
        data: { member },
      });
    } catch (error) {
      console.error('Update member by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Delete member
  async deleteMember(req, res) {
    try {
      const { id } = req.params;

      await prisma.member.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Member deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete member error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== MEMBERSHIP MANAGEMENT ====================

  // Get member's memberships
  async getMemberMemberships(req, res) {
    try {
      const { id } = req.params;

      const memberships = await prisma.membership.findMany({
        where: { member_id: id },
        orderBy: { created_at: 'desc' },
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

  // Create new membership
  async createMembership(req, res) {
    try {
      const { id } = req.params;
      const { type, start_date, end_date, price, benefits, notes } = req.body;

      const membership = await prisma.membership.create({
        data: {
          member_id: id,
          type,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          price: parseFloat(price),
          benefits: benefits || [],
          notes,
        },
      });

      // Update member's membership info
      await prisma.member.update({
        where: { id },
        data: {
          membership_type: type,
          expires_at: new Date(end_date),
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

  // ==================== ACCESS CONTROL ====================

  // Generate RFID tag
  async generateRFIDTag(req, res) {
    try {
      const { id } = req.params;

      const rfid_tag = `RFID${Date.now()}${Math.floor(Math.random() * 10000)}`;

      const member = await prisma.member.update({
        where: { id },
        data: { rfid_tag },
      });

      res.json({
        success: true,
        message: 'RFID tag generated successfully',
        data: { member: { id: member.id, rfid_tag: member.rfid_tag } },
      });
    } catch (error) {
      console.error('Generate RFID tag error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Generate QR code
  async generateQRCode(req, res) {
    try {
      const { id } = req.params;

      const qr_code = `QR${Date.now()}${Math.floor(Math.random() * 10000)}`;

      const member = await prisma.member.update({
        where: { id },
        data: { qr_code },
      });

      res.json({
        success: true,
        message: 'QR code generated successfully',
        data: { member: { id: member.id, qr_code: member.qr_code } },
      });
    } catch (error) {
      console.error('Generate QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Toggle access
  async toggleAccess(req, res) {
    try {
      const { id } = req.params;
      const { access_enabled } = req.body;

      const member = await prisma.member.update({
        where: { id },
        data: { access_enabled },
      });

      res.json({
        success: true,
        message: `Access ${access_enabled ? 'enabled' : 'disabled'} successfully`,
        data: { member: { id: member.id, access_enabled: member.access_enabled } },
      });
    } catch (error) {
      console.error('Toggle access error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Get multiple members by user_ids (for cross-service integration)
  async getMembersByIds(req, res) {
    try {
      const { memberIds } = req.body;

      if (!memberIds || !Array.isArray(memberIds)) {
        return res.status(400).json({
          success: false,
          message: 'memberIds array is required',
          data: null,
        });
      }

      const members = await prisma.member.findMany({
        where: {
          user_id: {
            in: memberIds,
          },
        },
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          phone: true,
          profile_photo: true,
          membership_status: true,
          membership_type: true,
        },
      });

      res.json({
        success: true,
        message: 'Members retrieved successfully',
        data: { members },
      });
    } catch (error) {
      console.error('Get members by IDs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new MemberController();
