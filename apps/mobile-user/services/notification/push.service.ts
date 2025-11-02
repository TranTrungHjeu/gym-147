import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
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
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('🔔 Push notifications only work on physical devices');
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
        console.log('🔔 Failed to get push notification permissions');
        return false;
      }

      console.log('✅ Push notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Request permissions error:', error);
      return false;
    }
  }

  /**
   * Get Expo Push Token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('🔔 Cannot get push token on simulator/emulator');
        return null;
      }

      // For Expo Go, don't pass projectId
      // For standalone app, uncomment and add projectId
      const token = await Notifications.getExpoPushTokenAsync();

      console.log('✅ Expo Push Token:', token.data);
      return token.data;
    } catch (error: any) {
      console.error('❌ Get push token error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
      });

      // Try fallback without options if first attempt fails
      try {
        console.log('🔄 Retrying without projectId...');
        const fallbackToken = await Notifications.getExpoPushTokenAsync();
        console.log('✅ Expo Push Token (fallback):', fallbackToken.data);
        return fallbackToken.data;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Register push token with backend
   */
  async registerPushToken(userId: string): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('🔔 No permission to register push token');
        return false;
      }

      const pushToken = await this.getExpoPushToken();
      if (!pushToken) {
        console.log('🔔 No push token to register');
        return false;
      }

      const pushPlatform = Platform.OS; // 'ios' | 'android'

      console.log('🔔 Registering push token with backend...');
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
        console.log('✅ Push token registered successfully');
        return true;
      } else {
        console.log('❌ Failed to register push token:', response.message);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Register push token error:', error);
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
        console.log(`✅ Push preference updated: ${enabled}`);
        return true;
      } else {
        console.log('❌ Failed to update push preference:', response.message);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Update push preference error:', error);
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
      console.error('❌ Get push settings error:', error);
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
        console.log('🔔 Notification received (foreground):', notification);
        console.log('   Title:', notification.request.content.title);
        console.log('   Body:', notification.request.content.body);
        console.log('   Data:', notification.request.content.data);
      });

    // Listen for user interaction with notifications
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('🔔 Notification tapped:', response);
        console.log('   Action:', response.actionIdentifier);
        console.log('   Data:', response.notification.request.content.data);

        // Handle navigation based on notification data
        const data = response.notification.request.content.data as any;
        if (data?.type === 'QUEUE_YOUR_TURN') {
          console.log('   → Navigate to equipment:', data.equipment_id);
          // TODO: Implement navigation
        }
      });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Configure notification channels (Android only)
   */
  async setupNotificationChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('queue', {
        name: 'Queue Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#00FF00',
        sound: 'default',
      });

      console.log('✅ Android notification channels configured');
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
