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
      console.log('Checking if member exists...');
      const token = await memberApiService.getStoredToken();

      if (!token) {
        console.log('No token found');
        return false;
      }

      // Try to get member profile
      const response = await memberApiService.get('/members/profile');

      if (response.data && (response.data as any).id) {
        console.log('Member exists:', (response.data as any).id);
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

      // No need to check token expiry here - ApiService will auto-refresh if needed

      // Try to get user profile from Identity Service first
      let response;
      try {
        // Import at runtime to avoid circular dependency
        const { SERVICE_URLS } = require('@/config/environment');
        // Try Identity Service profile endpoint (port 3001)
        const identityResponse = await memberApiService.get('/profile', {
          baseURL: SERVICE_URLS.IDENTITY,
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
                id: memberData.id,
                full_name: memberData.full_name,
                email: userData.email,
                phone: userData.phone,
                is_active: userData.emailVerified,
              },
            };
          } catch (memberError: any) {
            console.log(
              '🔑 Member data not found, throwing error:',
              memberError.message
            );
            // Throw error instead of creating mock data
            throw memberError;
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

          // Don't throw - return error response instead
          return {
            success: false,
            error: identityError.message || 'Failed to fetch profile',
          };
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
        errorMessage = 'Session expired. Please login again.';

        // Clear auth data when session expired
        try {
          const { clearAuthData } = await import('@/utils/auth/storage');
          await clearAuthData();
          console.log('🔑 Cleared auth data due to session expiry');
        } catch (clearError) {
          console.error('🔑 Failed to clear auth data:', clearError);
        }
      } else if (error.status === 403) {
        errorMessage = 'Access denied. Please contact support.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
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
   * Toggle AI Class Recommendations (Premium feature)
   */
  async toggleAIClassRecommendations(): Promise<{
    success: boolean;
    data?: { ai_class_recommendations_enabled: boolean };
    error?: string;
  }> {
    try {
      const response = await memberApiService.put(
        '/members/preferences/ai-class-recommendations'
      );
      return {
        success: true,
        data: response.data?.data || response.data,
      };
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
  // Onboarding
  async getOnboardingStatus(): Promise<{
    success: boolean;
    data?: {
      completed: boolean;
      steps: Record<string, boolean>;
      completedAt?: Date;
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.get('/members/onboarding/status');
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateOnboardingProgress(
    step?: string,
    completed?: boolean,
    completedAll?: boolean
  ): Promise<{
    success: boolean;
    data?: {
      completed: boolean;
      steps: Record<string, boolean>;
      completedAt?: Date;
    };
    error?: string;
  }> {
    try {
      const response = await memberApiService.patch(
        '/members/onboarding/progress',
        {
          step,
          completed,
          completedAll,
        }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

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
