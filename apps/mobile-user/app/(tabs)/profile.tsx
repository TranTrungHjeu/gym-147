import { MembershipBadge } from '@/components/MembershipBadge';
import ProfileSection from '@/components/ProfileSection';
import { authService, memberService, notificationService, pointsService } from '@/services';
import { MembershipType, type Member } from '@/types/memberTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useFocusEffect } from '@react-navigation/native';
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
  Trophy,
  CircleUser as UserCircle,
  Weight,
  Coins,
  Sparkles,
  Flame,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

// Import avatar frames for VIP and PREMIUM
import PremiumFrame from '@/assets/frame/premium.svg';
import VipFrame from '@/assets/frame/vip.svg';

const getGoalLabelKey = (goal: string): string => {
  const mapping: Record<string, string> = {
    // Enum values
    WEIGHT_LOSS: 'fitnessGoalWeightLoss',
    MUSCLE_GAIN: 'fitnessGoalMuscleGain',
    ENDURANCE: 'fitnessGoalEndurance',
    FLEXIBILITY: 'fitnessGoalFlexibility',
    STRENGTH: 'fitnessGoalStrength',
    CARDIO: 'fitnessGoalCardio',
    GENERAL_FITNESS: 'fitnessGoalGeneral',
    SPORTS_PERFORMANCE: 'fitnessGoalSports',
    REHABILITATION: 'fitnessGoalRehabilitation',
    MAINTENANCE: 'fitnessGoalMaintenance',
    // CamelCase values from register-profile
    loseWeight: 'fitnessGoalWeightLoss',
    gainMuscle: 'fitnessGoalMuscleGain',
    increaseEndurance: 'fitnessGoalEndurance',
    improveFlexibility: 'fitnessGoalFlexibility',
    maintain: 'fitnessGoalMaintenance',
  };
  return mapping[goal] || goal;
};

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
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const hasLoadedOnce = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      setError(null);

      const response = await memberService.getMemberProfile();

      if (response.success && response.data) {
        setUserProfile(response.data);

        // Load notification count and points balance
        if (response.data.id) {
          try {
            const [count, pointsResponse] = await Promise.all([
              notificationService.getUnreadCount(response.data.id),
              pointsService.getBalance(response.data.id),
            ]);
            setUnreadCount(count);
            if (pointsResponse.success && pointsResponse.data) {
              setPointsBalance(pointsResponse.data.current);
            }
          } catch (error) {
            console.error('Error loading notification count or points:', error);
          }
        } else {
          console.warn(
            'Member ID not available, skipping notification count load'
          );
        }
      } else {
        const errorMsg = response.error || 'Failed to load profile';
        setError(errorMsg);

        // If session expired, redirect to login
        if (
          errorMsg.includes('Session expired') ||
          errorMsg.includes('login again')
        ) {
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 1500);
        }
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      const errorMsg = err.message || 'Failed to load profile';
      setError(errorMsg);

      // If session expired, redirect to login
      if (
        errorMsg.includes('Session expired') ||
        errorMsg.includes('login again')
      ) {
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1500);
      }
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    // Navigate to profile edit options
    router.push('/profile/edit-personal');
  };

  // Load profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

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
      id: 'leaderboard',
      label: t('leaderboard.title'),
      icon: <Trophy size={20} color={theme.colors.warning} />,
      onPress: () => router.push('/leaderboard'),
    },
    {
      id: 'achievements',
      label: t('navigation.achievements'),
      icon: <Trophy size={20} color={theme.colors.warning} />,
      onPress: () => router.push('/achievements'),
    },
    {
      id: 'streaks',
      label: t('streaks.title'),
      icon: <Flame size={20} color={theme.colors.error} />,
      onPress: () => router.push('/streaks'),
    },
    {
      id: 'challenges',
      label: t('challenges.title'),
      icon: <Zap size={20} color={theme.colors.info} />,
      onPress: () => router.push('/challenges'),
    },
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
            {/* Avatar Image */}
            {userProfile?.profile_photo ? (
              <Image
                source={{ uri: userProfile.profile_photo }}
                style={themedStyles.profileImage}
              />
            ) : (
              <UserCircle size={80} color={theme.colors.primary} />
            )}

            {/* VIP/PREMIUM Frame Overlay */}
            {userProfile?.membership_type === 'VIP' && (
              <View style={themedStyles.frameOverlay}>
                <VipFrame width={160} height={160} />
              </View>
            )}
            {userProfile?.membership_type === 'PREMIUM' && (
              <View style={themedStyles.frameOverlay}>
                <PremiumFrame width={160} height={160} />
              </View>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}
          >
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              {userProfile?.full_name || 'User'}
            </Text>

            {/* Membership Badge */}
            {userProfile?.membership_type && (
              <MembershipBadge
                tier={userProfile.membership_type}
                size="small"
              />
            )}
          </View>

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

        {/* Points Card */}
        <TouchableOpacity
          style={themedStyles.pointsCard}
          onPress={() => router.push('/rewards')}
        >
          <View style={themedStyles.pointsHeader}>
            <View style={themedStyles.pointsIconContainer}>
              <Coins size={28} color="#FFD700" />
              <Sparkles size={16} color="#FFD700" style={themedStyles.sparkleIcon} />
            </View>
            <View style={themedStyles.pointsContent}>
              <Text style={themedStyles.pointsLabel}>Điểm thưởng</Text>
              <Text style={themedStyles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
            </View>
            <View style={themedStyles.pointsArrow}>
              <Gift size={20} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={themedStyles.pointsSubtext}>Nhấn để xem phần thưởng</Text>
        </TouchableOpacity>

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
                ? t(`profile.${getGoalLabelKey(userProfile.fitness_goals[0])}`)
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

        {/* Membership Info Card */}
        {userProfile?.membership_type && (
          <View style={themedStyles.membershipCard}>
            <View style={themedStyles.membershipHeader}>
              <Text style={[Typography.h4, { color: theme.colors.text }]}>
                {t('profile.membershipBenefits.title')}
              </Text>
              <MembershipBadge
                tier={userProfile.membership_type}
                size="large"
              />
            </View>

            <View style={themedStyles.benefitsList}>
              {(
                t(`profile.membershipBenefits.${userProfile.membership_type}`, {
                  returnObjects: true,
                }) as string[]
              ).map((benefit: string, index: number) => (
                <View key={index} style={themedStyles.benefitItem}>
                  <Text style={{ color: theme.colors.primary, fontSize: 16 }}>
                    ✓
                  </Text>
                  <Text
                    style={[
                      Typography.bodyRegular,
                      { color: theme.colors.text, flex: 1, marginLeft: 8 },
                    ]}
                  >
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>

            {userProfile.membership_type !== MembershipType.VIP && (
              <TouchableOpacity
                style={[
                  themedStyles.upgradeButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => router.push('/subscription/plans')}
              >
                <Gift size={20} color={theme.colors.textInverse} />
                <Text
                  style={[
                    Typography.bodyMedium,
                    {
                      color: theme.colors.textInverse,
                      marginLeft: 8,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {userProfile.membership_type === MembershipType.PREMIUM
                    ? t('profile.upgradeToPremium').replace('Premium', 'VIP')
                    : t('profile.upgradeToPremium')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
      borderRadius: 50, // Làm tròn hoàn toàn (100/2 = 50)
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      overflow: 'visible', // Cho phép frame vượt ra ngoài
      backgroundColor: theme.colors.surface,
      borderWidth: 3,
      borderColor: theme.colors.primary + '30',
      ...theme.shadows.md,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50, // Làm tròn hoàn toàn
    },
    frameOverlay: {
      position: 'absolute',
      top: -32,
      left: -32,
      width: 160,
      height: 160,
      justifyContent: 'center',
      alignItems: 'center',
      pointerEvents: 'none', // Không chặn tương tác với avatar
    },
    cameraIconOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    sparkle: {
      position: 'absolute',
      fontSize: 20,
      pointerEvents: 'none',
    },
    glowBackground: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 25,
      elevation: 15,
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
    membershipCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      marginVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    membershipHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    benefitsList: {
      marginTop: theme.spacing.sm,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      marginTop: theme.spacing.md,
    },
    appVersion: {
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
    },
    pointsCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.sm,
    },
    pointsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    pointsIconContainer: {
      position: 'relative',
      marginRight: theme.spacing.md,
    },
    sparkleIcon: {
      position: 'absolute',
      top: -4,
      right: -4,
    },
    pointsContent: {
      flex: 1,
    },
    pointsLabel: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    pointsValue: {
      fontSize: 28,
      fontFamily: 'SpaceGrotesk-Bold',
      color: '#FFD700',
      fontWeight: '700',
    },
    pointsArrow: {
      marginLeft: theme.spacing.sm,
    },
    pointsSubtext: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
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
