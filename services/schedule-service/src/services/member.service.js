const { MEMBER_SERVICE_URL } = require('../config/serviceUrls.js');
const { createHttpClient } = require('./http-client.js');

class MemberService {
  constructor() {
    this.client = createHttpClient(MEMBER_SERVICE_URL, {
      timeout: 7000,
    });
  }

  async getMemberById(memberId) {
    if (!memberId) {
      return null;
    }

    try {
      const response = await this.client.get(`/members/${memberId}`);
      return response.data?.data?.member || response.data?.data || response.data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }

      console.error('member-service:getMemberById error:', {
        memberId,
        message: error.message,
        status: error.status,
      });

      throw new Error('Failed to fetch member information');
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
