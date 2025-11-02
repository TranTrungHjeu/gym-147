import { memberApiService } from './api.service';

export interface AccessCheckIn {
  method: 'RFID' | 'QR_CODE' | 'FACE_RECOGNITION' | 'MANUAL' | 'MOBILE_APP';
  data?: string; // RFID tag, QR code, or base64 image
  location?: string;
}

export interface AccessCheckOut {
  session_id?: string;
  location?: string;
}

export interface AccessSession {
  id: string;
  member_id: string;
  check_in_time: string;
  check_out_time?: string;
  access_method:
    | 'RFID'
    | 'QR_CODE'
    | 'FACE_RECOGNITION'
    | 'MANUAL'
    | 'MOBILE_APP';
  location: string;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface AccessHistory {
  sessions: AccessSession[];
  total_count: number;
  current_page: number;
  total_pages: number;
}

class AccessService {
  // Get base URL from centralized config
  private get baseUrl() {
    const { SERVICE_URLS } = require('@/config/environment');
    return `${SERVICE_URLS.MEMBER}/members`;
  }

  /**
   * Check in to gym using various methods
   */
  async checkIn(data: AccessCheckIn & { memberId: string }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { memberId, method, location } = data;

      // Map to backend API format
      const payload = {
        entry_method: method,
        entry_gate: location || 'Main Entrance',
      };

      const response = await memberApiService.post(
        `/members/${memberId}/sessions/entry`,
        payload
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Check-in error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check in',
      };
    }
  }

  /**
   * Check out from gym
   */
  async checkOut(data: {
    memberId: string;
    location?: string;
    session_rating?: number;
    notes?: string;
    exit_method?: 'RFID' | 'QR_CODE' | 'FACE_RECOGNITION' | 'MANUAL' | 'MOBILE_APP';
  }): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const { memberId, location, session_rating, notes, exit_method } = data;

      // Map to backend API format
      const payload = {
        exit_method: exit_method || 'MANUAL',
        exit_gate: location || 'Main Entrance',
        session_rating,
        notes,
      };

      const response = await memberApiService.post(
        `/members/${memberId}/sessions/exit`,
        payload
      );

      return {
        success: response.success || true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Check-out error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check out',
      };
    }
  }

  /**
   * Get current active access session
   */
  async getCurrentAccess(memberId: string): Promise<{
    success: boolean;
    data?: { session: any } | null;
    error?: string;
  }> {
    try {
      // Backend route is /sessions/current (not /sessions/active)
      const response = await memberApiService.get(
        `/members/${memberId}/sessions/current`
      );

      console.log('📊 getCurrentAccess API response:', {
        success: response.success,
        hasData: !!response.data,
        session: response.data?.session,
      });

      return {
        success: response.success || true,
        data: response.data, // Backend returns { session: {...} }
      };
    } catch (error: any) {
      console.log('⚠️ getCurrentAccess error:', {
        status: error.response?.status,
        message: error.message,
      });

      // If 404 or no active session, return null (not an error)
      if (error.response?.status === 404) {
        return {
          success: true,
          data: { session: null },
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to get current access',
      };
    }
  }

  /**
   * Get access history
   */
  async getAccessHistory(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    success: boolean;
    data?: AccessHistory;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/access/history', {
        params,
      });
      return {
        success: true,
        data: response.data as AccessHistory,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get access history',
      };
    }
  }

  /**
   * Get access statistics
   */
  async getAccessStats(period: 'week' | 'month' | 'year' = 'month'): Promise<{
    success: boolean;
    data?: {
      total_visits: number;
      average_duration: number;
      most_used_method: string;
      visits_by_day: { [key: string]: number };
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/access/stats', {
        params: { period },
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get access statistics',
      };
    }
  }

  /**
   * Validate RFID tag
   */
  async validateRFIDTag(tag: string): Promise<{
    success: boolean;
    data?: { valid: boolean; member_id?: string };
    error?: string;
  }> {
    try {
      // Validate RFID tag input
      if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid RFID tag provided',
        };
      }

      const response = await memberApiService.post(
        '/members/access/validate-rfid',
        {
          tag: tag.trim(),
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('RFID validation API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate RFID tag',
      };
    }
  }

  /**
   * Validate QR code
   */
  async validateQRCode(code: string): Promise<{
    success: boolean;
    data?: { valid: boolean; member_id?: string; expires_at?: string };
    error?: string;
  }> {
    try {
      // Validate QR code input
      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return {
          success: false,
          error: 'Invalid QR code provided',
        };
      }

      const response = await memberApiService.post(
        '/members/access/validate-qr',
        {
          code: code.trim(),
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('QR validation API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate QR code',
      };
    }
  }

  /**
   * Process face recognition
   */
  async processFaceRecognition(imageBase64: string): Promise<{
    success: boolean;
    data?: {
      recognized: boolean;
      member_id?: string;
      confidence?: number;
      face_detected: boolean;
    };
    error?: string;
  }> {
    try {
      // Validate base64 string format
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return {
          success: false,
          error: 'Invalid image data provided',
        };
      }

      // Check if it's a valid base64 string
      const base64Regex = /^data:image\/(jpeg|jpg|png|gif);base64,/;
      if (!base64Regex.test(imageBase64)) {
        return {
          success: false,
          error:
            'Invalid base64 image format. Expected data:image/[type];base64,[data]',
        };
      }

      const response = await memberApiService.post(
        '/members/access/face-recognition',
        {
          image: imageBase64,
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('Face recognition API error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process face recognition',
      };
    }
  }

  /**
   * Get available access methods for member
   */
  async getAvailableAccessMethods(): Promise<{
    success: boolean;
    data?: {
      rfid_enabled: boolean;
      qr_enabled: boolean;
      face_recognition_enabled: boolean;
      qr_code?: string; // Current QR code if enabled
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/access/methods');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get access methods',
      };
    }
  }
}

export const accessService = new AccessService();
export default accessService;
