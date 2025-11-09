import { useAuth } from '@/contexts/AuthContext';
import { challengeService, pointsService, streakService } from '@/services';
import { achievementService } from '@/services/member/achievement.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Award,
  Crown,
  Flame,
  Medal,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type LeaderboardType = 'achievements' | 'points' | 'streaks' | 'challenges';
type Period = 'weekly' | 'monthly' | 'yearly' | 'alltime';

interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  avatarUrl: string | null;
  membershipType: string;
  isCurrentUser: boolean;
  // Type-specific fields
  points?: number;
  achievements?: number;
  currentStreak?: number;
  longestStreak?: number;
  completedChallenges?: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { member, user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('achievements');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  const themedStyles = styles(theme);

  const tabs = [
    {
      id: 'achievements' as LeaderboardType,
      label: t('achievements.title'),
      icon: Trophy,
    },
    { id: 'points' as LeaderboardType, label: t('points.title'), icon: Zap },
    {
      id: 'streaks' as LeaderboardType,
      label: t('streaks.title'),
      icon: Flame,
    },
    {
      id: 'challenges' as LeaderboardType,
      label: t('challenges.title'),
      icon: Target,
    },
  ];

  const periods: { label: string; value: Period }[] = [
    { label: t('achievements.periods.weekly'), value: 'weekly' },
    { label: t('achievements.periods.monthly'), value: 'monthly' },
    { label: t('achievements.periods.yearly'), value: 'yearly' },
    { label: t('achievements.periods.allTime'), value: 'alltime' },
  ];

  const loadLeaderboard = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      let result;

      switch (activeTab) {
        case 'achievements':
          const achievementsResult = await achievementService.getLeaderboard({
            period: selectedPeriod as any,
            limit: 50,
          });
          if (achievementsResult.success && achievementsResult.data) {
            result = achievementsResult.data.map((entry: any) => ({
              rank: entry.rank,
              memberId: entry.memberId,
              memberName: entry.memberName,
              avatarUrl: entry.avatarUrl,
              membershipType: entry.membershipType,
              achievements: entry.achievements,
              points: entry.points,
              isCurrentUser: entry.memberId === member.id,
            }));
          }
          break;

        case 'points':
          const pointsResult = await pointsService.getLeaderboard({
            period: selectedPeriod,
            limit: 50,
          });
          if (pointsResult.success && pointsResult.data) {
            result = pointsResult.data.map((entry: any) => ({
              rank: entry.rank,
              memberId: entry.memberId,
              memberName: entry.memberName,
              avatarUrl: entry.avatarUrl,
              membershipType: entry.membershipType,
              points: entry.points,
              isCurrentUser: entry.memberId === member.id,
            }));
          }
          break;

        case 'streaks':
          const streaksResult = await streakService.getLeaderboard({
            limit: 50,
            type: 'current',
          });
          if (streaksResult.success && streaksResult.data) {
            result = streaksResult.data.map((entry: any) => ({
              rank: entry.rank,
              memberId: entry.memberId,
              memberName: entry.memberName,
              avatarUrl: entry.avatarUrl,
              membershipType: entry.membershipType,
              currentStreak: entry.currentStreak,
              longestStreak: entry.longestStreak,
              isCurrentUser: entry.memberId === member.id,
            }));
          }
          break;

        case 'challenges':
          const challengesResult = await challengeService.getLeaderboard({
            period: selectedPeriod,
            limit: 50,
          });
          if (challengesResult.success && challengesResult.data) {
            result = challengesResult.data.map((entry: any) => ({
              rank: entry.rank,
              memberId: entry.memberId,
              memberName: entry.memberName,
              avatarUrl: entry.avatarUrl,
              membershipType: entry.membershipType,
              completedChallenges: entry.completedChallenges,
              isCurrentUser: entry.memberId === member.id,
            }));
          }
          break;
      }

      if (result) {
        setLeaderboard(result);
        // Find user rank
        const userEntry = result.find(
          (entry: LeaderboardEntry) => entry.isCurrentUser
        );
        setUserRank(userEntry || null);
      } else {
        setLeaderboard([]);
        setUserRank(null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  useEffect(() => {
    if (member?.id) {
      loadLeaderboard();
    }
  }, [member?.id, activeTab, selectedPeriod]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return <Star size={20} color={theme.colors.textSecondary} />;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return theme.colors.textSecondary;
  };

  const formatValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'points':
        return entry.points ? `${entry.points.toLocaleString()}` : '0';
      case 'achievements':
        return `${entry.achievements || 0}`;
      case 'streaks':
        return `${entry.currentStreak || 0} ${t('streaks.days')}`;
      case 'challenges':
        return `${entry.completedChallenges || 0}`;
      default:
        return '0';
    }
  };

  const getValueLabel = () => {
    switch (activeTab) {
      case 'points':
        return t('points.title');
      case 'achievements':
        return t('achievements.achievements');
      case 'streaks':
        return t('streaks.currentStreak');
      case 'challenges':
        return t('challenges.completed');
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={themedStyles.container} edges={['top']}>
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={themedStyles.titleContainer}>
          <Trophy size={24} color={theme.colors.primary} />
          <Text
            style={[
              Typography.h2,
              { color: theme.colors.text, marginLeft: theme.spacing.sm },
            ]}
          >
            {t('leaderboard.title')}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={themedStyles.tabsContainer}
        contentContainerStyle={themedStyles.tabsContent}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[themedStyles.tab, isActive && themedStyles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Icon
                size={18}
                color={
                  isActive ? theme.colors.primary : theme.colors.textSecondary
                }
              />
              <Text
                style={[
                  Typography.bodySmall,
                  {
                    color: isActive
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    marginLeft: theme.spacing.xs,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Period Filter */}
      <View style={themedStyles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={themedStyles.periodContainer}
        >
          {periods.map((period) => {
            const isActive = selectedPeriod === period.value;
            return (
              <TouchableOpacity
                key={period.value}
                style={[
                  themedStyles.periodButton,
                  isActive && themedStyles.activePeriodButton,
                ]}
                onPress={() => setSelectedPeriod(period.value)}
              >
                <Text
                  style={[
                    Typography.bodySmall,
                    {
                      color: isActive
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={themedStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              Typography.bodyRegular,
              {
                color: theme.colors.textSecondary,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            {t('common.loading')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={themedStyles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* User Rank Card */}
          {userRank && (
            <View style={themedStyles.userRankCard}>
              <View style={themedStyles.userRankHeader}>
                <Text
                  style={[
                    Typography.bodyMedium,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('leaderboard.yourRank')}
                </Text>
                <View style={themedStyles.userRankBadge}>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: theme.colors.primary },
                    ]}
                  >
                    #{userRank.rank}
                  </Text>
                </View>
              </View>
              <View style={themedStyles.userRankInfo}>
                <View style={themedStyles.userRankAvatar}>
                  {userRank.avatarUrl ? (
                    <Image
                      source={{ uri: userRank.avatarUrl }}
                      style={themedStyles.avatarImage}
                    />
                  ) : (
                    <Text
                      style={[Typography.h3, { color: theme.colors.primary }]}
                    >
                      {userRank.memberName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={themedStyles.userRankDetails}>
                  <Text
                    style={[
                      Typography.bodyMedium,
                      { color: theme.colors.text },
                    ]}
                  >
                    {userRank.memberName}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {getValueLabel()}
                  </Text>
                </View>
                <View style={themedStyles.userRankValue}>
                  <Text
                    style={[Typography.h2, { color: theme.colors.primary }]}
                  >
                    {formatValue(userRank)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Leaderboard List */}
          <View style={themedStyles.leaderboardContainer}>
            <Text
              style={[
                Typography.h3,
                { color: theme.colors.text, marginBottom: theme.spacing.md },
              ]}
            >
              {t('leaderboard.topPerformers')}
            </Text>

            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => {
                const isTopThree = entry.rank <= 3;
                return (
                  <View
                    key={entry.memberId}
                    style={[
                      themedStyles.leaderboardItem,
                      isTopThree && themedStyles.topThreeItem,
                      entry.isCurrentUser && themedStyles.currentUserItem,
                    ]}
                  >
                    <View style={themedStyles.rankContainer}>
                      <View style={themedStyles.rankIconContainer}>
                        {getRankIcon(entry.rank)}
                      </View>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          { color: getRankColor(entry.rank) },
                        ]}
                      >
                        #{entry.rank}
                      </Text>
                    </View>

                    <View style={themedStyles.memberInfo}>
                      <View style={themedStyles.memberAvatar}>
                        {entry.avatarUrl ? (
                          <Image
                            source={{ uri: entry.avatarUrl }}
                            style={themedStyles.avatarImage}
                          />
                        ) : (
                          <Text
                            style={[
                              Typography.bodyMedium,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {entry.memberName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={themedStyles.memberDetails}>
                        <Text
                          style={[
                            Typography.bodyRegular,
                            { color: theme.colors.text },
                          ]}
                        >
                          {entry.memberName}
                        </Text>
                        {entry.isCurrentUser && (
                          <Text
                            style={[
                              Typography.caption,
                              { color: theme.colors.primary },
                            ]}
                          >
                            {t('leaderboard.you')}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={themedStyles.valueContainer}>
                      <Text
                        style={[
                          Typography.bodyMedium,
                          { color: theme.colors.text },
                        ]}
                      >
                        {formatValue(entry)}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={themedStyles.emptyContainer}>
                <Text
                  style={[
                    Typography.bodyRegular,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('leaderboard.noData')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: theme.spacing.xs,
      marginRight: theme.spacing.sm,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tabsContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tabsContent: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginRight: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
    activeTab: {
      backgroundColor: theme.colors.primaryLight,
    },
    filterContainer: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    periodContainer: {
      paddingHorizontal: theme.spacing.md,
    },
    periodButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginRight: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
    activePeriodButton: {
      backgroundColor: theme.colors.primaryLight,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    userRankCard: {
      backgroundColor: theme.colors.surface,
      margin: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    userRankHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    userRankBadge: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.md,
    },
    userRankInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userRankAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    avatarImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    userRankDetails: {
      flex: 1,
    },
    userRankValue: {
      alignItems: 'flex-end',
    },
    leaderboardContainer: {
      padding: theme.spacing.md,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    topThreeItem: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    currentUserItem: {
      backgroundColor: theme.colors.primaryLight,
    },
    rankContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: 60,
    },
    rankIconContainer: {
      marginRight: theme.spacing.xs,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    memberDetails: {
      flex: 1,
    },
    valueContainer: {
      alignItems: 'flex-end',
    },
    emptyContainer: {
      padding: theme.spacing.xl,
      alignItems: 'center',
    },
  });
