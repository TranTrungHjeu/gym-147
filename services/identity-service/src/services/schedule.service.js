const axios = require('axios');

class ScheduleService {
  constructor() {
    this.baseURL = process.env.SCHEDULE_SERVICE_URL || 'http://localhost:3003';
  }

  async createTrainer(userData) {
    try {
      const trainerData = {
        user_id: userData.id,
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone,
        email: userData.email,
        specializations: [], // Default empty array
        bio: null,
        experience_years: 0,
        hourly_rate: null,
        profile_photo: null,
      };

      const response = await axios.post(`${this.baseURL}/trainers`, trainerData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 seconds timeout
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Schedule service error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateTrainer(userId, userData) {
    try {
      const trainerData = {
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone,
        email: userData.email,
      };

      const response = await axios.put(`${this.baseURL}/trainers/user/${userId}`, trainerData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Schedule service update error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteTrainer(userId) {
    try {
      const response = await axios.delete(`${this.baseURL}/trainers/user/${userId}`, {
        timeout: 5000,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Schedule service delete error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new ScheduleService();
