import { GymSession, Member, MemberStats } from '@/types/memberTypes';
import { memberApiService } from './api.service';

class MemberService {
  private baseUrl = 'http://10.0.2.2:3002/members'; // Direct connection to Member Service

  /**
   * Check if current user has a member record
   * Returns true if member exists, false otherwise
   */
  async checkMemberExists(): Promise<boolean> {
    try {
      console.log('🔍 Checking if member exists...');
      const token = await memberApiService.getStoredToken();

      if (!token) {
        console.log('❌ No token found');
        return false;
      }

      // Try to get member profile
      const response = await memberApiService.get('/members/profile');

      if (response.data && (response.data as any).id) {
        console.log('✅ Member exists:', (response.data as any).id);
        return true;
      }

      console.log('❌ Member not found');
      return false;
    } catch (error: any) {
      console.log('❌ Error checking member existence:', error.message);
      // If 404 or any error, assume member doesn't exist
      return false;
    }
  }

  /**
   * Get current member profile
   */
  async getMemberProfile(): Promise<{
    success: boolean;
    data?: Member;
    error?: string;
  }> {
    try {
      console.log('🔑 Fetching member profile from API...');

      // Check if we have a token first
      const token = await memberApiService.getStoredToken();
      console.log('🔑 Token exists:', !!token);
      console.log(
        '🔑 Token preview:',
        token ? token.substring(0, 20) + '...' : 'No token'
      );

      // If no token, return error immediately
      if (!token) {
        console.log('🔑 No token found, cannot fetch profile');
        return {
          success: false,
          error: 'No authentication token found. Please login again.',
        };
      }

      // Try to decode token to check if it's valid
      try {
        console.log('🔑 Full token:', token);
        console.log('🔑 Token length:', token.length);
        console.log('🔑 Token parts:', token.split('.').length);

        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          console.log('🔑 Invalid token format - not a JWT');
          return {
            success: false,
            error: 'Invalid token format. Please login again.',
          };
        }

        console.log('🔑 Token header:', tokenParts[0]);
        console.log('🔑 Token payload (raw):', tokenParts[1]);

        // Try to decode the payload with proper base64 padding
        let payloadBase64 = tokenParts[1];
        while (payloadBase64.length % 4) {
          payloadBase64 += '=';
        }

        const decodedPayload = atob(payloadBase64);
        console.log('🔑 Token payload (decoded string):', decodedPayload);

        const payload = JSON.parse(decodedPayload);
        console.log('🔑 Token payload (parsed):', payload);
        console.log('🔑 Current time:', Date.now() / 1000);
        console.log('🔑 Token exp:', payload.exp);

        // Check if token is expired
        if (payload.exp && payload.exp < Date.now() / 1000) {
          console.log('🔑 Token expired');
          return {
            success: false,
            error: 'Authentication token expired. Please login again.',
          };
        }

        console.log('🔑 Token validation passed');
      } catch (decodeError: any) {
        console.log('🔑 Token decode failed:', decodeError);
        console.log('🔑 Decode error details:', {
          message: decodeError?.message || 'Unknown error',
          name: decodeError?.name || 'Unknown',
          stack: decodeError?.stack || 'No stack trace',
        });

        // Don't clear token immediately - let's see if API call works
        console.log(
          '🔑 Token decode failed - checking remember me preference...'
        );
        // Check if user chose to remember login before clearing token
        try {
          const authStorage = require('@/utils/auth/storage');
          const rememberMe = await authStorage.getRememberMe();

          if (!rememberMe) {
            await authStorage.clearAuthData();
            console.log(
              '🔑 Cleared invalid auth data from storage (remember me = false)'
            );
          } else {
            console.log('🔑 Keeping auth data (remember me = true)');
          }
        } catch (clearError) {
          console.log(
            '🔑 Failed to check remember me or clear auth data:',
            clearError
          );
        }

        return {
          success: false,
          error: 'Invalid authentication token. Please login again.',
        };
      }

      // Try to get user profile from Identity Service first
      let response;
      try {
        // Try Identity Service profile endpoint (port 3001)
        const identityResponse = await memberApiService.get('/profile', {
          baseURL: 'http://192.168.2.19:3001',
        });
        console.log('🔑 Identity Service profile response:', identityResponse);

        // If we get user profile, try to get member data
        if (
          identityResponse.data &&
          typeof identityResponse.data === 'object' &&
          'user' in identityResponse.data
        ) {
          const userData = (identityResponse.data as any).user;
          try {
            // Try to get member data by user_id
            const memberResponse = await memberApiService.get(
              `/members/user/${userData.id}`
            );
            console.log('🔑 Member Service response:', memberResponse);

            // Combine user and member data
            const memberData: any =
              (memberResponse.data as any)?.member || memberResponse.data || {};
            response = {
              data: {
                ...memberData,
                id: memberData.id || userData.id, // Ensure id is always present
                full_name: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                phone: userData.phone,
                is_active: userData.emailVerified,
              },
            };
          } catch (memberError: any) {
            console.log(
              '🔑 Member data not found, using user data only:',
              memberError.message
            );
            // Use only user data if member data not found
            response = {
              data: {
                id: userData.id,
                full_name: `${userData.firstName} ${userData.lastName}`,
                email: userData.email,
                phone: userData.phone,
                date_of_birth: '',
                gender: 'other',
                address: '',
                height: 0,
                weight: 0,
                body_fat_percent: 0,
                medical_conditions: [],
                allergies: [],
                fitness_goals: [],
                emergency_contact: {
                  name: '',
                  relationship: 'other',
                  phone: '',
                },
                profile_photo: '',
                membership_type: 'basic',
                membership_status: 'ACTIVE',
                membership_start_date: '',
                membership_end_date: '',
                is_active: userData.emailVerified,
                created_at: userData.createdAt,
                updated_at: userData.updatedAt,
              },
            };
          }
        } else {
          throw new Error('No user data in response');
        }
      } catch (identityError: any) {
        console.log('🔑 Identity Service failed:', identityError.message);

        // Fallback to Member Service endpoints
        try {
          response = await memberApiService.get('/members/profile');
          console.log('🔑 Member Service profile response:', response);
        } catch (memberError: any) {
          console.log('🔑 Member Service failed:', memberError.message);
          throw identityError; // Throw original error
        }
      }

      return {
        success: true,
        data: response.data as Member,
      };
    } catch (error: any) {
      console.error('🔑 Failed to fetch member profile:', error);
      console.error('🔑 Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        url: error.url,
      });

      // Provide more specific error messages
      let errorMessage = 'Failed to fetch member profile';
      if (error.status === 404) {
        errorMessage =
          'Member not found. Please check your account status or contact support.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication required. Please login again.';
      } else if (error.status === 403) {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // For 404 errors, we might want to return a default profile structure
      // so the app doesn't crash completely
      if (error.status === 404) {
        console.log('🔑 Returning default profile structure for 404 error');
        return {
          success: true,
          data: {
            id: 'temp-user',
            full_name: 'Guest User',
            email: 'guest@example.com',
            phone: '',
            date_of_birth: '',
            gender: 'other',
            address: '',
            height: 0,
            weight: 0,
            body_fat_percent: 0,
            medical_conditions: [],
            allergies: [],
            fitness_goals: [],
            emergency_contact: {
              name: '',
              relationship: 'other',
              phone: '',
            },
            profile_photo: '',
            membership_type: 'basic',
            membership_start_date: '',
            membership_end_date: '',
            membership_status: 'ACTIVE',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Member,
        };
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update member profile
   */
  async updateMemberProfile(
    data: Partial<Member>
  ): Promise<{ success: boolean; data?: Member; error?: string }> {
    try {
      const response = await memberApiService.put('/members/profile', data);
      return { success: true, data: response.data as Member };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get member statistics
   */
  async getMemberStats(): Promise<{
    success: boolean;
    data?: MemberStats;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/profile/stats');
      return { success: true, data: response.data as MemberStats };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get gym sessions for a member
   * @param params - Query parameters for filtering sessions (e.g., start_date, end_date)
   */
  async getGymSessions(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: GymSession[]; error?: string }> {
    try {
      const response = await memberApiService.get('/members/sessions', {
        params,
      });
      return {
        success: true,
        data: ((response.data as any).data || response.data) as GymSession[],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current active session
   */
  async getCurrentSession(): Promise<{
    success: boolean;
    data?: GymSession;
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/sessions/current');
      return { success: true, data: response.data as GymSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record gym entry
   */
  async recordEntry(): Promise<{
    success: boolean;
    data?: GymSession;
    error?: string;
  }> {
    try {
      const response = await memberApiService.post('/members/sessions/entry');
      return { success: true, data: response.data as GymSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Record gym exit
   */
  async recordExit(): Promise<{
    success: boolean;
    data?: GymSession;
    error?: string;
  }> {
    try {
      const response = await memberApiService.post('/members/sessions/exit');
      return { success: true, data: response.data as GymSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await memberApiService.get('/members/sessions/stats', {
        params: { period },
      });
      return { success: true, data: response.data as GymSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session details with equipment usage
   */
  async getSessionDetails(
    sessionId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await memberApiService.get(`/sessions/${sessionId}`);
      return { success: true, data: response.data as GymSession };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(
    base64Image: string,
    mimeType: string = 'image/jpeg',
    filename: string = 'avatar.jpg'
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await memberApiService.post('/members/avatar/upload', {
        base64Image,
        mimeType,
        filename,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const memberService = new MemberService();
export default memberService;
