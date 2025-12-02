const axios = require('axios');

class ScheduleService {
  constructor() {
    if (!process.env.SCHEDULE_SERVICE_URL) {
      throw new Error('SCHEDULE_SERVICE_URL environment variable is required. Please set it in your .env file.');
    }
    this.baseURL = process.env.SCHEDULE_SERVICE_URL;
    console.log('[EMIT] Schedule Service URL configured:', this.baseURL);
  }

  /**
   * Detect if running inside Docker container
   * Checks multiple indicators:
   * 1. DOCKER_ENV environment variable
   * 2. /.dockerenv file existence
   * 3. Container name in /proc/self/cgroup
   * 4. NODE_ENV === 'production' (often set in Docker)
   */
  _isRunningInDocker() {
    // Check explicit Docker flag
    if (process.env.DOCKER_ENV === 'true') {
      return true;
    }

    // Check for /.dockerenv file (exists in Docker containers)
    try {
      const fs = require('fs');
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }
    } catch (e) {
      // File system check failed, continue with other methods
    }

    // Check cgroup (Linux containers)
    try {
      const fs = require('fs');
      if (fs.existsSync('/proc/self/cgroup')) {
        const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
        if (cgroup.includes('docker') || cgroup.includes('kubepods')) {
          return true;
        }
      }
    } catch (e) {
      // cgroup check failed, continue
    }

    // Fallback: if NODE_ENV is production, assume Docker (common pattern)
    // But this is less reliable, so we'll prioritize it lower
    if (process.env.NODE_ENV === 'production' && !process.env.DOCKER_ENV) {
      // Only assume Docker if we're in production AND not explicitly set
      // This is a heuristic and may need adjustment
      return false; // Don't auto-assume, let fallback mechanism handle it
    }

    return false;
  }

  async createTrainer(userData) {
    console.log('[START] createTrainer called with userData:', {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    });
    // Phone is required in schedule-service schema, use a placeholder if not provided
    const phone = userData.phone || `temp-${userData.id.substring(0, 8)}`;

    const trainerData = {
      user_id: userData.id,
      full_name: `${userData.firstName} ${userData.lastName}`.trim(),
      phone: phone,
      email: userData.email,
      specializations: [], // Default empty array
      bio: null,
      experience_years: 0,
      hourly_rate: null,
      profile_photo: null,
    };

    try {
      console.log(`[SYNC] Creating trainer at: ${this.baseURL}/trainers`);

      const response = await axios.post(`${this.baseURL}/trainers`, trainerData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      console.log('[SUCCESS] Trainer created successfully in schedule-service:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[ERROR] Failed to create trainer in schedule-service:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      return {
        success: false,
        error: error.message || 'Failed to connect to schedule service',
        status: error.response?.status,
        responseData: error.response?.data,
      };
    }
  }

  async updateTrainer(userId, userData) {
    try {
      const trainerData = {
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone || null, // Ensure null if undefined/empty
        email: userData.email || '', // Ensure string, not undefined
      };

      console.log('[SYNC] Calling schedule-service to update trainer:', {
        url: `${this.baseURL}/trainers/user/${userId}`,
        data: trainerData,
        originalPhone: userData.phone,
        originalEmail: userData.email,
      });

      const response = await axios.put(`${this.baseURL}/trainers/user/${userId}`, trainerData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      console.log('[SUCCESS] Trainer service update successful:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[ERROR] Schedule service update error:', {
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

  /**
   * Get trainer by user_id
   * Returns trainer_id if trainer exists
   */
  async getTrainerByUserId(userId) {
    try {
      const response = await axios.get(`${this.baseURL}/trainers/user/${userId}`, {
        timeout: 5000,
      });

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.trainer
      ) {
        return {
          success: true,
          trainerId: response.data.data.trainer.id,
          trainer: response.data.data.trainer,
        };
      }

      return {
        success: false,
        trainerId: null,
        error: 'Trainer not found in response',
      };
    } catch (error) {
      // If 404, trainer doesn't exist
      if (error.response?.status === 404) {
        return {
          success: false,
          trainerId: null,
          error: 'Trainer not found',
        };
      }

      console.error('[ERROR] Error getting trainer by user_id:', error.message);
      return {
        success: false,
        trainerId: null,
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
      // If 404, trainer doesn't exist, consider it already deleted
      if (error.response?.status === 404) {
        console.log('Trainer not found in schedule service (already deleted or never existed)');
        return {
          success: true,
          data: null,
        };
      }
      console.error('Schedule service delete error:', {
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
}

module.exports = new ScheduleService();
