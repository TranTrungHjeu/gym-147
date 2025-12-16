// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');
const s3UploadService = require('../services/s3-upload.service');
const cacheService = require('../services/cache.service');

class MemberController {
  // ==================== HELPER METHODS ====================

  /**
   * Helper function to detect if running in Docker
   * Check for Docker-specific files or environment indicators
   */
  _isRunningInDocker() {
    try {
      // Check if running in Docker by looking for .dockerenv file
      const fs = require('fs');
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }
      // Check cgroup (Linux containers)
      if (fs.existsSync('/proc/self/cgroup')) {
        const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
        if (cgroup.includes('docker') || cgroup.includes('kubepods')) {
          return true;
        }
      }
    } catch (error) {
      // If file system checks fail, assume not Docker (fallback to localhost)
    }
    // Fallback: check environment variables
    return process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'production';
  }

  /**
   * Helper function to get Identity Service URL
   * REQUIRED: IDENTITY_SERVICE_URL must be set in environment variables
   */
  getIdentityServiceUrl() {
    if (!process.env.IDENTITY_SERVICE_URL) {
      throw new Error(
        'IDENTITY_SERVICE_URL environment variable is required. Please set it in your .env file.'
      );
    }

    console.log('Using IDENTITY_SERVICE_URL from env:', process.env.IDENTITY_SERVICE_URL);
    return process.env.IDENTITY_SERVICE_URL;
  }

  /**
   * Helper function to get userId from JWT token
   */
  getUserIdFromToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    try {
      const token = authHeader.split(' ')[1];
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return null;
      }

      // Add padding to base64 if needed
      let payloadBase64 = tokenParts[1];
      while (payloadBase64.length % 4) {
        payloadBase64 += '=';
      }

      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      return payload.userId || payload.id;
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return null;
    }
  }

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
      const cacheKey = cacheService.generateKey('member', id, { full: true });

      // Try to get from cache
      const member = await cacheService.getOrSet(
        cacheKey,
        async () => {
          const memberData = await prisma.member.findUnique({
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
              equipment_reports: {
                orderBy: { created_at: 'desc' },
                take: 10,
              },
              daily_streaks: {
                orderBy: { last_updated: 'desc' },
              },
              challenge_progress: {
                orderBy: { updated_at: 'desc' },
                take: 10,
              },
              points_transactions: {
                orderBy: { created_at: 'desc' },
                take: 20,
              },
              reward_redemptions: {
                orderBy: { redeemed_at: 'desc' },
                take: 10,
              },
            },
          });

          // Get profile_embedding using raw query (Prisma doesn't support vector type directly)
          // Must cast to text to avoid deserialization error
          if (memberData) {
            const embeddingResult = await prisma.$queryRaw`
              SELECT profile_embedding::text as profile_embedding
              FROM member_schema.members
              WHERE id = ${id}
            `;
            if (embeddingResult && embeddingResult[0]?.profile_embedding) {
              // Convert PostgreSQL vector string format to array
              // Vector is returned as string like "[0.1,0.2,0.3,...]"
              const embeddingString = embeddingResult[0].profile_embedding;
              try {
                // Parse the vector string to array
                memberData.profile_embedding = JSON.parse(embeddingString);
                console.log(`[SUCCESS] [getMemberById] Added profile_embedding to member ${id}`, {
                  embeddingLength: memberData.profile_embedding?.length || 0,
                  embeddingType: typeof memberData.profile_embedding,
                  isArray: Array.isArray(memberData.profile_embedding),
                });
              } catch (e) {
                console.warn(
                  `[WARNING] [getMemberById] Could not parse embedding string for member ${id}:`,
                  e.message
                );
                // If parsing fails, try to extract numbers from string
                const numbers = embeddingString.match(/[\d.]+/g);
                if (numbers && numbers.length > 0) {
                  memberData.profile_embedding = numbers.map(Number);
                  console.log(
                    `[SUCCESS] [getMemberById] Parsed embedding from string (${memberData.profile_embedding.length} dimensions)`
                  );
                } else {
                  console.warn(
                    `[WARNING] [getMemberById] Could not extract embedding values from string`
                  );
                }
              }
            } else {
              console.log(`[WARNING] [getMemberById] No profile_embedding found for member ${id}`);
            }
          }

          return memberData;
        },
        300 // 5 minutes TTL for detailed member data
      );

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
      const cacheKey = cacheService.generateKey('member', `user:${user_id}`);

      // Try to get from cache
      const member = await cacheService.getOrSet(
        cacheKey,
        async () => {
          return await prisma.member.findUnique({
            where: { user_id },
            include: {
              memberships: {
                where: { status: 'ACTIVE' },
                orderBy: { created_at: 'desc' },
                take: 1,
              },
            },
          });
        },
        600 // 10 minutes TTL for basic member info
      );

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
      console.log('[SEARCH] Debug: Checking database...');

      // Check total member count
      const totalMembers = await prisma.member.count();
      console.log('[STATS] Total members in database:', totalMembers);

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

      console.log('[LIST] All members:', allMembers);

      // Check if specific member exists
      const testUserId = 'member_001_nguyen_van_a';
      const existingMember = await prisma.member.findUnique({
        where: { user_id: testUserId },
      });

      console.log('[SEARCH] Member with user_id "member_001_nguyen_van_a":', existingMember);

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
        // Update existing member membership
        const startDate = membership_start_date ? new Date(membership_start_date) : new Date();
        const endDate = membership_end_date ? new Date(membership_end_date) : null;

        const updatedMember = await prisma.member.update({
          where: { user_id },
          data: {
            membership_type,
            membership_status: 'ACTIVE',
            expires_at: endDate,
            updated_at: new Date(),
          },
        });

        // Create membership history record
        try {
          await prisma.membership.create({
            data: {
              member_id: existingMember.id,
              type: membership_type,
              start_date: startDate,
              end_date: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default if no end date
              status: 'ACTIVE',
              price: 0, // Price is managed by billing service
              benefits: [],
            },
          });
          console.log(`[SUCCESS] Membership record created for member ${existingMember.id}`);
        } catch (membershipError) {
          console.error(
            '[WARNING] Failed to create membership record (non-critical):',
            membershipError.message
          );
          // Don't fail the update if membership record creation fails
        }

        // Invalidate cache
        const cacheKey = cacheService.generateKey('member', `user:${user_id}`);
        await cacheService.delete(cacheKey);

        console.log(
          `[SUCCESS] Member membership updated: ${existingMember.id} -> ${membership_type} (${startDate} to ${endDate})`
        );

        return res.json({
          success: true,
          message: 'Cập nhật membership thành công',
          data: updatedMember,
        });
      }

      // Fetch user info from Identity Service
      const axios = require('axios');
      const identityServiceUrl = this.getIdentityServiceUrl();
      console.log('[CONFIG] Calling Identity Service with URL:', identityServiceUrl);

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
      const startDate = membership_start_date ? new Date(membership_start_date) : new Date();
      const endDate = membership_end_date ? new Date(membership_end_date) : null;

      const newMember = await prisma.member.create({
        data: {
          user_id,
          membership_number,
          full_name: `${userData.first_name} ${userData.last_name}`.trim(),
          email: userData.email,
          phone: userData.phone || null,
          membership_type,
          membership_status: 'ACTIVE',
          expires_at: endDate,
        },
      });

      // Create membership history record for new member
      try {
        await prisma.membership.create({
          data: {
            member_id: newMember.id,
            type: membership_type,
            start_date: startDate,
            end_date: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default if no end date
            status: 'ACTIVE',
            price: 0, // Price is managed by billing service
            benefits: [],
          },
        });
        console.log(`[SUCCESS] Membership record created for new member ${newMember.id}`);
      } catch (membershipError) {
        console.error(
          '[WARNING] Failed to create membership record (non-critical):',
          membershipError.message
        );
        // Don't fail member creation if membership record creation fails
      }

      // Generate and update profile_embedding after member creation
      try {
        const embeddingService = require('../services/embedding.service.js');

        // Get member data (attendance history will be empty for new members)
        const memberWithData = await prisma.member.findUnique({
          where: { id: newMember.id },
        });

        // Get attendance history (will be empty for new members)
        const attendanceHistory = [];

        // Build profile text for embedding
        const profileText = embeddingService.buildMemberProfileText(
          memberWithData,
          attendanceHistory
        );

        if (profileText && profileText.trim().length > 0) {
          console.log(`[EMBEDDING] Generating profile embedding for new member ${newMember.id}...`);
          const embedding = await embeddingService.generateEmbedding(profileText);

          // Format vector for PostgreSQL
          const vectorString = embeddingService.formatVectorForPostgres(embedding);

          // Update profile_embedding using raw query (Prisma doesn't support vector type directly)
          await prisma.$executeRaw`
            UPDATE member_schema.members 
            SET profile_embedding = ${vectorString}::vector 
            WHERE id = ${newMember.id}
          `;

          console.log(
            `[SUCCESS] [EMBEDDING] Created profile_embedding for new member ${newMember.id}`
          );
        } else {
          console.warn(
            `[WARNING] [EMBEDDING] Profile text is empty for new member ${newMember.id}, skipping embedding generation`
          );
        }
      } catch (embeddingError) {
        // Don't fail the creation if embedding generation fails
        console.error('[ERROR] [EMBEDDING] Failed to generate profile embedding for new member:', {
          memberId: newMember.id,
          error: embeddingError.message,
          stack: embeddingError.stack,
        });
      }

      // Cache the new member
      const cacheKey = cacheService.generateKey('member', `user:${user_id}`);
      await cacheService.set(cacheKey, newMember, 600);

      res.status(201).json({
        success: true,
        message: 'Tạo hội viên thành công',
        data: newMember,
      });
    } catch (error) {
      console.error('Create member with user error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo hội viên',
        data: null,
      });
    }
  }

  // Get current member profile (for mobile app)
  async getCurrentMemberProfile(req, res) {
    try {
      // Debug: Log headers
      console.log('[SEARCH] Request headers:', {
        authorization: req.headers.authorization
          ? `${req.headers.authorization.substring(0, 20)}...`
          : 'NOT SET',
        'content-type': req.headers['content-type'],
      });

      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        console.log(
          '[ERROR] No userId extracted from token. Auth header:',
          req.headers.authorization ? 'EXISTS' : 'MISSING'
        );
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      console.log('[CONFIG] Extracted userId:', userId);
      console.log('[SEARCH] Searching for member with user_id:', userId);

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

      console.log('[SEARCH] Member found:', member ? 'YES' : 'NO');
      if (member) {
        console.log('[SEARCH] Member details:', {
          id: member.id,
          user_id: member.user_id,
          full_name: member.full_name,
          email: member.email,
        });
      }

      if (!member) {
        console.log(
          '[INFO] Member not found for user_id:',
          userId,
          '- User needs to complete registration'
        );
        return res.status(404).json({
          success: false,
          message: 'Member profile not found. Please complete your registration.',
          data: null,
          error: 'MEMBER_NOT_FOUND',
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

      // Check if member exists first (needed for comparison)
      let existingMember = await prisma.member.findUnique({
        where: { user_id: userId },
      });

      // Normalize phone and email (trim whitespace, convert empty to null)
      if (updateData.phone !== undefined) {
        if (updateData.phone === '' || updateData.phone === null) {
          updateData.phone = null; // Allow null phone (not required)
        } else {
          updateData.phone = updateData.phone.trim();
        }
      }
      if (updateData.email !== undefined) {
        if (updateData.email === '' || updateData.email === null) {
          updateData.email = null;
        } else {
          updateData.email = updateData.email.trim().toLowerCase();
        }
      }

      // Check if phone or email is being changed (compare with existing member)
      const isChangingPhone =
        updateData.phone !== undefined &&
        existingMember?.phone !== updateData.phone &&
        !(existingMember?.phone === null && updateData.phone === null);
      const isChangingEmail =
        updateData.email !== undefined && existingMember?.email !== updateData.email;

      // If changing phone or email, require OTP verification
      if (isChangingPhone || isChangingEmail) {
        const { otp, verificationMethod } = req.body;

        if (!otp || !verificationMethod) {
          return res.status(400).json({
            success: false,
            message:
              'Cần xác thực OTP để thay đổi email hoặc số điện thoại. Vui lòng gửi OTP trước.',
            data: {
              requiresOTP: true,
              changingPhone: isChangingPhone,
              changingEmail: isChangingEmail,
            },
          });
        }

        // Verify OTP with Identity Service
        try {
          const axios = require('axios');
          const identityServiceUrl = this.getIdentityServiceUrl();

          // Use the updateEmailPhoneWithOTP endpoint which handles OTP verification
          const verifyResponse = await axios.post(
            `${identityServiceUrl}/profile/update-email-phone-otp`,
            {
              otp,
              verificationMethod,
              newEmail: isChangingEmail ? updateData.email : undefined,
              newPhone: isChangingPhone ? updateData.phone : undefined,
            },
            {
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              timeout: 5000,
            }
          );

          if (!verifyResponse.data.success) {
            return res.status(400).json({
              success: false,
              message: verifyResponse.data.message || 'Mã OTP không đúng hoặc đã hết hạn',
              data: null,
            });
          }

          // If OTP verified successfully, Identity Service already updated user email/phone
          // So we should use the updated values from Identity Service response
          if (verifyResponse.data.data?.user) {
            if (isChangingEmail && verifyResponse.data.data.user.email) {
              updateData.email = verifyResponse.data.data.user.email;
            }
            if (isChangingPhone && verifyResponse.data.data.user.phone !== undefined) {
              updateData.phone = verifyResponse.data.data.user.phone || null;
            }
          }
        } catch (otpError) {
          console.error('[ERROR] OTP verification failed:', otpError);
          return res.status(400).json({
            success: false,
            message: otpError.response?.data?.message || 'Xác thực OTP thất bại. Vui lòng thử lại.',
            data: null,
          });
        }
      }

      // Convert date strings to Date objects
      if (updateData.date_of_birth) {
        updateData.date_of_birth = new Date(updateData.date_of_birth);
      }
      if (updateData.expires_at) {
        updateData.expires_at = new Date(updateData.expires_at);
      }

      // existingMember was already fetched above for comparison

      if (!existingMember) {
        console.log('[WARNING] Member not found for user_id:', userId);
        console.log('🆕 Creating new member record...');

        // Get user info from Identity Service
        try {
          const axios = require('axios');
          const identityServiceUrl = this.getIdentityServiceUrl();
          console.log(
            '[CONFIG] Calling Identity Service to get user info, URL:',
            identityServiceUrl
          );

          const userResponse = await axios.get(`${identityServiceUrl}/profile`, {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout
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

          console.log('[LIST] Creating member with:', {
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

          console.log('[SUCCESS] Member record created:', existingMember.id);
        } catch (createError) {
          console.error('[ERROR] Failed to create member:', createError);

          // Check if it's an authentication error from Identity Service
          if (createError.response && createError.response.status === 401) {
            return res.status(401).json({
              success: false,
              message: createError.response.data?.message || 'Token expired or invalid',
              data: null,
            });
          }

          return res.status(500).json({
            success: false,
            message: 'Failed to create member profile',
            data: null,
          });
        }
      }

      // Check if phone is already used by another member (only if phone is not null)
      if (updateData.phone !== undefined && updateData.phone !== null) {
        const phoneExists = await prisma.member.findFirst({
          where: {
            phone: updateData.phone,
            id: { not: existingMember.id },
          },
        });

        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được sử dụng bởi hội viên khác',
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
            message: 'Email này đã được sử dụng bởi hội viên khác',
            data: null,
          });
        }
      }

      // Update user in Identity Service if needed
      if (updateData.full_name || updateData.phone) {
        try {
          const axios = require('axios');
          const identityServiceUrl = this.getIdentityServiceUrl();
          console.log('[CONFIG] Calling Identity Service to update user, URL:', identityServiceUrl);

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
            console.log('[SYNC] Updating user in Identity Service:', userUpdateData);
            await axios.put(`${identityServiceUrl}/profile`, userUpdateData, {
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
            });
            console.log('[SUCCESS] User updated in Identity Service');
          }
        } catch (identityError) {
          console.error(
            '[WARNING] Failed to update user in Identity Service:',
            identityError.message
          );

          // If it's an authentication error, return 401 instead of continuing
          if (identityError.response && identityError.response.status === 401) {
            return res.status(401).json({
              success: false,
              message: identityError.response.data?.message || 'Token expired or invalid',
              data: null,
            });
          }

          // For other errors, don't fail the whole request
          // Just log the error and continue with member update
        }
      }

      // Check if profile is being completed (has date_of_birth, height, weight)
      const hasDateOfBirth = updateData.date_of_birth || existingMember.date_of_birth;
      const hasHeight = updateData.height || existingMember.height;
      const hasWeight = updateData.weight || existingMember.weight;
      const isCompletingProfile = hasDateOfBirth && hasHeight && hasWeight;
      const wasAlreadyCompleted = existingMember.onboarding_completed;

      // Update member with onboarding completion if profile is complete
      // Ensure phone is null if empty string, not undefined
      const finalUpdateData = {
        ...updateData,
        updated_at: new Date(),
      };

      // Ensure phone is null (not empty string) if not provided or empty
      if (finalUpdateData.phone === '' || finalUpdateData.phone === undefined) {
        // Only set to null if explicitly updating phone, otherwise keep existing
        if ('phone' in updateData) {
          finalUpdateData.phone = null;
        } else {
          delete finalUpdateData.phone; // Don't update phone if not in request
        }
      }

      // Auto-complete onboarding if profile has all required fields
      if (isCompletingProfile && !wasAlreadyCompleted) {
        finalUpdateData.onboarding_completed = true;
        finalUpdateData.onboarding_completed_at = new Date();
        console.log('[SUCCESS] Member profile completed - marking onboarding as complete');
      }

      // Update member
      const member = await prisma.member.update({
        where: { user_id: userId },
        data: finalUpdateData,
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

      // Generate and update profile_embedding if profile data changed
      // Check if any embedding-relevant fields were updated
      const embeddingRelevantFields = [
        'fitness_goals',
        'height',
        'weight',
        'medical_conditions',
        'allergies',
        'date_of_birth',
      ];
      const hasEmbeddingRelevantChanges = embeddingRelevantFields.some(
        field => updateData[field] !== undefined
      );

      if (hasEmbeddingRelevantChanges) {
        try {
          const embeddingService = require('../services/embedding.service.js');

          // Get updated member data with attendance history for better embedding
          const updatedMember = await prisma.member.findUnique({
            where: { id: member.id },
            include: {
              // We'll fetch attendance history separately to avoid circular dependency
            },
          });

          // Get recent attendance history for embedding context
          const attendanceHistory = await prisma.attendance.findMany({
            where: { member_id: member.id },
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
                },
              },
            },
            orderBy: { created_at: 'desc' },
            take: 20, // Last 20 attendances
          });

          // Build profile text for embedding
          const profileText = embeddingService.buildMemberProfileText(
            updatedMember,
            attendanceHistory
          );

          if (profileText && profileText.trim().length > 0) {
            console.log(`[EMBEDDING] Generating profile embedding for member ${member.id}...`);
            const embedding = await embeddingService.generateEmbedding(profileText);

            // Format vector for PostgreSQL
            const vectorString = embeddingService.formatVectorForPostgres(embedding);

            // Update profile_embedding using raw query (Prisma doesn't support vector type directly)
            // Use parameterized query to prevent SQL injection
            await prisma.$executeRaw`
              UPDATE member_schema.members 
              SET profile_embedding = ${vectorString}::vector 
              WHERE id = ${member.id}
            `;

            console.log(`[SUCCESS] [EMBEDDING] Updated profile_embedding for member ${member.id}`);
          } else {
            console.warn(
              `[WARNING] [EMBEDDING] Profile text is empty for member ${member.id}, skipping embedding generation`
            );
          }
        } catch (embeddingError) {
          // Don't fail the update if embedding generation fails
          console.error('[ERROR] [EMBEDDING] Failed to generate profile embedding:', {
            memberId: member.id,
            error: embeddingError.message,
            stack: embeddingError.stack,
          });
        }
      }

      // Invalidate cache for this member
      await cacheService.delete(cacheService.generateKey('member', member.id, { full: true }));
      if (member.user_id) {
        await cacheService.delete(cacheService.generateKey('member', `user:${member.user_id}`));
      }

      // Emit socket event for member update
      if (global.io && member.user_id) {
        const socketPayload = {
          member_id: member.id,
          id: member.id,
          action: 'updated',
          data: {
            id: member.id,
            user_id: member.user_id,
            email: member.email,
            phone: member.phone,
            full_name: member.full_name,
            membership_status: member.membership_status,
            membership_type: member.membership_type,
            isActive: member.membership_status === 'ACTIVE',
            onboarding_completed: member.onboarding_completed,
            updatedAt: member.updated_at?.toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to all admins (broadcast)
        global.io.emit('member:updated', socketPayload);
        console.log(`[EMIT] Emitted member:updated event for member ${member.id}`);

        // If registration was just completed, emit special event and create notifications
        // Skip MEMBER_UPDATED notification when registration is completed to avoid duplicates
        if (isCompletingProfile && !wasAlreadyCompleted && member.onboarding_completed) {
          const registrationCompletedPayload = {
            member_id: member.id,
            id: member.id,
            action: 'registration_completed',
            data: {
              id: member.id,
              user_id: member.user_id,
              email: member.email,
              phone: member.phone,
              full_name: member.full_name,
              membership_status: member.membership_status,
              membership_type: member.membership_type,
              onboarding_completed: true,
              onboarding_completed_at: member.onboarding_completed_at?.toISOString(),
              completedAt: member.updated_at?.toISOString(),
            },
            timestamp: new Date().toISOString(),
          };

          // Create notifications in database for all admins/super admins
          const notificationService = require('../services/notification.service');
          try {
            await notificationService.createRegistrationCompletedNotificationForAdmin({
              memberId: member.id,
              memberName: member.full_name,
              memberData: {
                user_id: member.user_id,
                email: member.email,
                phone: member.phone,
                membership_status: member.membership_status,
                membership_type: member.membership_type,
                onboarding_completed: true,
                onboarding_completed_at: member.onboarding_completed_at?.toISOString(),
                completedAt: member.updated_at?.toISOString(),
              },
            });
            console.log(
              `[SUCCESS] [REGISTRATION_COMPLETE] Created notifications in database for member ${member.id}`
            );
          } catch (notificationError) {
            console.error(
              '[ERROR] [REGISTRATION_COMPLETE] Failed to create notifications:',
              notificationError
            );
            // Don't fail the update if notification creation fails
          }

          // Emit to all admins (broadcast)
          global.io.emit('member:registration_completed', registrationCompletedPayload);
          console.log(
            `[EMIT] [REGISTRATION_COMPLETE] Emitted member:registration_completed event for member ${member.id}`
          );
        } else {
          // For regular updates (not registration completion), create MEMBER_UPDATED notification
          const notificationService = require('../services/notification.service');
          try {
            console.log(
              `[INFO] [MEMBER_UPDATED] [updateCurrentMemberProfile] Calling createMemberEventNotificationForAdmin for member ${member.id}`
            );
            const result = await notificationService.createMemberEventNotificationForAdmin({
              memberId: member.id,
              memberName: member.full_name,
              memberData: {
                id: member.id,
                user_id: member.user_id,
                email: member.email,
                phone: member.phone,
                full_name: member.full_name,
                membership_status: member.membership_status,
                membership_type: member.membership_type,
                isActive: member.membership_status === 'ACTIVE',
                onboarding_completed: member.onboarding_completed,
                updatedAt: member.updated_at?.toISOString(),
              },
              eventType: 'MEMBER_UPDATED',
              title: 'Cập nhật thông tin hội viên',
              message: `Thông tin của ${member.full_name || 'hội viên'} đã được cập nhật`,
            });
            console.log(
              `[SUCCESS] [MEMBER_UPDATED] [updateCurrentMemberProfile] Notification creation result:`,
              JSON.stringify(result, null, 2)
            );
          } catch (notificationError) {
            console.error(
              '[ERROR] [MEMBER_UPDATED] [updateCurrentMemberProfile] Failed to create notifications:',
              notificationError
            );
            console.error(
              '[ERROR] [MEMBER_UPDATED] [updateCurrentMemberProfile] Error stack:',
              notificationError.stack
            );
            // Don't fail the update if notification creation fails
          }
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

      // Generate and update profile_embedding after member creation
      try {
        const embeddingService = require('../services/embedding.service.js');

        // Get member data (attendance history will be empty for new members)
        const memberWithData = await prisma.member.findUnique({
          where: { id: member.id },
        });

        // Get attendance history (will be empty for new members, but included for consistency)
        const attendanceHistory = await prisma.attendance.findMany({
          where: { member_id: member.id },
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
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 20, // Last 20 attendances
        });

        // Build profile text for embedding
        const profileText = embeddingService.buildMemberProfileText(
          memberWithData,
          attendanceHistory
        );

        if (profileText && profileText.trim().length > 0) {
          console.log(`[EMBEDDING] Generating profile embedding for new member ${member.id}...`);
          const embedding = await embeddingService.generateEmbedding(profileText);

          // Format vector for PostgreSQL
          const vectorString = embeddingService.formatVectorForPostgres(embedding);

          // Update profile_embedding using raw query (Prisma doesn't support vector type directly)
          await prisma.$executeRaw`
            UPDATE member_schema.members 
            SET profile_embedding = ${vectorString}::vector 
            WHERE id = ${member.id}
          `;

          console.log(
            `[SUCCESS] [EMBEDDING] Created profile_embedding for new member ${member.id}`
          );
        } else {
          console.warn(
            `[WARNING] [EMBEDDING] Profile text is empty for new member ${member.id}, skipping embedding generation`
          );
        }
      } catch (embeddingError) {
        // Don't fail the creation if embedding generation fails
        console.error('[ERROR] [EMBEDDING] Failed to generate profile embedding for new member:', {
          memberId: member.id,
          error: embeddingError.message,
          stack: embeddingError.stack,
        });
      }

      // Emit socket event for member creation
      if (global.io && member.user_id) {
        const socketPayload = {
          member_id: member.id,
          id: member.id,
          action: 'created',
          data: {
            id: member.id,
            user_id: member.user_id,
            email: member.email,
            phone: member.phone,
            full_name: member.full_name,
            membership_status: member.membership_status,
            membership_type: member.membership_type,
            isActive: member.membership_status === 'ACTIVE',
            createdAt: member.created_at?.toISOString(),
            updatedAt: member.updated_at?.toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to all admins (broadcast)
        global.io.emit('member:created', socketPayload);
        console.log(
          `[EMIT] [MEMBER_SERVICE] Emitted member:created event for member ${member.id}, user_id: ${member.user_id}`
        );
        console.log(
          `[EMIT] [MEMBER_SERVICE] Socket payload:`,
          JSON.stringify(socketPayload, null, 2)
        );

        // NOTE: Do NOT create notification here when member is first created
        // Notification will be created when member completes registration (onboarding_completed = true)
        // This prevents duplicate notifications during the registration flow
        console.log(
          `[INFO] [MEMBER_CREATED] Skipping notification creation - will be created when registration is completed`
        );
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

      // Get old member data to detect status changes
      const oldMember = await prisma.member.findUnique({
        where: { id },
        select: { membership_status: true, user_id: true },
      });

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

      // Check if membership_status changed
      const statusChanged =
        updateData.membership_status &&
        oldMember?.membership_status !== updateData.membership_status;

      // Invalidate cache for this member
      await cacheService.delete(cacheService.generateKey('member', id, { full: true }));
      if (member.user_id) {
        await cacheService.delete(cacheService.generateKey('member', `user:${member.user_id}`));
      }

      // Emit socket event for member update
      if (global.io && member.user_id) {
        const socketPayload = {
          member_id: member.id,
          id: member.id,
          action: 'updated',
          data: {
            id: member.id,
            user_id: member.user_id,
            email: member.email,
            phone: member.phone,
            full_name: member.full_name,
            membership_status: member.membership_status,
            membership_type: member.membership_type,
            isActive: member.membership_status === 'ACTIVE',
            updatedAt: member.updated_at?.toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to all admins (broadcast)
        global.io.emit('member:updated', socketPayload);
        console.log(`[EMIT] Emitted member:updated event for member ${member.id}`);

        // Create notifications in database for all admins/super admins
        const notificationService = require('../services/notification.service');
        try {
          console.log(
            `[INFO] [MEMBER_UPDATED] Calling createMemberEventNotificationForAdmin for member ${member.id}`
          );
          const result = await notificationService.createMemberEventNotificationForAdmin({
            memberId: member.id,
            memberName: member.full_name,
            memberData: {
              id: member.id,
              user_id: member.user_id,
              email: member.email,
              phone: member.phone,
              full_name: member.full_name,
              membership_status: member.membership_status,
              membership_type: member.membership_type,
              isActive: member.membership_status === 'ACTIVE',
              onboarding_completed: member.onboarding_completed,
              updatedAt: member.updated_at?.toISOString(),
            },
            eventType: 'MEMBER_UPDATED',
            title: 'Cập nhật thông tin thành viên',
            message: `Thông tin của ${member.full_name || 'thành viên'} đã được cập nhật`,
          });
          console.log(
            `[SUCCESS] [MEMBER_UPDATED] Notification creation result:`,
            JSON.stringify(result, null, 2)
          );
        } catch (notificationError) {
          console.error(
            '[ERROR] [MEMBER_UPDATED] Failed to create notifications:',
            notificationError
          );
          console.error('[ERROR] [MEMBER_UPDATED] Error stack:', notificationError.stack);
          // Don't fail the update if notification creation fails
        }

        // If status changed, also emit status_changed event
        if (statusChanged) {
          const statusPayload = {
            member_id: member.id,
            id: member.id,
            action: 'status_changed',
            data: {
              id: member.id,
              user_id: member.user_id,
              isActive: member.membership_status === 'ACTIVE',
              membership_status: member.membership_status,
              oldStatus: oldMember?.membership_status,
              newStatus: member.membership_status,
              updatedAt: member.updated_at?.toISOString(),
            },
            timestamp: new Date().toISOString(),
          };

          // Emit to all admins (broadcast)
          global.io.emit('member:status_changed', statusPayload);
          console.log(`[EMIT] Emitted member:status_changed event for member ${member.id}`);

          // Create notifications in database for all admins/super admins
          const notificationService = require('../services/notification.service');
          try {
            await notificationService.createMemberEventNotificationForAdmin({
              memberId: member.id,
              memberName: member.full_name,
              memberData: {
                user_id: member.user_id,
                email: member.email,
                phone: member.phone,
                membership_status: member.membership_status,
                membership_type: member.membership_type,
                oldStatus: oldMember?.membership_status,
                newStatus: member.membership_status,
                updatedAt: member.updated_at?.toISOString(),
              },
              eventType: 'MEMBER_UPDATED',
              title: 'Thay đổi trạng thái thành viên',
              message: `Trạng thái của ${member.full_name || 'thành viên'} đã thay đổi từ ${oldMember?.membership_status || 'N/A'} sang ${member.membership_status}`,
            });
            console.log(
              `[SUCCESS] [MEMBER_STATUS_CHANGED] Created notifications in database for member ${member.id}`
            );
          } catch (notificationError) {
            console.error(
              '[ERROR] [MEMBER_STATUS_CHANGED] Failed to create notifications:',
              notificationError
            );
            // Don't fail the update if notification creation fails
          }
        }
      }

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

      console.log('[PROCESS] updateMemberByUserId called:', {
        user_id,
        full_name,
        phone,
        email,
        phoneType: typeof phone,
        emailType: typeof email,
      });

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

      const member = await prisma.member.update({
        where: { user_id },
        data: {
          full_name,
          phone: phoneValue,
          email: emailValue,
          updated_at: new Date(),
        },
      });

      console.log('[SUCCESS] Member updated successfully:', {
        memberId: member.id,
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
      });

      // Invalidate cache for this member
      await cacheService.delete(cacheService.generateKey('member', `user:${user_id}`));
      if (member.id) {
        await cacheService.delete(cacheService.generateKey('member', member.id, { full: true }));
      }

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

      // Get member before deletion to invalidate cache
      const member = await prisma.member.findUnique({
        where: { id },
        select: { user_id: true, membership_status: true },
      });

      await prisma.member.delete({
        where: { id },
      });

      // Invalidate cache
      await cacheService.delete(cacheService.generateKey('member', id, { full: true }));
      if (member?.user_id) {
        await cacheService.delete(cacheService.generateKey('member', `user:${member.user_id}`));
      }

      // Emit socket event for member deletion
      if (global.io && member?.user_id) {
        const socketPayload = {
          member_id: id,
          id: id,
          action: 'deleted',
          data: {
            id: id,
            user_id: member.user_id,
            isActive: member.membership_status === 'ACTIVE',
          },
          timestamp: new Date().toISOString(),
        };

        // Emit to all admins (broadcast)
        global.io.emit('member:deleted', socketPayload);
        // Also emit user:deleted event for account deletion notification
        global.io.to(`user:${member.user_id}`).emit('user:deleted', {
          user_id: member.user_id,
          id: member.user_id,
          action: 'deleted',
          role: 'MEMBER',
          data: {
            id: member.user_id,
            member_id: id,
          },
          timestamp: new Date().toISOString(),
        });
        console.log(`[EMIT] Emitted member:deleted and user:deleted events for member ${id}`);

        // Create notifications in database for all admins/super admins
        const notificationService = require('../services/notification.service');
        try {
          await notificationService.createMemberEventNotificationForAdmin({
            memberId: id,
            memberName: member.full_name,
            memberData: {
              user_id: member.user_id,
              email: member.email,
              phone: member.phone,
              membership_status: member.membership_status,
              membership_type: member.membership_type,
            },
            eventType: 'MEMBER_DELETED',
            title: 'Xóa hội viên',
            message: `Hội viên ${member.full_name || 'N/A'} đã bị xóa khỏi hệ thống`,
          });
          console.log(
            `[SUCCESS] [MEMBER_DELETED] Created notifications in database for member ${id}`
          );
        } catch (notificationError) {
          console.error(
            '[ERROR] [MEMBER_DELETED] Failed to create notifications:',
            notificationError
          );
          // Don't fail the deletion if notification creation fails
        }
      }

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

      console.log(`[SUCCESS] Membership created for member ${member.id} (user_id: ${user_id})`);

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
   * Get members for notification (public endpoint, no auth required)
   * Supports both GET (with query params) and POST (with member_ids in body)
   * GET /api/members/for-notification?membership_type=PREMIUM&status=ACTIVE&search=keyword
   * POST /api/members/for-notification { member_ids: ["id1", "id2"] }
   */
  async getMembersForNotification(req, res) {
    try {
      // Support both GET (query params) and POST (body with member_ids)
      const member_ids = req.body?.member_ids || req.query?.member_ids;
      const { membership_type, status, search, limit = 1000 } = req.query;

      // Parse and limit pagination parameters
      const parsedLimit = Math.min(parseInt(limit) || 1000, 5000); // Max 5000 for notifications

      let where = {};

      // If specific member_ids provided (POST or query param)
      if (member_ids) {
        const idsArray = Array.isArray(member_ids) ? member_ids : member_ids.split(',');
        where.id = { in: idsArray };
      } else {
        // Otherwise use filters
        if (membership_type) where.membership_type = membership_type;
        if (status) where.membership_status = status;
        if (search) {
          where.OR = [
            { full_name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { membership_number: { contains: search, mode: 'insensitive' } },
          ];
        }
      }

      const members = await prisma.member.findMany({
        where,
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          phone: true,
          membership_status: true,
          membership_type: true,
        },
        take: parsedLimit,
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Members retrieved successfully for notification',
        data: { members },
      });
    } catch (error) {
      console.error('Get members for notification error:', error);
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
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const { start_date, end_date, limit = 50, offset = 0 } = req.query;

      const where = { member_id: member.id };
      if (start_date) where.entry_time = { gte: new Date(start_date) };
      if (end_date) where.entry_time = { ...(where.entry_time || {}), lte: new Date(end_date) };

      const sessions = await prisma.gymSession.findMany({
        where,
        orderBy: { entry_time: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          equipment_usage: {
            include: {
              equipment: true,
            },
          },
        },
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
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const session = await prisma.gymSession.findFirst({
        where: {
          member_id: member.id,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
        include: {
          equipment_usage: {
            include: {
              equipment: true,
            },
          },
        },
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
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Check if there's already an active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: member.id,
          exit_time: null,
        },
      });

      if (activeSession) {
        return res.status(400).json({
          success: false,
          message: 'Active session already exists',
          data: activeSession,
        });
      }

      const session = await prisma.gymSession.create({
        data: {
          member_id: member.id,
          entry_time: new Date(),
          entry_method: 'MOBILE_APP',
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
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Find active session
      const activeSession = await prisma.gymSession.findFirst({
        where: {
          member_id: member.id,
          exit_time: null,
        },
        orderBy: { entry_time: 'desc' },
      });

      if (!activeSession) {
        return res.status(404).json({
          success: false,
          message: 'No active session found',
          data: null,
        });
      }

      // Calculate duration
      const exitTime = new Date();
      const entryTime = new Date(activeSession.entry_time);
      const duration = Math.floor((exitTime - entryTime) / 1000 / 60); // duration in minutes

      // Update session
      const session = await prisma.gymSession.update({
        where: { id: activeSession.id },
        data: {
          exit_time: exitTime,
          exit_method: 'MOBILE_APP',
          duration: duration,
        },
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
              equipment: true,
            },
          },
        },
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
   * Get session statistics for current member
   */
  async getSessionStats(req, res) {
    try {
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      const { period = '30' } = req.query; // days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const [totalSessions, totalDuration, totalCalories, avgSessionDuration, recentSessions] =
        await Promise.all([
          prisma.gymSession.count({
            where: {
              member_id: member.id,
              entry_time: { gte: startDate },
            },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: member.id,
              entry_time: { gte: startDate },
              duration: { not: null },
            },
            _sum: { duration: true },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: member.id,
              entry_time: { gte: startDate },
              calories_burned: { not: null },
            },
            _sum: { calories_burned: true },
          }),
          prisma.gymSession.aggregate({
            where: {
              member_id: member.id,
              entry_time: { gte: startDate },
              duration: { not: null },
            },
            _avg: { duration: true },
          }),
          prisma.gymSession.findMany({
            where: {
              member_id: member.id,
              entry_time: { gte: startDate },
            },
            orderBy: { entry_time: 'desc' },
            take: 10,
          }),
        ]);

      res.json({
        success: true,
        message: 'Session statistics retrieved successfully',
        data: {
          totalSessions,
          totalDuration: totalDuration._sum.duration || 0,
          totalCalories: totalCalories._sum.calories_burned || 0,
          avgSessionDuration: Math.round(avgSessionDuration._avg.duration || 0),
          recentSessions,
        },
      });
    } catch (error) {
      console.error('Get session stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member profile statistics
   */
  async getProfileStats(req, res) {
    try {
      // Get user_id from JWT token
      const userId = this.getUserIdFromToken(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'No token provided',
          data: null,
        });
      }

      // Get member by user_id with related data
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        include: {
          memberships: {
            where: { status: 'ACTIVE' },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          gym_sessions: {
            orderBy: { entry_time: 'desc' },
            take: 10,
          },
          achievements: {
            orderBy: { unlocked_at: 'desc' },
            take: 10,
          },
          health_metrics: {
            orderBy: { recorded_at: 'desc' },
            take: 10,
          },
          workout_plans: {
            where: { is_active: true },
            take: 5,
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

      // Calculate statistics
      const totalSessions = await prisma.gymSession.count({
        where: { member_id: member.id },
      });

      const totalWorkouts = await prisma.workoutPlan.count({
        where: { member_id: member.id },
      });

      const totalAchievements = await prisma.achievement.count({
        where: { member_id: member.id },
      });

      res.json({
        success: true,
        message: 'Profile statistics retrieved successfully',
        data: {
          member: {
            id: member.id,
            full_name: member.full_name,
            email: member.email,
            membership_status: member.membership_status,
            membership_type: member.membership_type,
          },
          stats: {
            totalSessions,
            totalWorkouts,
            totalAchievements,
            activeMembership: member.memberships[0] || null,
          },
          recentSessions: member.gym_sessions,
          recentAchievements: member.achievements,
          recentHealthMetrics: member.health_metrics,
          activeWorkouts: member.workout_plans,
        },
      });
    } catch (error) {
      console.error('Get profile stats error:', error);
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

      // Calculate calories from workout plans
      // session.calories_burned = workout calories + equipment calories
      // So workout calories = session.calories_burned - equipment calories
      const totalCaloriesBurned = session.calories_burned || 0;
      const caloriesFromWorkout = Math.max(0, totalCaloriesBurned - totalEquipmentCalories);

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
          caloriesBreakdown: {
            fromWorkout: caloriesFromWorkout,
            fromEquipment: totalEquipmentCalories,
            total: totalCaloriesBurned,
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
        console.log('[WARNING] Member not found, creating new member for avatar upload...');

        // Get user info from Identity Service
        try {
          const axios = require('axios');
          const identityServiceUrl = this.getIdentityServiceUrl();
          console.log(
            '[CONFIG] Calling Identity Service to get user info, URL:',
            identityServiceUrl
          );

          const userResponse = await axios.get(`${identityServiceUrl}/profile`, {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
            timeout: 5000, // 5 second timeout
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

          console.log('[SUCCESS] Member record created for avatar upload:', member.id);
        } catch (createError) {
          console.error('[ERROR] Failed to create member:', createError);
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

      console.log(`📷 Uploading avatar for member: ${member.id}`);
      console.log(
        `📏 Image size: ${imageBuffer.length} bytes (${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB)`
      );
      console.log(`📄 MIME type: ${mimeType}`);

      // Upload to S3
      console.log('[START] Starting S3 upload...');
      let uploadResult;
      try {
        uploadResult = await s3UploadService.uploadFile(imageBuffer, filename, mimeType, userId);
        console.log('[DATA] S3 upload result:', {
          success: uploadResult.success,
          error: uploadResult.error,
          url: uploadResult.url,
        });
      } catch (uploadError) {
        console.error('[ERROR] S3 upload exception:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar',
          error: uploadError.message || 'Unknown error during upload',
        });
      }

      if (!uploadResult.success) {
        console.error('[ERROR] S3 upload failed:', uploadResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload avatar',
          error: uploadResult.error,
        });
      }

      // Delete old avatar if exists
      if (member.profile_photo) {
        try {
          const oldKey = s3UploadService.extractKeyFromUrl(member.profile_photo);
          if (oldKey) {
            console.log(`[DELETE] Deleting old avatar: ${oldKey}`);
            const deleteResult = await s3UploadService.deleteFile(oldKey);
            if (!deleteResult.success) {
              console.warn(
                '[WARNING] Failed to delete old avatar (non-critical):',
                deleteResult.error
              );
            }
          }
        } catch (deleteError) {
          console.warn('[WARNING] Error deleting old avatar (non-critical):', deleteError.message);
          // Don't fail the request if old avatar deletion fails
        }
      }

      // Update member with new avatar URL
      console.log('💾 Updating member record with new avatar URL...');
      let updatedMember;
      try {
        updatedMember = await prisma.member.update({
          where: { user_id: userId },
          data: {
            profile_photo: uploadResult.url,
            updated_at: new Date(),
          },
        });
        console.log('[SUCCESS] Member record updated successfully');
      } catch (updateError) {
        console.error('[ERROR] Failed to update member record:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Avatar uploaded but failed to update member record',
          error: updateError.message,
        });
      }

      // Invalidate cache for this member
      try {
        await cacheService.delete(cacheService.generateKey('member', `user:${userId}`));
        if (updatedMember.id) {
          await cacheService.delete(
            cacheService.generateKey('member', updatedMember.id, { full: true })
          );
        }
        console.log('[SUCCESS] Cache invalidated');
      } catch (cacheError) {
        console.warn('[WARNING] Failed to invalidate cache (non-critical):', cacheError.message);
        // Don't fail the request if cache invalidation fails
      }

      console.log(`[SUCCESS] Avatar uploaded successfully: ${uploadResult.url}`);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatarUrl: uploadResult.url,
          originalSize: uploadResult.originalSize,
          optimizedSize: uploadResult.optimizedSize,
          compressionRatio: uploadResult.compressionRatio,
          metadata: uploadResult.metadata,
          member: updatedMember,
        },
      });
    } catch (error) {
      console.error('[ERROR] Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  // ==================== ONBOARDING TRACKING ====================

  // Get onboarding status
  async getOnboardingStatus(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
          data: null,
        });
      }

      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          onboarding_completed: true,
          onboarding_steps: true,
          onboarding_completed_at: true,
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
        message: 'Onboarding status retrieved successfully',
        data: {
          completed: member.onboarding_completed || false,
          steps: member.onboarding_steps || {},
          completedAt: member.onboarding_completed_at,
        },
      });
    } catch (error) {
      console.error('Get onboarding status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  // Update onboarding progress
  async updateOnboardingProgress(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
          data: null,
        });
      }

      const { step, completed, completedAll } = req.body;

      // Get current member
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Update onboarding steps
      const currentSteps = member.onboarding_steps || {};
      const updatedSteps = {
        ...currentSteps,
        ...(step && { [step]: completed !== undefined ? completed : true }),
      };

      // Update member
      const updateData = {
        onboarding_steps: updatedSteps,
        ...(completedAll && {
          onboarding_completed: true,
          onboarding_completed_at: new Date(),
        }),
      };

      const updatedMember = await prisma.member.update({
        where: { user_id: userId },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Onboarding progress updated successfully',
        data: {
          completed: updatedMember.onboarding_completed,
          steps: updatedMember.onboarding_steps,
          completedAt: updatedMember.onboarding_completed_at,
        },
      });
    } catch (error) {
      console.error('Update onboarding progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
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
      console.error('[ERROR] Validate access QR error:', error);
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
      console.error('[ERROR] Validate RFID tag error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate RFID tag',
      });
    }
  }

  // Toggle AI Class Recommendations (Premium feature)
  async toggleAIClassRecommendations(req, res) {
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
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token not provided',
          data: null,
        });
      }

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

      let payload;
      try {
        payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      } catch (parseError) {
        console.error('JWT token parse error:', parseError);
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload',
          data: null,
        });
      }

      const userId = payload.userId || payload.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in token',
          data: null,
        });
      }

      // Get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id: userId },
        select: {
          id: true,
          membership_type: true,
          ai_class_recommendations_enabled: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Check if member has PREMIUM or VIP membership
      if (!['PREMIUM', 'VIP'].includes(member.membership_type)) {
        return res.status(403).json({
          success: false,
          message: 'AI Class Recommendations is only available for PREMIUM and VIP members',
          data: null,
        });
      }

      // Toggle the setting (handle null as false)
      const currentValue = member.ai_class_recommendations_enabled ?? false;
      const newValue = !currentValue;

      // Toggle the setting
      const updatedMember = await prisma.member.update({
        where: { id: member.id },
        data: {
          ai_class_recommendations_enabled: newValue,
        },
        select: {
          id: true,
          ai_class_recommendations_enabled: true,
          membership_type: true,
        },
      });

      res.json({
        success: true,
        message: `AI Class Recommendations ${updatedMember.ai_class_recommendations_enabled ? 'enabled' : 'disabled'}`,
        data: {
          ai_class_recommendations_enabled: updatedMember.ai_class_recommendations_enabled,
        },
      });
    } catch (error) {
      console.error('[ERROR] Toggle AI Class Recommendations error:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });

      // Handle Prisma errors
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Database constraint violation',
          data: null,
        });
      }

      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Handle field not found error (migration not run)
      if (error.message && error.message.includes('ai_class_recommendations_enabled')) {
        return res.status(500).json({
          success: false,
          message: 'Database migration required. Please run: npx prisma migrate dev',
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

  // Send system announcement (Admin only)
  async sendSystemAnnouncement(req, res) {
    try {
      const { title, message, data } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required',
          data: null,
        });
      }

      const notificationService = require('../services/notification.service');
      const result = await notificationService.sendSystemAnnouncement({
        title,
        message,
        data: data || {},
      });

      res.json({
        success: result.success,
        message: result.success
          ? `System announcement sent to ${result.sent} members`
          : 'Failed to send system announcement',
        data: result,
      });
    } catch (error) {
      console.error('Send system announcement error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Report issue - Member reports a general issue to admin/super admin
   * POST /members/:member_id/report-issue
   */
  async reportIssue(req, res) {
    try {
      const { member_id } = req.params;
      const { issue_type, title, description, severity, images, location } = req.body;

      // Validate required fields
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Title and description are required',
          data: null,
        });
      }

      // Get member info
      const member = await prisma.member.findUnique({
        where: { id: member_id },
        select: {
          id: true,
          user_id: true,
          full_name: true,
          email: true,
          phone: true,
          membership_number: true,
        },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Get all admin and super admin users from Identity Service
      const axios = require('axios');
      const IDENTITY_SERVICE_URL = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001';
      let admins = [];

      try {
        const response = await axios.get(`${IDENTITY_SERVICE_URL}/auth/users/admins`, {
          timeout: 10000,
        });
        if (response.data?.success && response.data?.data?.users) {
          admins = response.data.data.users.map(admin => ({
            user_id: admin.id,
            email: admin.email,
            role: admin.role,
          }));
          console.log(
            `[REPORT_ISSUE] Retrieved ${admins.length} admin/super-admin users for notification`
          );
        } else {
          console.warn(
            '[WARNING] Invalid response from Identity Service /auth/users/admins:',
            response.data
          );
        }
      } catch (apiError) {
        console.error(
          '[ERROR] Failed to get admins from Identity Service:',
          apiError.message || apiError
        );
        return res.status(500).json({
          success: false,
          message: 'Failed to get admin list',
          data: null,
        });
      }

      if (admins.length === 0) {
        console.warn('[WARNING] No active admins found for issue report notification');
        return res.status(500).json({
          success: false,
          message: 'No admins available to receive the report',
          data: null,
        });
      }

      // Prepare notification data
      const severityText = severity || 'MEDIUM';
      const issueTypeText = issue_type || 'GENERAL';
      const notificationTitle = `Báo cáo sự cố - ${title}`;
      const notificationMessage = `${member.full_name || 'Hội viên'} đã báo cáo sự cố: ${title}`;

      // Create notifications for all admins
      const createdNotifications = [];
      const notificationPromises = admins.map(async admin => {
        try {
          const response = await axios.post(
            `${IDENTITY_SERVICE_URL}/notifications`,
            {
              user_id: admin.user_id,
              type: 'ISSUE_REPORT',
              title: notificationTitle,
              message: notificationMessage,
              data: {
                member_id: member.id,
                member_user_id: member.user_id,
                member_name: member.full_name,
                member_email: member.email,
                member_phone: member.phone,
                membership_number: member.membership_number,
                issue_type: issueTypeText,
                title: title,
                description: description,
                severity: severityText,
                images: images || [],
                location: location || null,
                reported_at: new Date().toISOString(),
                role: 'MEMBER',
                action_route: `/management/issues?member_id=${member.id}`,
              },
              channels: ['IN_APP', 'PUSH'],
            },
            { timeout: 10000 }
          );

          if (response.data?.success && response.data?.data?.notification) {
            createdNotifications.push(response.data.data.notification);
            console.log(
              `[SUCCESS] Created notification for admin ${admin.user_id} (${admin.email})`
            );
          }
        } catch (error) {
          console.error(
            `[ERROR] Failed to create notification for admin ${admin.user_id}:`,
            error.message
          );
        }
      });

      await Promise.allSettled(notificationPromises);

      // Emit socket events to admin rooms
      if (global.io && createdNotifications.length > 0) {
        createdNotifications.forEach(notification => {
          if (notification && notification.id) {
            const roomName = `user:${notification.user_id}`;
            const socketPayload = {
              notification_id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data,
              created_at: notification.created_at,
              is_read: notification.is_read,
            };

            try {
              // Emit to specific admin room
              global.io.to(roomName).emit('notification:new', socketPayload);
              // Also emit to admin room (for admins subscribed to 'admin' room)
              global.io.to('admin').emit('notification:new', socketPayload);
              // Emit specific event for issue reports
              global.io.to(roomName).emit('issue:report:new', socketPayload);
              global.io.to('admin').emit('issue:report:new', socketPayload);
              console.log(
                `[SOCKET] Emitted issue:report:new to ${roomName} (notification_id: ${notification.id})`
              );
            } catch (emitError) {
              console.error(`[ERROR] Error emitting socket event to ${roomName}:`, emitError);
            }
          }
        });
        console.log(`[SUCCESS] Emitted socket events for ${createdNotifications.length} admin(s)`);
      } else if (!global.io) {
        console.warn('[WARNING] global.io not available - notifications saved to database only');
      }

      res.status(201).json({
        success: true,
        message: 'Issue reported successfully. Admins have been notified.',
        data: {
          member_id: member.id,
          member_name: member.full_name,
          notifications_sent: createdNotifications.length,
          total_admins: admins.length,
        },
      });
    } catch (error) {
      console.error('[ERROR] Report issue error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get notification preferences by user_id
   * GET /members/user/:user_id/preferences
   */
  async getNotificationPreferencesByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const notificationService = require('../services/notification.service');

      // First, get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Get notification preferences using memberId
      const result = await notificationService.getNotificationPreferences(member.id);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to get notification preferences',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: {
          preferences: result.preferences,
        },
      });
    } catch (error) {
      console.error('[ERROR] Get notification preferences by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Update notification preferences by user_id
   * PUT /members/user/:user_id/preferences
   */
  async updateNotificationPreferencesByUserId(req, res) {
    try {
      const { user_id } = req.params;
      const { preferences } = req.body;
      const notificationService = require('../services/notification.service');

      if (!preferences) {
        return res.status(400).json({
          success: false,
          message: 'Notification preferences are required',
          data: null,
        });
      }

      // First, get member by user_id
      const member = await prisma.member.findUnique({
        where: { user_id },
        select: { id: true },
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
          data: null,
        });
      }

      // Update notification preferences using memberId
      const result = await notificationService.updateNotificationPreferences(
        member.id,
        preferences
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to update notification preferences',
          data: null,
        });
      }

      res.json({
        success: true,
        message: result.message || 'Notification preferences updated successfully',
        data: {
          preferences: result.preferences,
        },
      });
    } catch (error) {
      console.error('[ERROR] Update notification preferences by user_id error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new MemberController();
