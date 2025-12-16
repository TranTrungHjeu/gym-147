import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { identityApiService } from '../identity/api.service';

// ============================================
//  HELPER: Check if running in Expo Go
// ============================================

/**
 * Check if the app is running in Expo Go
 * Remote push notifications are not supported in Expo Go (SDK 53+)
 * Local notifications (scheduleNotificationAsync) still work in Expo Go
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

// ============================================
//  SUPPRESS EXPO GO WARNING
// ============================================
// Suppress the Expo Go push notification warning that appears on import
// This warning is expected and harmless - local notifications still work in Expo Go
// NOTE: The warning may still appear in the console as it's logged from native code,
// but we suppress JavaScript-level warnings here

const originalWarn = console.warn;
const originalError = console.error;
const suppressedPatterns = [
  /expo-notifications.*Expo Go.*SDK 53/i,
  /Android Push notifications.*removed from Expo Go/i,
  /expo-notifications.*functionality.*not fully supported.*Expo Go/i,
];

function shouldSuppressWarning(message: string): boolean {
  return suppressedPatterns.some((pattern) => pattern.test(message));
}

// Override console.warn to suppress Expo Go warnings
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (shouldSuppressWarning(message)) {
    // Suppress the warning - it's expected in Expo Go
    return;
  }
  originalWarn.apply(console, args);
};

// Also override console.error in case warning is logged as error
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (shouldSuppressWarning(message)) {
    // Suppress the warning - it's expected in Expo Go
    return;
  }
  originalError.apply(console, args);
};

// ============================================
//  IMPORT NOTIFICATIONS MODULE
// ============================================
// Import with warning suppression in place
// The warning may still appear from native code, but we suppress JS-level warnings
import * as Notifications from 'expo-notifications';

// Restore original console methods after import
// (Keep suppression active for any delayed warnings)
// console.warn = originalWarn;
// console.error = originalError;

// ============================================
//  CONFIGURE NOTIFICATION BEHAVIOR
// ============================================
// NOTE: Local notifications (scheduleNotificationAsync) work in Expo Go
// Remote push notifications (getExpoPushTokenAsync) do NOT work in Expo Go (SDK 53+)

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
   * Check if push notifications are supported
   */
  private isPushSupported(): boolean {
    // Push notifications are not supported in Expo Go
    if (isExpoGo()) {
      console.log(
        '[BELL] Push notifications not supported in Expo Go. Use a development build instead.'
      );
      return false;
    }

    // Skip push notifications on Android (Expo 53+)
    if (Platform.OS === 'android') {
      console.log('[BELL] Push notifications disabled on Android');
      return false;
    }

    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('[BELL] Push notifications only work on physical devices');
      return false;
    }

    return true;
  }

  /**
   * Request notification permissions
   * NOTE: Push notifications are disabled on Android (Expo 53+) and Expo Go
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isPushSupported()) {
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
   * NOTE: Push notifications are disabled on Android (Expo 53+) and Expo Go
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!this.isPushSupported()) {
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
        console.log(
          '[SUCCESS] Expo Push Token (fallback):',
          fallbackToken.data
        );
        return fallbackToken.data;
      } catch (fallbackError) {
        console.error('[ERROR] Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Register push token with backend
   * NOTE: Push notifications are disabled on Android (Expo 53+) and Expo Go
   */
  async registerPushToken(userId: string): Promise<boolean> {
    try {
      if (!this.isPushSupported()) {
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
        console.log(
          '[ERROR] Failed to update push preference:',
          response.message
        );
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

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data as {
            push_enabled: boolean;
            push_platform?: string;
          },
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
   * NOTE: Push notifications are disabled on Android and Expo Go, so this is a no-op
   */
  async setupNotificationChannels() {
    if (isExpoGo()) {
      console.log(
        '[BELL] Running in Expo Go - push notifications not supported'
      );
      return;
    }

    if (Platform.OS === 'android') {
      console.log(
        '[BELL] Push notifications disabled on Android - skipping channel setup'
      );
      return;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
