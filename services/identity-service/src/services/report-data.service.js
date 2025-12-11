const axios = require('axios');

/**
 * Report Data Service
 * Fetches data from other services for report generation
 */
class ReportDataService {
  constructor() {
    this.memberServiceUrl = process.env.MEMBER_SERVICE_URL || 'http://member:3002';
    this.scheduleServiceUrl = process.env.SCHEDULE_SERVICE_URL || 'http://schedule:3003';
    this.billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing:3004';
  }

  /**
   * Fetch members data
   * @param {Object} filters - Filters for the report
   * @returns {Promise<Array>} Members data
   */
  async fetchMembersData(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 1000,
        status: filters.status,
        membership_type: filters.membership_type,
      };

      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get(`${this.memberServiceUrl}/members`, { params });
      return response.data?.data?.members || response.data?.data || [];
    } catch (error) {
      console.error('[ERROR] Failed to fetch members data:', error.message);
      throw new Error(`Failed to fetch members data: ${error.message}`);
    }
  }

  /**
   * Fetch revenue data
   * @param {Object} filters - Filters for the report (startDate, endDate)
   * @returns {Promise<Object>} Revenue data
   */
  async fetchRevenueData(filters = {}) {
    try {
      const params = {};

      if (filters.startDate) {
        params.start_date = filters.startDate;
      }
      if (filters.endDate) {
        params.end_date = filters.endDate;
      }

      const response = await axios.get(`${this.billingServiceUrl}/analytics/revenue`, { params });
      return response.data?.data || {};
    } catch (error) {
      console.error('[ERROR] Failed to fetch revenue data:', error.message);
      throw new Error(`Failed to fetch revenue data: ${error.message}`);
    }
  }

  /**
   * Fetch classes data
   * @param {Object} filters - Filters for the report
   * @returns {Promise<Array>} Classes data
   */
  async fetchClassesData(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 1000,
        category: filters.category,
        difficulty: filters.difficulty,
        is_active: filters.is_active !== undefined ? filters.is_active : true,
      };

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get(`${this.scheduleServiceUrl}/classes`, { params });
      return response.data?.data?.classes || response.data?.data || [];
    } catch (error) {
      console.error('[ERROR] Failed to fetch classes data:', error.message);
      throw new Error(`Failed to fetch classes data: ${error.message}`);
    }
  }

  /**
   * Fetch schedules data
   * @param {Object} filters - Filters for the report (startDate, endDate, status)
   * @returns {Promise<Array>} Schedules data
   */
  async fetchSchedulesData(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 1000,
        status: filters.status,
      };

      if (filters.startDate) {
        params.start_date = filters.startDate;
      }
      if (filters.endDate) {
        params.end_date = filters.endDate;
      }

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get(`${this.scheduleServiceUrl}/schedules`, { params });
      return response.data?.data?.schedules || response.data?.data || [];
    } catch (error) {
      console.error('[ERROR] Failed to fetch schedules data:', error.message);
      throw new Error(`Failed to fetch schedules data: ${error.message}`);
    }
  }

  /**
   * Fetch equipment data
   * @param {Object} filters - Filters for the report
   * @returns {Promise<Array>} Equipment data
   */
  async fetchEquipmentData(filters = {}) {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 1000,
        category: filters.category,
        status: filters.status,
      };

      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get(`${this.memberServiceUrl}/equipment`, { params });
      return response.data?.data?.equipment || response.data?.data || [];
    } catch (error) {
      console.error('[ERROR] Failed to fetch equipment data:', error.message);
      throw new Error(`Failed to fetch equipment data: ${error.message}`);
    }
  }

  /**
   * Fetch system data (users, sessions, etc.)
   * @param {Object} filters - Filters for the report
   * @returns {Promise<Object>} System data
   */
  async fetchSystemData(filters = {}) {
    try {
      const { prisma } = require('../lib/prisma.js');

      const [userCount, activeUsers, sessions] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { is_active: true } }),
        prisma.session.count({
          where:
            filters.startDate || filters.endDate
              ? {
                  created_at: {
                    ...(filters.startDate && { gte: new Date(filters.startDate) }),
                    ...(filters.endDate && { lte: new Date(filters.endDate) }),
                  },
                }
              : {},
        }),
      ]);

      return {
        total_users: userCount,
        active_users: activeUsers,
        total_sessions: sessions,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[ERROR] Failed to fetch system data:', error.message);
      throw new Error(`Failed to fetch system data: ${error.message}`);
    }
  }

  /**
   * Fetch data based on report type
   * @param {string} reportType - Report type (MEMBERS, REVENUE, CLASSES, EQUIPMENT, SYSTEM, CUSTOM)
   * @param {Object} filters - Filters for the report
   * @returns {Promise<any>} Report data
   */
  async fetchReportData(reportType, filters = {}) {
    switch (reportType) {
      case 'MEMBERS':
        return await this.fetchMembersData(filters);
      case 'REVENUE':
        return await this.fetchRevenueData(filters);
      case 'CLASSES':
        return await this.fetchClassesData(filters);
      case 'EQUIPMENT':
        return await this.fetchEquipmentData(filters);
      case 'SYSTEM':
        return await this.fetchSystemData(filters);
      case 'CUSTOM':
        // For custom reports, filters should specify what data to fetch
        if (filters.dataType) {
          return await this.fetchReportData(filters.dataType, filters);
        }
        throw new Error('Custom report requires dataType in filters');
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }
}

module.exports = new ReportDataService();
