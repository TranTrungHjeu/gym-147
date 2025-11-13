const axios = require('axios');

class MemberService {
  constructor() {
    if (!process.env.MEMBER_SERVICE_URL) {
      throw new Error('MEMBER_SERVICE_URL environment variable is required. Please set it in your .env file.');
    }
    this.baseURL = process.env.MEMBER_SERVICE_URL;
    console.log('🔧 MemberService initialized with baseURL:', this.baseURL);
  }

  async updateMember(userId, userData) {
    try {
      const memberData = {
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone || null, // Ensure null if undefined/empty
        email: userData.email || '', // Ensure string, not undefined
      };

      console.log('🔄 Calling member-service to update member:', {
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

      console.log('✅ Member service update successful:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Member service update error:', {
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

  async deleteMember(userId) {
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
      console.error('Member service delete error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new MemberService();

