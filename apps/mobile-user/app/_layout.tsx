import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import '@/locales/i18n'; // Initialize i18n';
import { ThemeProvider, useTheme } from '@/utils/theme';
import { AccountDeletedModal } from '@/components/AccountDeletedModal';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { pushNotificationService } from '@/services/notification/push.service';
import { validateNotificationData, type NotificationData } from '@/types/notificationTypes';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { logout } = useAuth();
  const router = useRouter();
  const [showDeletedModal, setShowDeletedModal] = React.useState(false);

  // Listen for user:deleted event
  React.useEffect(() => {
    const handleUserDeleted = (event: CustomEvent) => {
      console.log('🚨 User account deleted event received in AppContent:', event.detail);
      setShowDeletedModal(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('user:deleted', handleUserDeleted as EventListener);
      return () => {
        window.removeEventListener('user:deleted', handleUserDeleted as EventListener);
      };
    }
  }, []);

  const handleLogout = async () => {
    setShowDeletedModal(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings/index"
          options={{ headerShown: false }}
        />
      </Stack>
      <AccountDeletedModal visible={showDeletedModal} onLogout={handleLogout} />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    // Inter fonts - for body text and general UI
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    // Space Grotesk fonts - for headings and emphasis
    'SpaceGrotesk-Light': SpaceGrotesk_300Light,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-SemiBold': SpaceGrotesk_600SemiBold,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Setup push notification listeners for navigation
  useEffect(() => {
    // Setup notification channels (Android)
    pushNotificationService.setupNotificationChannels();

    // Listen for user interaction with notifications (when app is in background/closed)
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('🔔 Notification tapped:', response);
        const data = response.notification.request.content.data as any;
        const notificationType = data?.type || data?.notificationType;

        try {
          // Validate notification data
          if (!validateNotificationData(data)) {
            console.warn('⚠️ Invalid notification data, navigating to notifications list');
            router.push('/notifications');
            return;
          }

          // Handle different notification types with deep linking
          switch (notificationType) {
            case 'QUEUE_YOUR_TURN':
            case 'QUEUE_POSITION_UPDATED':
              if (data?.equipment_id) {
                console.log('   → Navigating to equipment:', data.equipment_id);
                router.push(`/equipment/${data.equipment_id}`);
              }
              break;

            case 'CLASS_BOOKING':
            case 'CLASS_CANCELLED':
            case 'CLASS_REMINDER':
            case 'WAITLIST_PROMOTED':
              if (data?.schedule_id) {
                console.log('   → Navigating to class schedule:', data.schedule_id);
                router.push(`/classes/${data.schedule_id}`);
              } else if (data?.class_id) {
                router.push(`/classes/${data.class_id}`);
              }
              break;

            case 'PAYMENT_SUCCESS':
            case 'PAYMENT_FAILED':
            case 'SUBSCRIPTION_CREATED':
            case 'SUBSCRIPTION_RENEWED':
            case 'SUBSCRIPTION_EXPIRED':
              console.log('   → Navigating to subscription');
              router.push('/subscription');
              break;

            case 'ACHIEVEMENT_UNLOCKED':
              if (data?.achievement_id) {
                console.log('   → Navigating to achievement:', data.achievement_id);
                router.push(`/achievements/${data.achievement_id}`);
              } else {
                router.push('/achievements');
              }
              break;

            case 'REWARD_REDEMPTION':
              if (data?.reward_id || data?.redemption_id) {
                console.log('   → Navigating to reward:', data.reward_id || data.redemption_id);
                router.push(`/rewards/${data.reward_id || data.redemption_id}`);
              } else {
                router.push('/rewards');
              }
              break;

            case 'MEMBERSHIP_EXPIRING':
            case 'MEMBERSHIP_EXPIRED':
            case 'MEMBERSHIP_RENEWED':
              router.push('/subscription');
              break;

            case 'INVOICE_GENERATED':
            case 'INVOICE_OVERDUE':
              if (data?.invoice_id) {
                router.push(`/subscription/invoices/${data.invoice_id}`);
              } else {
                router.push('/subscription/invoices');
              }
              break;

            default:
              // For unknown types, navigate to notifications list
              console.log('   → Unknown notification type, navigating to notifications');
              router.push('/notifications');
              break;
          }
        } catch (navigationError) {
          console.error('❌ Error navigating from notification:', navigationError);
          // Fallback to notifications list
          router.push('/notifications');
        }
      });

    return () => {
      responseSubscription.remove();
    };
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme.isDark ? 'light' : 'dark'} />;
}
