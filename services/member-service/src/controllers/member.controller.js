const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const s3UploadService = require('../services/s3-upload.service');

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

  // Debug endpoint to check database and create test member
  async debugDatabase(req, res) {
    try {
      console.log('🔍 Debug: Checking database...');

      // Check total member count
      const totalMembers = await prisma.member.count();
      console.log('📊 Total members in database:', totalMembers);

      // Get all members
      const allMembers = await prisma.member.findMany({
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
        },
        take: 10,
      });

      console.log('📋 All members:', allMembers);

      // Check if specific member exists
      const testUserId = 'member_001_nguyen_van_a';
      const existingMember = await prisma.member.findUnique({
        where: { user_id: testUserId },
      });

      console.log('🔍 Member with user_id "member_001_nguyen_van_a":', existingMember);

      res.json({
        success: true,
        message: 'Database debug info',
        data: {
          totalMembers,
          allMembers,
          testMemberExists: !!existingMember,
          testMember: existingMember,
        },
      });
    } catch (error) {
      console.error('Debug database error:', error);
      res.status(500).json({
        success: false,
        message: 'Debug failed',
        data: null,
      });
    }
  }

  // Create member with user (called from Billing Service after payment)
  async createMemberWithUser(req, res) {
    try {
      const { user_id, membership_type, membership_start_date, membership_end_date } = req.body;

      if (!user_id || !membership_type) {
        return res.status(400).json({
          success: false,
          message: 'user_id và membership_type là bắt buộc',
          data: null,
        });
      }

      // Check if member already exists
      const existingMember = await prisma.member.findUnique({
        where: { user_id },
      });

      if (existingMember) {
        // Update existing member
        const updatedMember = await prisma.member.update({
          where: { user_id },
          data: {
            membership_type,
            membership_status: 'ACTIVE',
            expires_at: membership_end_date ? new Date(membership_end_date) : null,
            updated_at: new Date(),
          },
        });

        return res.json({
          success: true,
          message: 'Cập nhật thành viên thành công',
          data: updatedMember,
        });
      }

      // Fetch user info from Identity Service
      const axios = require('axios');
      const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001';

      let userData = null;
      try {
        const userResponse = await axios.get(`${identityServiceUrl}/users/${user_id}`);
        userData = userResponse.data.data;
      } catch (error) {
        console.error('Failed to fetch user from Identity Service:', error);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin người dùng',
          data: null,
        });
      }

      // Generate membership number
      const memberCount = await prisma.member.count();
      const membership_number = `GYM147-${String(memberCount + 1).padStart(6, '0')}`;

      // Create new member
      const newMember = await prisma.member.create({
        data: {
          user_id,
          membership_number,
          full_name: `${userData.first_name} ${userData.last_name}`.trim(),
          email: userData.email,
          phone: userData.phone || null,
          membership_type,
          membership_status: 'ACTIVE',
          expires_at: membership_end_date ? new Date(membership_end_date) : null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Tạo thành viên thành công',
        data: newMember,
      });
    } catch (error) {
      console.error('Create member with user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo thành viên',
        data: null,
      });
    }
  }

  // Get current member profile (for mobile app)
  async getCurrentMemberProfile(req, res) {
    try {
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
      // Decode JWT token to get user_id (simplified - in production use proper JWT verification)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format',
          data: null,
        });
      }

      // Add padding to base64 if needed
      let payloadBase64 = tokenParts[1];
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      const userId = payload.userId || payload.id;

      console.log('🔑 Decoded JWT payload:', payload);
      console.log('🔑 Extracted userId:', userId);

      console.log('🔍 Searching for member with user_id:', userId);

      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      console.log('🔍 Member found:', member ? 'YES' : 'NO');
      if (member) {
        console.log('🔍 Member details:', {
          id: member.id,
          user_id: member.user_id,
          full_name: member.full_name,
          email: member.email,
        });
      }

      if (!member) {
        console.log('❌ Member not found for user_id:', userId);
        return res.status(404).json({
          success: false,
          message: 'Member profile not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Member profile retrieved successfully',
        data: member,
      });
    } catch (error) {
      console.error('Get current member profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update current member profile (for mobile app)
  async updateCurrentMemberProfile(req, res) {
    try {
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

      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.membership_number;
      delete updateData.created_at;

      // Normalize phone and email (trim whitespace)
      if (updateData.phone) {
        updateData.phone = updateData.phone.trim();
      }
      if (updateData.email) {
        updateData.email = updateData.email.trim().toLowerCase();
      }

      // Convert date strings to Date objects
      if (updateData.date_of_birth) {
        updateData.date_of_birth = new Date(updateData.date_of_birth);
      }
      if (updateData.expires_at) {
        updateData.expires_at = new Date(updateData.expires_at);
      }

      // Check if member exists, if not create one
      let existingMember = await prisma.member.findUnique({
        where: { user_id: userId },
      });

      if (!existingMember) {
        console.log('⚠️ Member not found for user_id:', userId);
        console.log('🆕 Creating new member record...');

        // Get user info from Identity Service
        try {
          const axios = require('axios');
          const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

          const userResponse = await axios.get(`${identityServiceUrl}/profile`, {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          });

          console.log('👤 Full response from Identity Service:', userResponse.data);

          // Extract user data from nested structure
          const userData =
            userResponse.data.data?.user || userResponse.data.user || userResponse.data;

          console.log('👤 Extracted user data:', userData);

          // Prepare member data
          const firstName = userData.firstName || userData.first_name || '';
          const lastName = userData.lastName || userData.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'New Member';
          const email = userData.email || updateData.email || `member_${userId}@temp.com`;
          const phone = userData.phone || updateData.phone || undefined; // Allow null phone

          console.log('📋 Creating member with:', {
            user_id: userId,
            full_name: fullName,
            email,
            phone: phone || 'null (will be filled during registration)',
          });

          // Create member record
          existingMember = await prisma.member.create({
            data: {
              user_id: userId,
              membership_number: `MEM${Date.now()}`,
              full_name: fullName,
              email: email,
              phone: phone, // Can be undefined/null
              membership_status: 'PENDING',
              membership_type: updateData.membership_type || 'BASIC',
            },
          });

          console.log('✅ Member record created:', existingMember.id);
        } catch (createError) {
          console.error('❌ Failed to create member:', createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create member profile',
            data: null,
          });
        }
      }

      // Check if phone is already used by another member
      if (updateData.phone) {
        const phoneExists = await prisma.member.findFirst({
          where: {
            phone: updateData.phone,
            id: { not: existingMember.id },
          },
        });

        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được sử dụng bởi thành viên khác',
            data: null,
          });
        }
      }

      // Check if email is already used by another member
      if (updateData.email) {
        const emailExists = await prisma.member.findFirst({
          where: {
            email: updateData.email,
            id: { not: existingMember.id },
          },
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email này đã được sử dụng bởi thành viên khác',
            data: null,
          });
        }
      }

      // Update user in Identity Service if needed
      if (updateData.full_name || updateData.phone) {
        try {
          const axios = require('axios');
          const identityServiceUrl =
            process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3001';

          const userUpdateData = {};

          // Split full_name into first_name and last_name
          if (updateData.full_name) {
            const nameParts = updateData.full_name.trim().split(' ');
            if (nameParts.length > 1) {
              userUpdateData.firstName = nameParts[0];
              userUpdateData.lastName = nameParts.slice(1).join(' ');
            } else {
              userUpdateData.firstName = nameParts[0];
              userUpdateData.lastName = '';
            }
          }

          // Update phone
          if (updateData.phone) {
            userUpdateData.phone = updateData.phone;
          }

          // Call Identity Service to update user
          if (Object.keys(userUpdateData).length > 0) {
            console.log('🔄 Updating user in Identity Service:', userUpdateData);
            await axios.put(`${identityServiceUrl}/profile`, userUpdateData, {
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
            });
            console.log('✅ User updated in Identity Service');
          }
        } catch (identityError) {
          console.error('⚠️ Failed to update user in Identity Service:', identityError.message);
          // Don't fail the whole request if Identity Service update fails
          // Just log the error and continue with member update
        }
      }

      // Update member
      const member = await prisma.member.update({
        where: { user_id: userId },
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

      // Auto-create health metrics if weight or body_fat_percent is provided
      const healthMetricsToCreate = [];

      if (updateData.weight && updateData.weight > 0) {
        // Check if a weight metric already exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingWeightMetric = await prisma.healthMetric.findFirst({
          where: {
            member_id: member.id,
            metric_type: 'WEIGHT',
            recorded_at: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (!existingWeightMetric) {
          healthMetricsToCreate.push({
            member_id: member.id,
            metric_type: 'WEIGHT',
            value: updateData.weight,
            unit: 'kg',
            recorded_at: new Date(),
            notes: 'Initial weight from profile registration',
          });
        }
      }

      if (updateData.body_fat_percent && updateData.body_fat_percent > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingBodyFatMetric = await prisma.healthMetric.findFirst({
          where: {
            member_id: member.id,
            metric_type: 'BODY_FAT',
            recorded_at: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (!existingBodyFatMetric) {
          healthMetricsToCreate.push({
            member_id: member.id,
            metric_type: 'BODY_FAT',
            value: updateData.body_fat_percent,
            unit: '%',
            recorded_at: new Date(),
            notes: 'Initial body fat from profile registration',
          });
        }
      }

      if (updateData.height && updateData.height > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingHeightMetric = await prisma.healthMetric.findFirst({
          where: {
            member_id: member.id,
            metric_type: 'HEIGHT',
            recorded_at: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (!existingHeightMetric) {
          healthMetricsToCreate.push({
            member_id: member.id,
            metric_type: 'HEIGHT',
            value: updateData.height,
            unit: 'cm',
            recorded_at: new Date(),
            notes: 'Initial height from profile registration',
          });
        }
      }

      // Create health metrics in bulk if any
      if (healthMetricsToCreate.length > 0) {
        try {
          await prisma.healthMetric.createMany({
            data: healthMetricsToCreate,
          });
        } catch (healthMetricError) {
          console.error('Failed to create health metrics:', healthMetricError);
          // Don't fail the whole request, just log the error
        }
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: member,
      });
    } catch (error) {
      console.error('Update current member profile error:', error);
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

  // Create new membership by user_id (for cross-service integration)
  async createMembershipByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const { type, start_date, end_date, price, benefits, notes, status } = req.body;

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const membership = await prisma.membership.create({
        data: {
          member_id: member.id,
          type,
          start_date: new Date(start_date),
          end_date: new Date(end_date),
          price: parseFloat(price),
          benefits: benefits || [],
          notes,
          status: status || 'ACTIVE',
        },
      });

      // Update member's membership info
      await prisma.member.update({
        where: { id: member.id },
        data: {
          membership_type: type,
          membership_status: status || 'ACTIVE',
          expires_at: new Date(end_date),
        },
      });

      console.log(`✅ Membership created for member ${member.id} (user_id: ${user_id})`);

      res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        data: { membership },
      });
    } catch (error) {
      console.error('Create membership by user_id error:', error);
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

  // Get multiple members by member_ids (for cross-service integration)
  // memberIds must be array of Member.id (not user_id)
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
          id: {
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

  /**
   * Get member sessions
   */
  async getMemberSessions(req, res) {
    try {
      const { startDate, endDate, limit = 50, offset = 0 } = req.query;

      const where = {};
      if (startDate) where.check_in_time = { ...where.check_in_time, gte: new Date(startDate) };
      if (endDate) where.check_in_time = { ...where.check_in_time, lte: new Date(endDate) };

      const sessions = await prisma.gymSession.findMany({
        where,
        orderBy: { check_in_time: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      res.json({
        success: true,
        message: 'Member sessions retrieved successfully',
        data: sessions,
      });
    } catch (error) {
      console.error('Get member sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(req, res) {
    try {
      const session = await prisma.gymSession.findFirst({
        where: { check_out_time: null },
        orderBy: { check_in_time: 'desc' },
      });

      res.json({
        success: true,
        message: 'Current session retrieved successfully',
        data: session,
      });
    } catch (error) {
      console.error('Get current session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Record gym entry
   */
  async recordGymEntry(req, res) {
    try {
      const { memberId, workoutType = 'General' } = req.body;

      const session = await prisma.gymSession.create({
        data: {
          member_id: memberId,
          check_in_time: new Date(),
          workout_type: workoutType,
        },
      });

      res.json({
        success: true,
        message: 'Gym entry recorded successfully',
        data: session,
      });
    } catch (error) {
      console.error('Record gym entry error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Record gym exit
   */
  async recordGymExit(req, res) {
    try {
      const { sessionId } = req.body;

      const session = await prisma.gymSession.update({
        where: { id: sessionId },
        data: { check_out_time: new Date() },
      });

      res.json({
        success: true,
        message: 'Gym exit recorded successfully',
        data: session,
      });
    } catch (error) {
      console.error('Record gym exit error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get session details with equipment usage
   */
  async getSessionDetails(req, res) {
    try {
      const { sessionId } = req.params;

      // Get session with equipment usage
      const session = await prisma.gymSession.findUnique({
        where: { id: sessionId },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              membership_number: true,
            },
          },
          equipment_usage: {
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
            orderBy: { start_time: 'asc' },
          },
        },
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          data: null,
        });
      }

      // Calculate total calories from equipment usage (no fallback, use actual values)
      const totalEquipmentCalories = session.equipment_usage.reduce(
        (sum, usage) => sum + (usage.calories_burned ?? 0),
        0
      );

      // Calculate total duration from equipment usage (no fallback, use actual values)
      const totalEquipmentDuration = session.equipment_usage.reduce(
        (sum, usage) => sum + (usage.duration ?? 0),
        0
      );

      // Group equipment usage by category
      const equipmentByCategory = session.equipment_usage.reduce((acc, usage) => {
        const category = usage.equipment.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(usage);
        return acc;
      }, {});

      res.json({
        success: true,
        message: 'Session details retrieved successfully',
        data: {
          session: {
            id: session.id,
            entry_time: session.entry_time,
            exit_time: session.exit_time,
            duration: session.duration,
            entry_method: session.entry_method,
            exit_method: session.exit_method,
            entry_gate: session.entry_gate,
            exit_gate: session.exit_gate,
            calories_burned: session.calories_burned,
            session_rating: session.session_rating,
            notes: session.notes,
            member: session.member,
          },
          equipmentUsage: {
            totalSessions: session.equipment_usage.length,
            totalCalories: totalEquipmentCalories,
            totalDuration: totalEquipmentDuration,
            byCategory: equipmentByCategory,
            details: session.equipment_usage,
          },
        },
      });
    } catch (error) {
      console.error('Get session details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // ==================== AVATAR UPLOAD ====================

  // Upload avatar (base64 from mobile)
  async uploadAvatar(req, res) {
    try {
      console.log('📤 Avatar upload request received');

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

      // Check if member exists, if not create one
      let member = await prisma.member.findUnique({
        where: { user_id: userId },
      });

      if (!member) {
        console.log('⚠️ Member not found, creating new member for avatar upload...');

        // Get user info from Identity Service
        try {
          const axios = require('axios');
          const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';

          const userResponse = await axios.get(`${identityServiceUrl}/profile`, {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          });

          console.log('👤 Full response from Identity Service:', userResponse.data);

          // Extract user data from nested structure
          const userData =
            userResponse.data.data?.user || userResponse.data.user || userResponse.data;

          console.log('👤 Extracted user data:', userData);

          // Prepare member data
          const firstName = userData.firstName || userData.first_name || '';
          const lastName = userData.lastName || userData.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'New Member';
          const email = userData.email || `member_${userId}@temp.com`;
          const phone = userData.phone || undefined; // Allow null phone

          // Create member record
          member = await prisma.member.create({
            data: {
              user_id: userId,
              membership_number: `MEM${Date.now()}`,
              full_name: fullName,
              email: email,
              phone: phone, // Can be undefined/null
              membership_status: 'ACTIVE',
              membership_type: 'BASIC',
            },
          });

          console.log('✅ Member record created for avatar upload:', member.id);
        } catch (createError) {
          console.error('❌ Failed to create member:', createError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create member profile',
            error: createError.message,
          });
        }
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

      // Remove data:image/xxx;base64, prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');

      console.log(`📷 Uploading avatar for member: ${member.id}`);
      console.log(`📏 Image size: ${imageBuffer.length} bytes`);

      // Upload to S3
      const uploadResult = await s3UploadService.uploadFile(
        imageBuffer,
        filename,
        mimeType,
        userId
      );

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar',
          error: uploadResult.error,
        });
      }

      // Delete old avatar if exists
      if (member.profile_photo) {
        const oldKey = s3UploadService.extractKeyFromUrl(member.profile_photo);
        if (oldKey) {
          console.log(`🗑️ Deleting old avatar: ${oldKey}`);
          await s3UploadService.deleteFile(oldKey);
        }
      }

      // Update member with new avatar URL
      const updatedMember = await prisma.member.update({
        where: { user_id: userId },
        data: {
          profile_photo: uploadResult.url,
          updated_at: new Date(),
        },
      });

      console.log(`✅ Avatar uploaded successfully: ${uploadResult.url}`);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: uploadResult.url,
          member: updatedMember,
        },
      });
    } catch (error) {
      console.error('❌ Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  // ==================== GYM ACCESS VALIDATION ====================

  /**
   * Validate QR code for gym access
   * For testing: accepts any QR code with format GYM_ACCESS_*
   */
  async validateAccessQR(req, res) {
    try {
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'QR code is required',
        });
      }

      // For testing: accept any QR code starting with GYM_ACCESS_
      const isValid = code.trim().startsWith('GYM_ACCESS_');

      if (!isValid) {
        return res.json({
          success: true,
          data: {
            valid: false,
            message: 'Invalid QR code format. Expected: GYM_ACCESS_*',
          },
        });
      }

      // QR code is valid
      res.json({
        success: true,
        data: {
          valid: true,
          message: 'QR code is valid',
          expires_at: null, // No expiration for test QR codes
        },
      });
    } catch (error) {
      console.error('❌ Validate access QR error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate QR code',
      });
    }
  }

  /**
   * Validate RFID tag for gym access
   */
  async validateRFIDTag(req, res) {
    try {
      const { tag } = req.body;

      if (!tag || typeof tag !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'RFID tag is required',
        });
      }

      // For testing: accept any RFID tag with format RFID_*
      const isValid = tag.trim().startsWith('RFID_');

      if (!isValid) {
        return res.json({
          success: true,
          data: {
            valid: false,
            message: 'Invalid RFID tag format. Expected: RFID_*',
          },
        });
      }

      res.json({
        success: true,
        data: {
          valid: true,
          message: 'RFID tag is valid',
        },
      });
    } catch (error) {
      console.error('❌ Validate RFID tag error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate RFID tag',
      });
    }
  }

  /**
   * Process face recognition for gym access
   * Note: This is a stub for future implementation
   */
  async processFaceRecognition(req, res) {
    try {
      const { image } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Image data is required',
        });
      }

      // Stub: Always return not implemented
      res.json({
        success: true,
        data: {
          recognized: false,
          face_detected: false,
          message: 'Face recognition is not yet implemented',
        },
      });
    } catch (error) {
      console.error('❌ Face recognition error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process face recognition',
      });
    }
  }
}

module.exports = new MemberController();
