import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { identityApiService } from '../identity/api.service';

// ============================================
//  CONFIGURE NOTIFICATION BEHAVIOR
// ============================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
//  PUSH NOTIFICATION SERVICE
// ============================================

class PushNotificationService {
  /**
   * Request notification permissions
   * NOTE: Push notifications are disabled on Android (Expo 53+)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Skip push notifications on Android
      if (Platform.OS === 'android') {
        console.log('[BELL] Push notifications disabled on Android');
        return false;
      }

      if (!Device.isDevice) {
        console.log('[BELL] Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[BELL] Failed to get push notification permissions');
        return false;
      }

      console.log('[SUCCESS] Push notification permissions granted');
      return true;
    } catch (error) {
      console.error('[ERROR] Request permissions error:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token
   * NOTE: Push notifications are disabled on Android (Expo 53+)
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      // Skip push notifications on Android
      if (Platform.OS === 'android') {
        console.log('[BELL] Push notifications disabled on Android');
        return null;
      }

      if (!Device.isDevice) {
        console.log('[BELL] Cannot get push token on simulator/emulator');
        return null;
      }

      // Get projectId from Constants (Expo 53+ requires this for standalone builds)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenOptions: Notifications.ExpoPushTokenOptions = projectId
        ? { projectId }
        : {};

      console.log('[BELL] Getting push token with options:', {
        hasProjectId: !!projectId,
        isStandalone: Constants.executionEnvironment === 'standalone',
      });

      const token = await Notifications.getExpoPushTokenAsync(tokenOptions);

      console.log('[SUCCESS] Expo Push Token:', token.data);
      return token.data;
    } catch (error: any) {
      console.error('[ERROR] Get push token error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        executionEnvironment: Constants.executionEnvironment,
      });

      // Try fallback without options if first attempt fails
      try {
        console.log('[RETRY] Retrying without projectId...');
        const fallbackToken = await Notifications.getExpoPushTokenAsync();
        console.log('[SUCCESS] Expo Push Token (fallback):', fallbackToken.data);
        return fallbackToken.data;
      } catch (fallbackError) {
        console.error('[ERROR] Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Register push token with backend
   * NOTE: Push notifications are disabled on Android (Expo 53+)
   */
  async registerPushToken(userId: string): Promise<boolean> {
    try {
      // Skip push notifications on Android
      if (Platform.OS === 'android') {
        console.log('[BELL] Push notifications disabled on Android');
        return false;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('[BELL] No permission to register push token');
        return false;
      }

      const pushToken = await this.getExpoPushToken();
      if (!pushToken) {
        console.log('[BELL] No push token to register');
        return false;
      }

      const pushPlatform = Platform.OS; // 'ios' only

      console.log('[BELL] Registering push token with backend...');
      console.log('   User ID:', userId);
      console.log('   Token:', pushToken.substring(0, 30) + '...');
      console.log('   Platform:', pushPlatform);

      const response = await identityApiService.put(
        `/auth/users/${userId}/push-token`,
        {
          push_token: pushToken,
          push_platform: pushPlatform,
        }
      );

      if (response.success) {
        console.log('[SUCCESS] Push token registered successfully');
        return true;
      } else {
        console.log('[ERROR] Failed to register push token:', response.message);
        return false;
      }
    } catch (error: any) {
      console.error('[ERROR] Register push token error:', error);
      return false;
    }
  }

  /**
   * Update push notification preference
   */
  async updatePushPreference(
    userId: string,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const response = await identityApiService.put(
        `/auth/users/${userId}/push-preference`,
        {
          push_enabled: enabled,
        }
      );

      if (response.success) {
        console.log(`[SUCCESS] Push preference updated: ${enabled}`);
        return true;
      } else {
        console.log('[ERROR] Failed to update push preference:', response.message);
        return false;
      }
    } catch (error: any) {
      console.error('[ERROR] Update push preference error:', error);
      return false;
    }
  }

  /**
   * Get push notification settings
   */
  async getPushSettings(userId: string): Promise<{
    success: boolean;
    data?: { push_enabled: boolean; push_platform?: string };
  }> {
    try {
      const response = await identityApiService.get(
        `/auth/users/${userId}/push-settings`
      );

      if (response.success) {
        return {
          success: true,
          data: response.data,
        };
      } else {
        return {
          success: false,
        };
      }
    } catch (error: any) {
      console.error('[ERROR] Get push settings error:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners() {
    // Listen for notifications received while app is foregrounded
    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('[BELL] Notification received (foreground):', notification);
        console.log('   Title:', notification.request.content.title);
        console.log('   Body:', notification.request.content.body);
        console.log('   Data:', notification.request.content.data);
      });

    // Note: Navigation handling is done in _layout.tsx
    // This listener is kept for logging purposes
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[BELL] Notification tapped (push service):', response);
        console.log('   Action:', response.actionIdentifier);
        console.log('   Data:', response.notification.request.content.data);
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Configure notification channels (Android only)
   * NOTE: Push notifications are disabled on Android, so this is a no-op
   */
  async setupNotificationChannels() {
    if (Platform.OS === 'android') {
      console.log('[BELL] Push notifications disabled on Android - skipping channel setup');
      return;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
