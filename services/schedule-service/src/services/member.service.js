const { MEMBER_SERVICE_URL } = require('../config/serviceUrls.js');
const { createHttpClient } = require('./http-client.js');

class MemberService {
  constructor() {
    const serviceUrl = MEMBER_SERVICE_URL || 'http://member:3002';
    console.log('[LINK] MemberService initialized:', {
      url: serviceUrl,
      DOCKER_ENV: process.env.DOCKER_ENV,
      MEMBER_SERVICE_URL: process.env.MEMBER_SERVICE_URL,
    });
    this.client = createHttpClient(serviceUrl, {
      timeout: 7000,
    });
  }

  async getMemberById(memberId) {
    if (!memberId) {
      console.warn('[WARNING] getMemberById called with null/undefined memberId');
      return null;
    }

    const serviceUrl = this.client.defaults?.baseURL || MEMBER_SERVICE_URL;
    console.log(`[SEARCH] Fetching member ${memberId} from: ${serviceUrl}`, {
      'client.baseURL': this.client.defaults?.baseURL,
      'MEMBER_SERVICE_URL': MEMBER_SERVICE_URL,
      'DOCKER_ENV': process.env.DOCKER_ENV,
    });

    try {
      // Get member by member_id (id) - used by bookings and attendance
      const response = await this.client.get(`/members/${memberId}`);
      const memberData = response.data?.data?.member || response.data?.data || response.data;
      
      console.log(`[SUCCESS] Successfully fetched member ${memberId}`, {
        hasProfileEmbedding: !!memberData?.profile_embedding,
        profileEmbeddingType: memberData?.profile_embedding ? typeof memberData.profile_embedding : 'none',
        profileEmbeddingLength: memberData?.profile_embedding?.length || 0,
        memberKeys: memberData ? Object.keys(memberData).slice(0, 10) : [],
      });
      
      return memberData;
    } catch (error) {
      if (error.status === 404) {
        console.warn(`[WARNING] Member ${memberId} not found (404)`);
        return null;
      }

      // Log detailed error information
      const errorDetails = {
        memberId,
        message: error.message,
        status: error.status,
        code: error.code,
        url: serviceUrl,
        endpoint: `/members/${memberId}`,
        fullUrl: `${serviceUrl}/members/${memberId}`,
      };

      // Check connection errors
      if (error.code === 'ECONNREFUSED') {
        console.error('[ERROR] Connection refused to member-service:', errorDetails);
        console.error('   → Check if member-service is running');
        console.error('   → Check MEMBER_SERVICE_URL:', serviceUrl);
      } else if (error.code === 'ETIMEDOUT') {
        console.error('[ERROR] Timeout connecting to member-service:', errorDetails);
      } else if (error.response) {
        console.error('[ERROR] Member-service HTTP error:', {
          ...errorDetails,
          responseStatus: error.response.status,
          responseData: error.response.data,
        });
      } else {
        console.error('[ERROR] Member-service error:', errorDetails);
        console.error('   Error stack:', error.stack);
      }

      throw new Error(`Failed to fetch member information: ${error.message}`);
    }
  }

  async getMembersByIds(memberIds = []) {
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return [];
    }

    try {
      const response = await this.client.post('/members/batch', {
        memberIds: memberIds,
      });

      return response.data?.data?.members || response.data?.data || [];
    } catch (error) {
      if (error.status === 404) {
        return [];
      }

      console.error('member-service:getMembersByIds error:', {
        memberIds,
        message: error.message,
        status: error.status,
      });

      throw new Error('Failed to fetch member list');
    }
  }

  /**
   * Award points to member
   * @param {string} memberId - Member ID
   * @param {number} points - Points to award
   * @param {string} source - Source type (e.g., 'ATTENDANCE', 'PAYMENT')
   * @param {string} sourceId - Source ID (optional)
   * @param {string} description - Description (optional)
   * @returns {Promise<Object>} Result with success status
   */
  async awardPoints(memberId, points, source, sourceId = null, description = null) {
    if (!memberId || !points || !source) {
      console.warn('[WARNING] awardPoints called with invalid parameters:', {
        memberId,
        points,
        source,
      });
      return { success: false, error: 'Invalid parameters' };
    }

    try {
      const response = await this.client.post(`/members/${memberId}/points/award`, {
        points,
        source,
        source_id: sourceId,
        description,
      });

      if (response.data?.success) {
        console.log(`[SUCCESS] Awarded ${points} points to member ${memberId} from ${source}`);
        return {
          success: true,
          transaction: response.data.data?.transaction,
          newBalance: response.data.data?.new_balance,
        };
      }

      return {
        success: false,
        error: response.data?.message || 'Failed to award points',
      };
    } catch (error) {
      console.error('[ERROR] Failed to award points via member-service:', {
        memberId,
        points,
        source,
        message: error.message,
        status: error.status,
      });

      // Don't throw error, just return failure so attendance/payment can continue
      return {
        success: false,
        error: error.message || 'Member service unavailable',
      };
    }
  }
}

module.exports = new MemberService();
