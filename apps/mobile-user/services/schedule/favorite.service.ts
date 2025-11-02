import { FavoriteType, MemberFavorite } from '@/types/classTypes';
import { scheduleApiService } from './api.service';

class FavoriteService {
  /**
   * Add favorite (class or trainer)
   */
  async addFavorite(
    memberId: string,
    favoriteType: FavoriteType,
    favoriteId: string
  ): Promise<{
    success: boolean;
    data?: MemberFavorite;
    error?: string;
  }> {
    try {
      const response = await scheduleApiService.post(
        `/members/${memberId}/favorites`,
        {
          favorite_type: favoriteType,
          favorite_id: favoriteId,
        }
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      console.error('❌ Error adding favorite:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove favorite
   */
  async removeFavorite(
    memberId: string,
    favoriteId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!memberId || !memberId.trim() || !favoriteId || !favoriteId.trim()) {
        return {
          success: false,
          error: 'memberId and favoriteId are required',
        };
      }

      const response = await scheduleApiService.delete(
        `/members/${memberId.trim()}/favorites/${favoriteId.trim()}`
      );

      // ApiService.delete returns { success: true, data: ... } or throws error
      // Backend DELETE returns: { success: true, message: '...', data: null }
      // If no error thrown and response exists, it means success
      if (response) {
        // Check if response has success property
        if (response.success === true || (response.success !== false && !response.error)) {
          return {
            success: true,
          };
        }
      }
      
      // If we reach here, something went wrong
      return {
        success: false,
        error: response?.error || response?.message || 'Failed to remove favorite',
      };
    } catch (error: any) {
      console.error('❌ Error removing favorite:', error);
      return { success: false, error: error.message || 'Failed to remove favorite' };
    }
  }

  /**
   * Get member favorites
   */
  async getMemberFavorites(
    memberId: string,
    favoriteType?: FavoriteType
  ): Promise<{
    success: boolean;
    data?: MemberFavorite[];
    error?: string;
  }> {
    try {
      // Pass params directly, not nested in params object
      const response = favoriteType
        ? await scheduleApiService.get(
            `/members/${memberId}/favorites`,
            {
              favorite_type: favoriteType,
            }
          )
        : await scheduleApiService.get(`/members/${memberId}/favorites`);

      // Backend returns: { success: true, data: { favorites: [...], pagination: {...} } }
      const favorites = response.data?.favorites || response.data?.data || response.data || [];
      
      return {
        success: true,
        data: Array.isArray(favorites) ? favorites : [],
      };
    } catch (error: any) {
      console.error('❌ Error fetching favorites:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if item is favorited
   */
  async checkFavorite(
    memberId: string,
    favoriteType: FavoriteType,
    favoriteId: string
  ): Promise<{
    success: boolean;
    data?: boolean;
    error?: string;
  }> {
    try {
      // Validate inputs first
      if (!memberId || !memberId.trim()) {
        return {
          success: false,
          error: 'memberId is required',
        };
      }
      if (!favoriteType) {
        return {
          success: false,
          error: 'favoriteType is required',
        };
      }
      if (!favoriteId || !favoriteId.trim()) {
        return {
          success: false,
          error: 'favoriteId is required',
        };
      }

      const favoriteTypeStr = String(favoriteType).trim();
      const favoriteIdStr = String(favoriteId).trim();

      // Build URL with query params explicitly to ensure they're sent correctly
      const baseUrl = `/members/${memberId.trim()}/favorites/check`;
      const queryParams = new URLSearchParams({
        favorite_type: favoriteTypeStr,
        favorite_id: favoriteIdStr,
      });
      const urlWithParams = `${baseUrl}?${queryParams.toString()}`;

      console.log('🔍 Checking favorite:', { memberId: memberId.trim(), favoriteType: favoriteTypeStr, favoriteId: favoriteIdStr });

      const response = await scheduleApiService.get(urlWithParams);

      // Backend returns: { success: true, data: { is_favorited: boolean, favorite_id: string | null } }
      const isFavorited = response.data?.data?.is_favorited ?? response.data?.is_favorited ?? false;
      
      return {
        success: true,
        data: isFavorited,
      };
    } catch (error: any) {
      console.error('❌ Error checking favorite:', error);
      return { success: false, error: error.message };
    }
  }
}

export const favoriteService = new FavoriteService();
export default favoriteService;

