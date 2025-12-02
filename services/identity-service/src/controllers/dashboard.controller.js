const { prisma } = require('../lib/prisma.js');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const { requireRole } = require('../middleware/role.middleware.js');
const axios = require('axios');

class DashboardController {
  /**
   * Get Super Admin dashboard statistics
   */
  async getSuperAdminStats(req, res) {
    try {
      // Get user counts by role]
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: true,
      });

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentRegistrations = await prisma.user.count({
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Get active sessions (last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeSessions = await prisma.session.count({
        where: {
          last_used_at: {
            gte: twentyFourHoursAgo,
          },
        },
      });

      // Get total users
      const totalUsers = await prisma.user.count();

      // Format stats
      const stats = {
        totalUsers,
        totalAdmins: 0,
        totalTrainers: 0,
        totalMembers: 0,
        recentRegistrations,
        activeSessions,
      };

      // Map role counts
      userStats.forEach(stat => {
        switch (stat.role) {
          case 'SUPER_ADMIN':
            // Don't count super admin in total
            break;
          case 'ADMIN':
            stats.totalAdmins = stat._count;
            break;
          case 'TRAINER':
            stats.totalTrainers = stat._count;
            break;
          case 'MEMBER':
            stats.totalMembers = stat._count;
            break;
        }
      });

      res.json({
        success: true,
        message: 'Super Admin dashboard stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('Get Super Admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get Admin dashboard statistics
   */
  async getAdminStats(req, res) {
    try {
      console.log('[STATS] Getting Admin dashboard stats...');

      // Get trainer count
      const totalTrainers = await prisma.user.count({
        where: {
          role: 'TRAINER',
        },
      });
      console.log(`[SUCCESS] Total trainers: ${totalTrainers}`);

      // Get member count
      const totalMembers = await prisma.user.count({
        where: {
          role: 'MEMBER',
        },
      });
      console.log(`[SUCCESS] Total members: ${totalMembers}`);

      // Get recent member registrations (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentRegistrations = await prisma.user.count({
        where: {
          role: 'MEMBER',
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
      });
      console.log(`[SUCCESS] Recent registrations (30 days): ${recentRegistrations}`);

      // Get active sessions (last 24 hours) - all users, not just members
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeSessions = await prisma.session.count({
        where: {
          last_used_at: {
            gte: twentyFourHoursAgo,
          },
        },
      });
      console.log(`[SUCCESS] Active sessions (24h): ${activeSessions}`);

      // Get equipment count from member service
      let totalEquipment = 0;
      try {
        const axios = require('axios');
        if (!process.env.MEMBER_SERVICE_URL) {
          throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
        }
        const memberServiceUrl = process.env.MEMBER_SERVICE_URL;

        const equipmentResponse = await axios.get(`${memberServiceUrl}/equipment`, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 second timeout
        });

        if (
          equipmentResponse.data &&
          equipmentResponse.data.success &&
          equipmentResponse.data.data
        ) {
          const equipmentList = Array.isArray(equipmentResponse.data.data)
            ? equipmentResponse.data.data
            : equipmentResponse.data.data.equipment || [];
          totalEquipment = equipmentList.length;
          console.log(`[SUCCESS] Total equipment: ${totalEquipment}`);
        }
      } catch (equipmentError) {
        console.warn(
          '[WARNING] Could not fetch equipment count from member service:',
          equipmentError.message
        );
        // Continue with default value of 0
      }

      const stats = {
        totalTrainers,
        totalMembers,
        recentRegistrations,
        activeSessions,
        totalEquipment,
      };

      console.log('[STATS] Admin stats response:', stats);

      res.json({
        success: true,
        message: 'Admin dashboard stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      console.error('[ERROR] Get Admin stats error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get user statistics by role
   */
  async getUserStats(req, res) {
    try {
      const userStats = await prisma.user.groupBy({
        by: ['role'],
        _count: true,
      });

      // Get recent registrations by role (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentStats = await prisma.user.groupBy({
        by: ['role'],
        where: {
          created_at: {
            gte: thirtyDaysAgo,
          },
        },
        _count: true,
      });

      // Format response
      const formattedStats = userStats.map(stat => {
        const recent = recentStats.find(r => r.role === stat.role);
        return {
          role: stat.role,
          count: stat._count,
          recentRegistrations: recent ? recent._count : 0,
        };
      });

      res.json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: formattedStats,
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user growth data over time
   */
  async getUserGrowthData(req, res) {
    try {
      const { from, to } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
      } else {
        // Default to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      // Get all users created in the date range
      const users = await prisma.user.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          created_at: true,
          role: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      // Group by date
      const growthByDate = {};
      users.forEach(user => {
        const dateKey = user.created_at.toISOString().split('T')[0];
        if (!growthByDate[dateKey]) {
          growthByDate[dateKey] = {
            newUsers: 0,
            activeUsers: 0,
          };
        }
        growthByDate[dateKey].newUsers += 1;
      });

      // Get active users (users who logged in within the period)
      const activeUsers = await prisma.session.findMany({
        where: {
          last_used_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          last_used_at: true,
          user_id: true,
        },
        distinct: ['user_id'],
      });

      // Count active users by date
      activeUsers.forEach(session => {
        const dateKey = session.last_used_at.toISOString().split('T')[0];
        if (growthByDate[dateKey]) {
          growthByDate[dateKey].activeUsers += 1;
        }
      });

      // Convert to arrays sorted by date
      const dates = Object.keys(growthByDate).sort();
      const newUsers = dates.map(date => growthByDate[date].newUsers);
      const activeUsersArray = dates.map(date => growthByDate[date].activeUsers || 0);

      res.json({
        success: true,
        message: 'User growth data retrieved successfully',
        data: {
          dates,
          newUsers,
          activeUsers: activeUsersArray,
        },
      });
    } catch (error) {
      console.error('Get user growth data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get user growth by role data over time
   */
  async getUserGrowthByRoleData(req, res) {
    try {
      const { from, to } = req.query;

      let startDate, endDate;
      if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
      } else {
        // Default to last 12 months
        endDate = new Date();
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
      }

      // Get all users created in the date range
      const users = await prisma.user.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          created_at: true,
          role: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      // Group by month and role
      const growthByMonth = {};
      users.forEach(user => {
        const monthKey = `${user.created_at.getFullYear()}-${String(user.created_at.getMonth() + 1).padStart(2, '0')}`;
        if (!growthByMonth[monthKey]) {
          growthByMonth[monthKey] = {
            admins: 0,
            trainers: 0,
            members: 0,
          };
        }
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          growthByMonth[monthKey].admins += 1;
        } else if (user.role === 'TRAINER') {
          growthByMonth[monthKey].trainers += 1;
        } else if (user.role === 'MEMBER') {
          growthByMonth[monthKey].members += 1;
        }
      });

      // Convert to arrays sorted by month
      const months = Object.keys(growthByMonth).sort();
      const monthLabels = months.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
      });
      const admins = months.map(month => growthByMonth[month].admins);
      const trainers = months.map(month => growthByMonth[month].trainers);
      const members = months.map(month => growthByMonth[month].members);

      res.json({
        success: true,
        message: 'User growth by role data retrieved successfully',
        data: {
          months: monthLabels,
          admins,
          trainers,
          members,
        },
      });
    } catch (error) {
      console.error('Get user growth by role data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(req, res) {
    try {
      const { limit = 10 } = req.query;

      // Get recent user registrations
      const recentRegistrations = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          face_photo_url: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: parseInt(limit),
      });

      console.log(
        '👥 Recent registrations from DB:',
        recentRegistrations.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          face_photo_url: u.face_photo_url,
          has_face_photo: !!u.face_photo_url,
        }))
      );

      // Get profile photos from member-service for members and schedule-service for trainers
      if (!process.env.MEMBER_SERVICE_URL) {
        throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
      }
      if (!process.env.SCHEDULE_SERVICE_URL) {
        throw new Error('SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.');
      }
      const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
      const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;
      const profilePhotosMap = {};

      // Separate users by role
      const memberUserIds = recentRegistrations
        .filter(user => user.role === 'MEMBER')
        .map(user => user.id);

      const trainerUserIds = recentRegistrations
        .filter(user => user.role === 'TRAINER')
        .map(user => user.id);

      console.log(`[SEARCH] Fetching profile photos:`, {
        memberUserIds,
        trainerUserIds,
        memberCount: memberUserIds.length,
        trainerCount: trainerUserIds.length,
        memberServiceUrl,
        scheduleServiceUrl,
      });

      // Fetch profile photos from member-service if there are members
      if (memberUserIds.length > 0) {
        try {
          const profilePhotosResponse = await Promise.allSettled(
            memberUserIds.map(async userId => {
              try {
                console.log(`[SEARCH] Fetching member profile photo for user: ${userId}`);
                const response = await axios.get(`${memberServiceUrl}/members/user/${userId}`, {
                  timeout: 2000,
                });
                console.log(`[DATA] Member service response for ${userId}:`, {
                  success: response.data.success,
                  hasData: !!response.data.data,
                  hasMember: !!response.data.data?.member,
                  profile_photo: response.data.data?.member?.profile_photo,
                  fullResponse: response.data,
                });
                if (response.data.success && response.data.data?.member?.profile_photo) {
                  return { userId, profilePhoto: response.data.data.member.profile_photo };
                }
              } catch (error) {
                // Log all errors for debugging, but only warn for non-expected cases
                const errorType =
                  error.response?.status === 404
                    ? '404_NOT_FOUND'
                    : error.code === 'ECONNREFUSED'
                    ? 'ECONNREFUSED'
                    : error.code === 'ETIMEDOUT'
                    ? 'ETIMEDOUT'
                    : 'OTHER_ERROR';

                console.log(`[WARNING] Member profile photo fetch error for ${userId}:`, {
                  errorType,
                  status: error.response?.status,
                  code: error.code,
                  message: error.message,
                  url: `${memberServiceUrl}/members/user/${userId}`,
                });

                // Silently fail for common cases:
                // - 404: member doesn't exist yet (normal for new users)
                // - ECONNREFUSED: member-service not available
                // - ETIMEDOUT: timeout (expected for some cases)
                const shouldLog =
                  error.response?.status &&
                  error.response.status !== 404 &&
                  error.code !== 'ECONNREFUSED' &&
                  error.code !== 'ETIMEDOUT';

                if (shouldLog) {
                  console.warn(`Failed to fetch profile photo for user ${userId}:`, error.message);
                }
              }
              return null;
            })
          );

          profilePhotosResponse.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              profilePhotosMap[result.value.userId] = result.value.profilePhoto;
              console.log(
                `[SUCCESS] Member profile photo fetched: ${result.value.userId} -> ${result.value.profilePhoto}`
              );
            } else if (result.status === 'rejected') {
              console.warn(
                `[ERROR] Member profile photo fetch rejected for ${memberUserIds[index]}:`,
                result.reason?.message || result.reason
              );
            } else if (result.status === 'fulfilled' && !result.value) {
              console.warn(
                `[WARNING] Member profile photo fetch returned null for ${memberUserIds[index]}`
              );
            }
          });

          console.log(`[STATS] Member profile photos map after fetch:`, profilePhotosMap);
          console.log(`[STATS] Member profile photos map keys:`, Object.keys(profilePhotosMap));
          console.log(`[STATS] Member profile photos map size:`, Object.keys(profilePhotosMap).length);
        } catch (error) {
          console.warn('Failed to fetch profile photos from member-service:', error.message);
        }
      }

      // Fetch profile photos from schedule-service if there are trainers
      if (trainerUserIds.length > 0) {
        try {
          const trainerPhotosResponse = await Promise.allSettled(
            trainerUserIds.map(async userId => {
              try {
                console.log(`[SEARCH] Fetching trainer profile photo for user: ${userId}`);
                const response = await axios.get(`${scheduleServiceUrl}/trainers/user/${userId}`, {
                  timeout: 2000,
                });
                console.log(`[DATA] Schedule service response for ${userId}:`, {
                  success: response.data.success,
                  hasData: !!response.data.data,
                  hasTrainer: !!response.data.data?.trainer,
                  profile_photo: response.data.data?.trainer?.profile_photo,
                  fullResponse: response.data,
                });
                if (response.data.success && response.data.data?.trainer?.profile_photo) {
                  return { userId, profilePhoto: response.data.data.trainer.profile_photo };
                }
              } catch (error) {
                // Log all errors for debugging, but only warn for non-expected cases
                const errorType =
                  error.response?.status === 404
                    ? '404_NOT_FOUND'
                    : error.code === 'ECONNREFUSED'
                    ? 'ECONNREFUSED'
                    : error.code === 'ETIMEDOUT'
                    ? 'ETIMEDOUT'
                    : 'OTHER_ERROR';

                console.log(`[WARNING] Trainer profile photo fetch error for ${userId}:`, {
                  errorType,
                  status: error.response?.status,
                  code: error.code,
                  message: error.message,
                  url: `${scheduleServiceUrl}/trainers/user/${userId}`,
                });

                // Silently fail for common cases
                const shouldLog =
                  error.response?.status &&
                  error.response.status !== 404 &&
                  error.code !== 'ECONNREFUSED' &&
                  error.code !== 'ETIMEDOUT';

                if (shouldLog) {
                  console.warn(
                    `Failed to fetch profile photo for trainer ${userId}:`,
                    error.message
                  );
                }
              }
              return null;
            })
          );

          trainerPhotosResponse.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              profilePhotosMap[result.value.userId] = result.value.profilePhoto;
              console.log(
                `[SUCCESS] Trainer profile photo fetched: ${result.value.userId} -> ${result.value.profilePhoto}`
              );
            }
          });

          console.log(`[STATS] Trainer profile photos map:`, profilePhotosMap);
        } catch (error) {
          console.warn('Failed to fetch profile photos from schedule-service:', error.message);
        }
      }

      // Format registration activities
      console.log(`[SYNC] Formatting ${recentRegistrations.length} registration activities...`);
      console.log(
        `[STATS] Profile photos map before formatting:`,
        JSON.stringify(profilePhotosMap, null, 2)
      );
      console.log(`[STATS] Profile photos map keys:`, Object.keys(profilePhotosMap));

      const registrationActivities = recentRegistrations.map(user => {
        // Avatar logic based on role:
        // - ADMIN and SUPER_ADMIN: use face_photo_url from user table
        // - TRAINER: use profile_photo from schedule-service
        // - MEMBER: use profile_photo from member-service
        let avatar = null;

        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          // For admin and super admin: use face_photo_url from user table
          avatar = user.face_photo_url || null;
          console.log(`[SEARCH] Admin/SuperAdmin avatar for ${user.email} (${user.id}):`, {
            role: user.role,
            face_photo_url: user.face_photo_url,
            final_avatar: avatar,
          });
        } else if (user.role === 'TRAINER' || user.role === 'MEMBER') {
          // For trainer and member: use profile_photo from their respective services
          const profilePhotoFromService = profilePhotosMap[user.id];
          avatar = profilePhotoFromService || null;
          console.log(`[SEARCH] Trainer/Member avatar for ${user.role} ${user.email} (${user.id}):`, {
            hasInMap: profilePhotosMap.hasOwnProperty(user.id),
            mapValue: profilePhotoFromService,
            final_avatar: avatar,
          });
        } else {
          // Fallback for other roles: use face_photo_url
          avatar = user.face_photo_url || null;
          console.log(`[SEARCH] Fallback avatar for ${user.role} ${user.email} (${user.id}):`, {
            face_photo_url: user.face_photo_url,
            final_avatar: avatar,
          });
        }

        // Debug logging
        console.log(`📸 Final avatar for ${user.role} ${user.email}:`, {
          userId: user.id,
          role: user.role,
          face_photo_url: user.face_photo_url,
          profile_photo_from_service: profilePhotosMap[user.id] || null,
          final_avatar: avatar,
        });

        const activity = {
          id: `reg_${user.id}`,
          type: 'REGISTRATION',
          user: {
            name:
              `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown',
            role: user.role,
            avatar: avatar,
          },
          timestamp: user.created_at.toISOString(),
          description: `New ${user.role.toLowerCase()} registered: ${user.email || 'N/A'}`,
        };

        // Verify avatar is set
        if (!activity.user.avatar) {
          console.warn(`[WARNING] Avatar is null for ${user.role} ${user.email}:`, {
            userId: user.id,
            role: user.role,
            face_photo_url: user.face_photo_url,
            profilePhotosMap_has_key: profilePhotosMap.hasOwnProperty(user.id),
            profilePhotosMap_value: profilePhotosMap[user.id],
          });
        }

        return activity;
      });

      // Try to get recent login activities, but don't fail if AccessLog table is empty or has issues
      let loginActivities = [];
      try {
        const recentLogins = await prisma.accessLog.findMany({
          where: {
            access_type: 'LOGIN',
            success: true,
          },
          select: {
            id: true,
            user_id: true,
            timestamp: true,
            device_id: true,
            location: true,
            access_method: true,
            user: {
              select: {
                first_name: true,
                last_name: true,
                role: true,
                email: true,
                face_photo_url: true,
              },
            },
          },
          orderBy: {
            timestamp: 'desc',
          },
          take: parseInt(limit),
        });

        // Get profile photos for member and trainer logins
        const loginMemberUserIds = recentLogins
          .filter(login => login.user && login.user.role === 'MEMBER')
          .map(login => login.user_id);

        const loginTrainerUserIds = recentLogins
          .filter(login => login.user && login.user.role === 'TRAINER')
          .map(login => login.user_id);

        const loginProfilePhotosMap = {};

        // Fetch member profile photos
        if (loginMemberUserIds.length > 0) {
          try {
            if (!process.env.MEMBER_SERVICE_URL) {
              throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
            }
            const memberServiceUrl = process.env.MEMBER_SERVICE_URL;
            const loginProfilePhotosResponse = await Promise.allSettled(
              loginMemberUserIds.map(async userId => {
                try {
                  const response = await axios.get(`${memberServiceUrl}/members/user/${userId}`, {
                    timeout: 2000,
                  });
                  if (response.data.success && response.data.data?.member?.profile_photo) {
                    return { userId, profilePhoto: response.data.data.member.profile_photo };
                  }
                } catch (error) {
                  // Silently fail for common cases:
                  // - 404: member doesn't exist yet (normal for new users)
                  // - ECONNREFUSED: member-service not available
                  // - ETIMEDOUT: timeout (expected for some cases)
                  const shouldLog =
                    error.response?.status &&
                    error.response.status !== 404 &&
                    error.code !== 'ECONNREFUSED' &&
                    error.code !== 'ETIMEDOUT';

                  if (shouldLog) {
                    console.warn(
                      `Failed to fetch profile photo for login user ${userId}:`,
                      error.message
                    );
                  }
                }
                return null;
              })
            );

            loginProfilePhotosResponse.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                loginProfilePhotosMap[result.value.userId] = result.value.profilePhoto;
                console.log(
                  `[SUCCESS] Login member profile photo fetched: ${result.value.userId} -> ${result.value.profilePhoto}`
                );
              }
            });

            console.log(`[STATS] Login member profile photos map:`, loginProfilePhotosMap);
          } catch (error) {
            console.warn(
              'Failed to fetch profile photos for logins from member-service:',
              error.message
            );
          }
        }

        // Fetch trainer profile photos
        if (loginTrainerUserIds.length > 0) {
          try {
            if (!process.env.SCHEDULE_SERVICE_URL) {
              throw new Error('SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.');
            }
            const scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL;
            const loginTrainerPhotosResponse = await Promise.allSettled(
              loginTrainerUserIds.map(async userId => {
                try {
                  const response = await axios.get(
                    `${scheduleServiceUrl}/trainers/user/${userId}`,
                    {
                      timeout: 2000,
                    }
                  );
                  if (response.data.success && response.data.data?.trainer?.profile_photo) {
                    return { userId, profilePhoto: response.data.data.trainer.profile_photo };
                  }
                } catch (error) {
                  // Silently fail for common cases
                  const shouldLog =
                    error.response?.status &&
                    error.response.status !== 404 &&
                    error.code !== 'ECONNREFUSED' &&
                    error.code !== 'ETIMEDOUT';

                  if (shouldLog) {
                    console.warn(
                      `Failed to fetch profile photo for login trainer ${userId}:`,
                      error.message
                    );
                  }
                }
                return null;
              })
            );

            loginTrainerPhotosResponse.forEach(result => {
              if (result.status === 'fulfilled' && result.value) {
                loginProfilePhotosMap[result.value.userId] = result.value.profilePhoto;
                console.log(
                  `[SUCCESS] Login trainer profile photo fetched: ${result.value.userId} -> ${result.value.profilePhoto}`
                );
              }
            });

            console.log(`[STATS] Login trainer profile photos map:`, loginProfilePhotosMap);
          } catch (error) {
            console.warn(
              'Failed to fetch profile photos for logins from schedule-service:',
              error.message
            );
          }
        }

        loginActivities = recentLogins
          .filter(login => login.user) // Filter out any logins without user relation
          .map(login => {
            // Avatar logic based on role:
            // - ADMIN and SUPER_ADMIN: use face_photo_url from user table
            // - TRAINER: use profile_photo from schedule-service
            // - MEMBER: use profile_photo from member-service
            let avatar = null;

            if (login.user.role === 'ADMIN' || login.user.role === 'SUPER_ADMIN') {
              // For admin and super admin: use face_photo_url from user table
              avatar = login.user.face_photo_url || null;
              console.log(
                `[SEARCH] Admin/SuperAdmin login avatar for ${login.user.email} (${login.user_id}):`,
                {
                  role: login.user.role,
                  face_photo_url: login.user.face_photo_url,
                  final_avatar: avatar,
                }
              );
            } else if (login.user.role === 'TRAINER' || login.user.role === 'MEMBER') {
              // For trainer and member: use profile_photo from their respective services
              avatar = loginProfilePhotosMap[login.user_id] || null;
              console.log(
                `[SEARCH] Trainer/Member login avatar for ${login.user.role} ${login.user.email} (${login.user_id}):`,
                {
                  hasInMap: loginProfilePhotosMap.hasOwnProperty(login.user_id),
                  mapValue: loginProfilePhotosMap[login.user_id],
                  final_avatar: avatar,
                }
              );
            } else {
              // Fallback for other roles: use face_photo_url
              avatar = login.user.face_photo_url || null;
              console.log(
                `[SEARCH] Fallback login avatar for ${login.user.role} ${login.user.email} (${login.user_id}):`,
                {
                  face_photo_url: login.user.face_photo_url,
                  final_avatar: avatar,
                }
              );
            }

            // Debug logging
            console.log(`📸 Final avatar for login ${login.user.role} ${login.user.email}:`, {
              userId: login.user_id,
              role: login.user.role,
              face_photo_url: login.user.face_photo_url,
              profile_photo_from_service: loginProfilePhotosMap[login.user_id] || null,
              final_avatar: avatar,
            });

            return {
              id: `login_${login.id}`,
              type: 'LOGIN',
              user: {
                name:
                  `${login.user.first_name || ''} ${login.user.last_name || ''}`.trim() ||
                  login.user.email ||
                  'Unknown',
                role: login.user.role,
                avatar: avatar,
              },
              timestamp: login.timestamp.toISOString(),
              description: `Logged in using ${login.access_method || 'password'}${
                login.location ? ` at ${login.location}` : ''
              }`,
            };
          });
      } catch (loginError) {
        console.warn('Could not fetch login activities:', loginError.message);
        // Continue without login activities
      }

      // Combine and sort activities
      const activities = [...registrationActivities, ...loginActivities];
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const limitedActivities = activities.slice(0, parseInt(limit));

      // Debug: Log final response
      console.log(
        '📤 Final activities response:',
        JSON.stringify(
          limitedActivities.map(a => ({
            id: a.id,
            type: a.type,
            user: {
              name: a.user.name,
              role: a.user.role,
              avatar: a.user.avatar,
            },
          })),
          null,
          2
        )
      );

      res.json({
        success: true,
        message: 'Recent activities retrieved successfully',
        data: limitedActivities,
      });
    } catch (error) {
      console.error('Get recent activities error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get system activity data for charts
   * Returns daily activity counts from access logs
   */
  async getSystemActivityData(req, res) {
    let daysCount = 30;
    let startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      const { period = '30d' } = req.query;

      switch (period) {
        case '7d':
          daysCount = 7;
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          daysCount = 30;
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          daysCount = 90;
          startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          daysCount = 30;
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      console.log(`[STATS] Fetching system activity data for period: ${period}, daysCount: ${daysCount}, startDate: ${startDate.toISOString()}`);

      // First, check total count of access logs (for debugging)
      const totalCount = await prisma.accessLog.count();
      const recentCount = await prisma.accessLog.count({
        where: {
          timestamp: {
            gte: startDate,
          },
        },
      });
      const successCount = await prisma.accessLog.count({
        where: {
          timestamp: {
            gte: startDate,
          },
          success: true,
        },
      });

      console.log(`[STATS] Access logs stats:`, {
        total: totalCount,
        recent: recentCount,
        recentSuccess: successCount,
      });

      // Get sample of recent logs to debug
      const sampleLogs = await prisma.accessLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
          },
        },
        select: {
          timestamp: true,
          success: true,
          access_type: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 5,
      });
      console.log(`[STATS] Sample recent logs:`, sampleLogs);

      // Get all access logs grouped by date (include both success and failed for now)
      const accessLogs = await prisma.accessLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
          },
          success: true, // Only count successful accesses
        },
        select: {
          timestamp: true,
          success: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      console.log(`[STATS] Found ${accessLogs.length} successful access logs`);

      // Group by date (using UTC date string to match database timezone)
      const activityByDate = {};
      accessLogs.forEach(log => {
        // Use UTC date string to group by day (matching database timezone)
        const date = new Date(log.timestamp);
        // Use UTC methods to avoid timezone issues
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        if (!activityByDate[dateKey]) {
          activityByDate[dateKey] = 0;
        }
        activityByDate[dateKey] += 1;
      });

      console.log(`[STATS] Activity by date (UTC):`, activityByDate);
      console.log(`[STATS] Total unique dates: ${Object.keys(activityByDate).length}`);

      // Generate all dates in the period (to ensure continuity)
      // Use UTC to match database timezone
      const allDates = [];
      const allActivities = [];
      const today = new Date();
      
      console.log(`[STATS] Generating dates for ${daysCount} days, starting from today: ${today.toISOString()}`);
      console.log(`[STATS] daysCount value: ${daysCount}, type: ${typeof daysCount}`);
      
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() - i);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        allDates.push(dateKey);
        allActivities.push(activityByDate[dateKey] || 0);
      }
      
      console.log(`[STATS] Generated ${allDates.length} dates, first: ${allDates[0]}, last: ${allDates[allDates.length - 1]}`);
      console.log(`[STATS] All dates array length: ${allDates.length}, first 5:`, allDates.slice(0, 5));
      console.log(`[STATS] All activities array length: ${allActivities.length}, first 5:`, allActivities.slice(0, 5));

      // Format dates for display (short format)
      const formattedDates = allDates.map(dateKey => {
        const [year, month, day] = dateKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
      });

      const response = {
        success: true,
        message: 'System activity data retrieved successfully',
        data: {
          dates: formattedDates,
          activities: allActivities,
          rawDates: allDates, // Keep original dates for reference
        },
      };

      console.log(`[STATS] Response data:`, {
        datesCount: formattedDates.length,
        activitiesCount: allActivities.length,
        totalActivities: allActivities.reduce((sum, val) => sum + val, 0),
      });

      res.json(response);
    } catch (error) {
      console.error('Get system activity data error:', error);
      console.error('Error stack:', error.stack);
      
      // Even on error, return default empty data structure
      const allDates = [];
      const allActivities = [];
      const today = new Date();
      
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setUTCDate(date.getUTCDate() - i);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        allDates.push(dateKey);
        allActivities.push(0);
      }
      
      const formattedDates = allDates.map(dateKey => {
        const [year, month, day] = dateKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: {
          dates: formattedDates,
          activities: allActivities,
          rawDates: allDates,
        },
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /**
   * Get all trainers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTrainers(req, res) {
    try {
      const trainers = await prisma.user.findMany({
        where: {
          role: 'TRAINER',
          is_active: true,
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          email_verified: true,
          phone_verified: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Trainers retrieved successfully',
        data: {
          users: trainers,
        },
      });
    } catch (error) {
      console.error('Get trainers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { DashboardController };
