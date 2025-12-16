const axios = require('axios');

class MemberService {
  constructor() {
    if (!process.env.MEMBER_SERVICE_URL) {
      throw new Error(
        'MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.'
      );
    }
    this.baseURL = process.env.MEMBER_SERVICE_URL;
    console.log('[INIT] MemberService initialized with baseURL:', this.baseURL);
  }

  async updateMember(userId, userData) {
    try {
      const memberData = {
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone || null, // Ensure null if undefined/empty
        email: userData.email || '', // Ensure string, not undefined
      };

      console.log('[CALL] Calling member-service to update member:', {
        url: `${this.baseURL}/members/user/${userId}`,
        data: memberData,
        originalPhone: userData.phone,
        originalEmail: userData.email,
      });

      const response = await axios.put(`${this.baseURL}/members/user/${userId}`, memberData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      console.log('[SUCCESS] Member service update successful:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[ERROR] Member service update error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // TC-USER-001: Delete member with retry mechanism (prevent partial deletion)
  async getMemberByUserId(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/members/user/${userId}`, {
        timeout: 5000,
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Member not found',
        };
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Member not found',
        };
      }
      console.error('Member service getMemberByUserId error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // TC-USER-001: Delete member with retry mechanism (prevent partial deletion)
  async deleteMember(userId) {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // First, get member by user_id to get the member id
        const getResponse = await axios.get(`${this.baseURL}/members/user/${userId}`, {
          timeout: 5000,
        });

        if (getResponse.data.success && getResponse.data.data?.member?.id) {
          const memberId = getResponse.data.data.member.id;
          const response = await axios.delete(`${this.baseURL}/members/${memberId}`, {
            timeout: 5000,
          });

          return {
            success: true,
            data: response.data,
          };
        } else {
          // Member not found, consider it already deleted
          return {
            success: true,
            data: null,
          };
        }
      } catch (error) {
        // If 404, member doesn't exist, consider it already deleted
        if (error.response?.status === 404) {
          return {
            success: true,
            data: null,
          };
        }

        retryCount++;
        console.error(
          `[ERROR] Member service delete error (attempt ${retryCount}/${maxRetries}):`,
          error.message
        );

        if (retryCount >= maxRetries) {
          // TC-USER-001: After all retries failed, return error
          return {
            success: false,
            error: `Failed to delete member after ${maxRetries} attempts: ${error.message}`,
            retryable: true, // Indicate this can be retried later
          };
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  // Notification methods
  // Note: Notifications are stored in schedule service, not member service
  // This method calls schedule service to get notifications by user_id
  async getNotifications(userId, query = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = query;
      // Notifications are stored in schedule service with user_id
      // Call schedule service instead of member service
      const scheduleService = require('./schedule.service');
      const params = { page, limit };
      if (unreadOnly) {
        params.unreadOnly = 'true';
      }
      const response = await axios.get(`${scheduleService.baseURL}/notifications/${userId}`, {
        params,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error.message);
      throw error;
    }
  }

  async markNotificationRead(userId, notificationId) {
    try {
      // Notifications are stored in schedule service with user_id
      // Call schedule service instead of member service
      const scheduleService = require('./schedule.service');
      const response = await axios.put(
        `${scheduleService.baseURL}/notifications/${notificationId}/read`,
        {},
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Mark notification read error:', error.message);
      throw error;
    }
  }

  async markAllNotificationsRead(userId) {
    try {
      // Notifications are stored in schedule service with user_id
      // Call schedule service instead of member service
      const scheduleService = require('./schedule.service');
      const response = await axios.put(
        `${scheduleService.baseURL}/notifications/read-all/${userId}`,
        {},
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Mark all notifications read error:', error.message);
      throw error;
    }
  }

  async deleteNotification(userId, notificationId) {
    try {
      // Notifications are stored in schedule service with user_id
      // Call schedule service instead of member service
      const scheduleService = require('./schedule.service');
      const response = await axios.delete(
        `${scheduleService.baseURL}/notifications/${notificationId}`,
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Delete notification error:', error.message);
      throw error;
    }
  }

  async getNotificationPreferences(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/members/user/${userId}/preferences`, {
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      // If member not found (404), return default preferences instead of throwing
      if (error.response?.status === 404) {
        console.log(
          `[INFO] Member not found for userId ${userId}, returning default notification preferences`
        );
        return {
          success: true,
          message: 'Notification preferences retrieved successfully (default)',
          data: {
            preferences: {
              push: true,
              email: true,
              sms: false,
              in_app: true,
            },
          },
        };
      }
      console.error('Get notification preferences error:', error.message);
      throw error;
    }
  }

  async updateNotificationPreferences(userId, preferences) {
    try {
      const response = await axios.put(
        `${this.baseURL}/members/user/${userId}/preferences`,
        {
          preferences,
        },
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Update notification preferences error:', error.message);
      throw error;
    }
  }

  async getUnreadNotificationCount(userId) {
    try {
      // Notifications are stored in schedule service with user_id
      // Call schedule service instead of member service
      const scheduleService = require('./schedule.service');
      const response = await axios.get(
        `${scheduleService.baseURL}/notifications/unread-count/${userId}`,
        {
          timeout: 5000,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Get unread notification count error:', error.message);
      throw error;
    }
  }
}

module.exports = new MemberService();
