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

  const themedStyles = styles(theme);

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
        if (response.data.id) {
          try {
            const count = await notificationService.getUnreadCount(
              response.data.id
            );
            setUnreadCount(count);
          } catch (error) {
            console.error('Error loading notification count:', error);
          }
        } else {
          console.warn(
            'Member ID not available, skipping notification count load'
          );
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
      <SafeAreaView style={themedStyles.container}>
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.text, marginTop: theme.spacing.md },
            ]}
          >
            {t('profile.loadingProfile')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={themedStyles.container}>
        <View style={themedStyles.errorContainer}>
          <Text
            style={[
              Typography.bodyRegular,
              {
                color: theme.colors.error,
                textAlign: 'center',
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={themedStyles.retryButton}
            onPress={loadProfile}
          >
            <Text
              style={[
                Typography.bodyMedium,
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
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          {t('profile.title')}
        </Text>
        <TouchableOpacity
          style={themedStyles.iconButton}
          onPress={() => router.push('/settings')}
        >
          <Settings size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themedStyles.content}
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
        <View style={themedStyles.profileHeader}>
          <View style={themedStyles.profileImageContainer}>
            {userProfile?.profile_photo ? (
              <Image
                source={{ uri: userProfile.profile_photo }}
                style={themedStyles.profileImage}
              />
            ) : (
              <UserCircle size={80} color={theme.colors.primary} />
            )}
          </View>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            {userProfile?.full_name || 'User'}
          </Text>

          <View style={themedStyles.editButtonsContainer}>
            <TouchableOpacity
              style={themedStyles.editButton}
              onPress={() => router.push('/profile/edit-personal')}
            >
              <Text
                style={[Typography.bodySmall, { color: theme.colors.primary }]}
              >
                {t('profile.personal')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.editButton}
              onPress={() => router.push('/profile/edit-health')}
            >
              <Text
                style={[Typography.bodySmall, { color: theme.colors.primary }]}
              >
                {t('profile.health')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.editButton}
              onPress={() => router.push('/profile/edit-goals')}
            >
              <Text
                style={[Typography.bodySmall, { color: theme.colors.primary }]}
              >
                {t('profile.goals')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={themedStyles.statsContainer}>
          <View style={themedStyles.statsItem}>
            <View
              style={[
                themedStyles.statsIconContainer,
                { backgroundColor: theme.colors.primary + '15' },
              ]}
            >
              <Target size={24} color={theme.colors.primary} />
            </View>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('profile.goals')}
            </Text>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.text, textAlign: 'center' },
              ]}
            >
              {userProfile?.fitness_goals &&
              userProfile.fitness_goals.length > 0
                ? userProfile.fitness_goals[0]
                : t('common.notAvailable')}
            </Text>
          </View>

          <View style={themedStyles.statsItem}>
            <View
              style={[
                themedStyles.statsIconContainer,
                { backgroundColor: theme.colors.info + '15' },
              ]}
            >
              <HeartPulse size={24} color={theme.colors.info} />
            </View>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('health.metricTypes.bodyFat')}
            </Text>
            <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
              {userProfile?.body_fat_percent && userProfile.body_fat_percent > 0
                ? `${userProfile.body_fat_percent.toFixed(1)}%`
                : t('common.notAvailable')}
            </Text>
          </View>

          <View style={themedStyles.statsItem}>
            <View
              style={[
                themedStyles.statsIconContainer,
                { backgroundColor: theme.colors.success + '15' },
              ]}
            >
              <Weight size={24} color={theme.colors.success} />
            </View>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('profile.weight')}
            </Text>
            <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
              {userProfile?.weight && userProfile.weight > 0
                ? `${Math.round(userProfile.weight)} kg`
                : t('common.notAvailable')}
            </Text>
          </View>

          <View style={themedStyles.statsItem}>
            <View
              style={[
                themedStyles.statsIconContainer,
                { backgroundColor: theme.colors.warning + '15' },
              ]}
            >
              <Ruler size={24} color={theme.colors.warning} />
            </View>
            <Text
              style={[
                Typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('profile.height')}
            </Text>
            <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
              {userProfile?.height && userProfile.height > 0
                ? `${Math.round(userProfile.height)} cm`
                : t('common.notAvailable')}
            </Text>
          </View>
        </View>

        <ProfileSection title={t('profile.health')} items={healthItems} />
        <ProfileSection title={t('profile.account')} items={accountItems} />
        <ProfileSection title={t('profile.support')} items={supportItems} />

        <View style={themedStyles.appVersion}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            GYM147 v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    profileImageContainer: {
      width: 100,
      height: 100,
      borderRadius: theme.radius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: 3,
      borderColor: theme.colors.primary + '30',
      ...theme.shadows.md,
    },
    profileImage: {
      width: 100,
      height: 100,
    },
    editButtonsContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      justifyContent: 'center',
    },
    editButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    statsItem: {
      flex: 1,
      minWidth: '45%',
      padding: theme.spacing.md,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    statsIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    appVersion: {
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      ...theme.shadows.sm,
    },
  });
