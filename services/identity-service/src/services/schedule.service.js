const axios = require('axios');

class ScheduleService {
  constructor() {
    // Priority order for Docker environment:
    // 1. SCHEDULE_SERVICE_URL (explicit config from .env)
    // 2. Docker container name (http://schedule:3003) - default for Docker
    // 3. API_GATEWAY_URL + /schedule (via gateway)
    // 4. Localhost fallback (for local development)

    let baseURL = process.env.SCHEDULE_SERVICE_URL;

    if (!baseURL) {
      // Check if running in Docker
      // In Docker, services communicate via container/service names
      // Docker Compose creates a network where service names resolve to container IPs
      const isDocker = this._isRunningInDocker();

      if (isDocker) {
        // Use Docker service name (from docker-compose.yml)
        // Service name is 'schedule', container name is 'schedule-service'
        baseURL = 'http://schedule:3003';
        console.log('🐳 Detected Docker environment, using container name: schedule:3003');
      } else {
        // Local development - try API Gateway first, then localhost
        const apiGatewayUrl = process.env.API_GATEWAY_URL || process.env.GATEWAY_URL;
        if (apiGatewayUrl) {
          baseURL = `${apiGatewayUrl.replace(/\/$/, '')}/schedule`;
          console.log('🌐 Using API Gateway URL:', baseURL);
        } else {
          baseURL = 'http://localhost:3003';
          console.log('💻 Local development mode, using localhost:3003');
        }
      }
    } else {
      console.log('⚙️ Using explicit SCHEDULE_SERVICE_URL from environment:', baseURL);
    }

    this.baseURL = baseURL;
    console.log('📡 Schedule Service URL configured:', this.baseURL);
    console.log('📡 Schedule Service initialized with fallback mechanism');
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
    console.log('🚀 [NEW CODE] createTrainer called with userData:', {
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

    // Try multiple URLs as fallback
    // Priority: configured URL -> Docker container name -> localhost
    const isDocker = this._isRunningInDocker();
    const urlsToTry = [];

    // Add configured URL first
    urlsToTry.push(this.baseURL);

    // Add Docker container name if not already in list and we're in Docker
    if (isDocker && !urlsToTry.includes('http://schedule:3003')) {
      urlsToTry.push('http://schedule:3003');
    }

    // Add localhost as fallback (works in both Docker and local if port is exposed)
    if (!urlsToTry.includes('http://localhost:3003')) {
      urlsToTry.push('http://localhost:3003');
    }

    // Remove duplicates
    const uniqueUrls = urlsToTry.filter((url, index, self) => self.indexOf(url) === index);

    console.log('🔄 Starting trainer creation with fallback URLs:', uniqueUrls);
    console.log(`🐳 Docker environment: ${isDocker ? 'Yes' : 'No'}`);

    let lastError = null;
    let workingURL = null;

    for (const baseURL of uniqueUrls) {
      try {
        console.log(
          `🔄 [${uniqueUrls.indexOf(baseURL) + 1}/${
            uniqueUrls.length
          }] Attempting: ${baseURL}/trainers`
        );

        const response = await axios.post(`${baseURL}/trainers`, trainerData, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000, // 5 seconds timeout per attempt
        });

        console.log('✅ Trainer created successfully in schedule-service:', response.data);
        workingURL = baseURL;

        // Update baseURL if this one worked
        if (baseURL !== this.baseURL) {
          console.log(`📡 Updating schedule service URL to working URL: ${baseURL}`);
          this.baseURL = baseURL;
        }

        return {
          success: true,
          data: response.data,
        };
      } catch (error) {
        lastError = error;
        const errorMsg =
          error.code === 'ECONNREFUSED'
            ? `Connection refused - service may not be running on ${baseURL}`
            : error.message;
        console.warn(
          `⚠️ [${uniqueUrls.indexOf(baseURL) + 1}/${uniqueUrls.length}] Failed: ${errorMsg}`
        );
        // Continue to next URL
      }
    }

    // All URLs failed
    console.error('❌ All schedule service URLs failed. Summary:', {
      urlsTried: uniqueUrls.map((url, idx) => `${idx + 1}. ${url}`),
      configuredURL: this.baseURL,
      lastError: {
        code: lastError?.code,
        message: lastError?.message,
        status: lastError?.response?.status,
        statusText: lastError?.response?.statusText,
      },
      suggestion:
        'Please ensure schedule-service is running. Check: docker-compose ps schedule or verify port 3003 is accessible',
    });

    return {
      success: false,
      error: lastError?.message || 'Failed to connect to schedule service',
      status: lastError?.response?.status,
      responseData: lastError?.response?.data,
      urlsTried: uniqueUrls,
    };
  }

  async updateTrainer(userId, userData) {
    try {
      const trainerData = {
        full_name: `${userData.firstName} ${userData.lastName}`.trim(),
        phone: userData.phone || null, // Ensure null if undefined/empty
        email: userData.email || '', // Ensure string, not undefined
      };

      console.log('🔄 Calling schedule-service to update trainer:', {
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

      console.log('✅ Trainer service update successful:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Schedule service update error:', {
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

      console.error('❌ Error getting trainer by user_id:', error.message);
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
