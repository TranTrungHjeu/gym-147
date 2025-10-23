import ProfileSection from '@/components/ProfileSection';
import { authService, memberService, notificationService } from '@/services';
import { type Member } from '@/types/memberTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Bell,
  Gift,
  HeartPulse,
  CircleHelp as HelpCircle,
  LogOut,
  Ruler,
  Settings,
  Shield,
  Target,
  CircleUser as UserCircle,
  Weight,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // State for API data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await memberService.getMemberProfile();

      if (response.success && response.data) {
        setUserProfile(response.data);

        // Load notification count
        try {
          const count = await notificationService.getUnreadCount(
            response.data.id
          );
          setUnreadCount(count);
        } catch (error) {
          console.error('Error loading notification count:', error);
        }
      } else {
        setError(response.error || 'Failed to load profile');
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    // Navigate to profile edit options
    router.push('/profile/edit-personal');
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('profile.loadingProfile')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={loadProfile}
          >
            <Text
              style={[
                styles.retryButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = async () => {
    Alert.alert(t('auth.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            router.replace('/(auth)/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert(t('common.error'), t('profile.logoutFailed'));
          }
        },
      },
    ]);
  };

  const healthItems = [
    {
      id: 'add-metric',
      label: t('health.addHealthMetric'),
      icon: <HeartPulse size={20} color={theme.colors.primary} />,
      onPress: () => router.push('/health/add-metric'),
    },
    {
      id: 'health-trends',
      label: t('health.healthTrends'),
      icon: <Target size={20} color={theme.colors.info} />,
      onPress: () => router.push('/health/trends'),
    },
  ];

  const accountItems = [
    {
      id: 'settings',
      label: t('common.settings'),
      icon: <Settings size={20} color={theme.colors.primary} />,
      onPress: () => router.push('/settings'),
    },
    {
      id: 'notifications',
      label: t('profile.notifications'),
      icon: <Bell size={20} color={theme.colors.info} />,
      onPress: () => router.push('/notifications'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'privacy',
      label: t('profile.privacy'),
      icon: <Shield size={20} color={theme.colors.info} />,
      onPress: () => router.push('/settings/privacy'),
    },
    {
      id: 'logout',
      label: t('auth.logout'),
      icon: <LogOut size={20} color={theme.colors.error} />,
      onPress: handleLogout,
    },
  ];

  const supportItems = [
    {
      id: 'help',
      label: t('profile.help'),
      icon: <HelpCircle size={20} color={theme.colors.info} />,
      onPress: () => router.push('/settings/support'),
    },
    {
      id: 'premium',
      label: t('profile.upgradeToPremium'),
      icon: <Gift size={20} color={theme.colors.warning} />,
      onPress: () => {
        Alert.alert(t('profile.premium'), t('profile.premiumComingSoon'));
      },
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('profile.title')}
        </Text>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.gray }]}
        >
          <Settings size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {userProfile?.profile_photo ? (
              <Image
                source={{ uri: userProfile.profile_photo }}
                style={styles.profileImage}
              />
            ) : (
              <UserCircle size={80} color={theme.colors.primary} />
            )}
          </View>
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {userProfile?.full_name || 'User'}
          </Text>
          <Text
            style={[styles.profileEmail, { color: theme.colors.textSecondary }]}
          >
            {userProfile?.email || 'user@example.com'}
          </Text>

          <View style={styles.editButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
              onPress={() => router.push('/profile/edit-personal')}
            >
              <Text
                style={[styles.editButtonText, { color: theme.colors.primary }]}
              >
                {t('profile.personal')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
              onPress={() => router.push('/profile/edit-health')}
            >
              <Text
                style={[styles.editButtonText, { color: theme.colors.primary }]}
              >
                {t('profile.health')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
              onPress={() => router.push('/profile/edit-goals')}
            >
              <Text
                style={[styles.editButtonText, { color: theme.colors.primary }]}
              >
                {t('profile.goals')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statsItem}>
            <View
              style={[
                styles.statsIconContainer,
                { backgroundColor: theme.colors.primary + '20' },
              ]}
            >
              <Target size={20} color={theme.colors.primary} />
            </View>
            <Text
              style={[styles.statsLabel, { color: theme.colors.textSecondary }]}
            >
              {t('profile.goals')}
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {userProfile?.fitness_goals?.[0] === 'gain_muscle'
                ? t('profile.fitnessGoalOptions.gainMuscle')
                : userProfile?.fitness_goals?.[0] === 'lose_weight'
                ? t('profile.fitnessGoalOptions.loseWeight')
                : userProfile?.fitness_goals?.[0] === 'increase_endurance'
                ? t('profile.fitnessGoalOptions.increaseEndurance')
                : userProfile?.fitness_goals?.[0] === 'improve_flexibility'
                ? t('profile.fitnessGoalOptions.improveFlexibility')
                : t('profile.fitnessGoalOptions.maintain')}
            </Text>
          </View>

          <View style={styles.statsItem}>
            <View
              style={[
                styles.statsIconContainer,
                { backgroundColor: theme.colors.info + '20' },
              ]}
            >
              <HeartPulse size={20} color={theme.colors.info} />
            </View>
            <Text
              style={[styles.statsLabel, { color: theme.colors.textSecondary }]}
            >
              {t('profile.weeklyGoal')}
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              4 {t('profile.workouts')}
            </Text>
          </View>

          <View style={styles.statsItem}>
            <View
              style={[
                styles.statsIconContainer,
                { backgroundColor: theme.colors.info + '20' },
              ]}
            >
              <Weight size={20} color={theme.colors.info} />
            </View>
            <Text
              style={[styles.statsLabel, { color: theme.colors.textSecondary }]}
            >
              {t('profile.weight')}
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {userProfile?.weight || 0} kg
            </Text>
          </View>

          <View style={styles.statsItem}>
            <View
              style={[
                styles.statsIconContainer,
                { backgroundColor: theme.colors.info + '20' },
              ]}
            >
              <Ruler size={20} color={theme.colors.info} />
            </View>
            <Text
              style={[styles.statsLabel, { color: theme.colors.textSecondary }]}
            >
              {t('profile.height')}
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {userProfile?.height || 0} cm
            </Text>
          </View>
        </View>

        <ProfileSection title={t('profile.health')} items={healthItems} />
        <ProfileSection title={t('profile.account')} items={accountItems} />
        <ProfileSection title={t('profile.support')} items={supportItems} />

        <View style={styles.appVersion}>
          <Text
            style={[
              styles.appVersionText,
              { color: theme.colors.textSecondary },
            ]}
          >
            GYM147 v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
  },
  headerTitle: {
    ...Typography.h2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: 100,
    height: 100,
  },
  profileName: {
    ...Typography.h4,
    marginBottom: 4,
  },
  profileEmail: {
    ...Typography.bodySmall,
    marginBottom: 16,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  statsItem: {
    width: '50%',
    padding: 12,
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  statsValue: {
    ...Typography.h6,
  },
  appVersion: {
    alignItems: 'center',
    marginVertical: 24,
  },
  appVersionText: {
    ...Typography.bodySmall,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...Typography.bodyRegular,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...Typography.bodyRegular,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    ...Typography.bodyMedium,
  },
});
