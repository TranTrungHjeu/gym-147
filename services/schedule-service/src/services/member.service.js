const { MEMBER_SERVICE_URL } = require('../config/serviceUrls.js');
const { createHttpClient } = require('./http-client.js');

class MemberService {
  constructor() {
    const serviceUrl = MEMBER_SERVICE_URL || 'http://member:3002';
    console.log('🔗 MemberService initialized:', {
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
      console.warn('⚠️ getMemberById called with null/undefined memberId');
      return null;
    }

    const serviceUrl = this.client.defaults?.baseURL || MEMBER_SERVICE_URL;
    console.log(`🔍 Fetching member ${memberId} from: ${serviceUrl}`, {
      'client.baseURL': this.client.defaults?.baseURL,
      'MEMBER_SERVICE_URL': MEMBER_SERVICE_URL,
      'DOCKER_ENV': process.env.DOCKER_ENV,
    });

    try {
      // Get member by member_id (id) - used by bookings and attendance
      const response = await this.client.get(`/members/${memberId}`);
      const memberData = response.data?.data?.member || response.data?.data || response.data;
      
      console.log(`✅ Successfully fetched member ${memberId}`, {
        hasProfileEmbedding: !!memberData?.profile_embedding,
        profileEmbeddingType: memberData?.profile_embedding ? typeof memberData.profile_embedding : 'none',
        profileEmbeddingLength: memberData?.profile_embedding?.length || 0,
        memberKeys: memberData ? Object.keys(memberData).slice(0, 10) : [],
      });
      
      return memberData;
    } catch (error) {
      if (error.status === 404) {
        console.warn(`⚠️ Member ${memberId} not found (404)`);
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
        console.error('❌ Connection refused to member-service:', errorDetails);
        console.error('   → Check if member-service is running');
        console.error('   → Check MEMBER_SERVICE_URL:', serviceUrl);
      } else if (error.code === 'ETIMEDOUT') {
        console.error('❌ Timeout connecting to member-service:', errorDetails);
      } else if (error.response) {
        console.error('❌ Member-service HTTP error:', {
          ...errorDetails,
          responseStatus: error.response.status,
          responseData: error.response.data,
        });
      } else {
        console.error('❌ Member-service error:', errorDetails);
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
}

module.exports = new MemberService();
