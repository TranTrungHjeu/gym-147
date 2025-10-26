import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { achievementService } from '@/services/member/achievement.service';
import type { LeaderboardEntry } from '@/types/achievementTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Award, Crown, Medal, Star, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  const themedStyles = styles(theme);

  const periods = [
    { label: t('achievements.periods.weekly'), value: 'weekly' },
    { label: t('achievements.periods.monthly'), value: 'monthly' },
    { label: t('achievements.periods.yearly'), value: 'yearly' },
    { label: t('achievements.periods.allTime'), value: 'alltime' },
  ];

  const loadLeaderboard = async () => {
    if (!user?.id) return;

    try {
      const [leaderboardResponse, userRankData] = await Promise.all([
        achievementService.getLeaderboard({ period: selectedPeriod as any }),
        achievementService.getUserRank(user.id, selectedPeriod),
      ]);

      // Handle leaderboard response
      if (leaderboardResponse.success && leaderboardResponse.data) {
        setLeaderboard(leaderboardResponse.data);
      } else {
        setLeaderboard([]);
      }

      // Handle user rank data
      setUserRank(userRankData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
      setUserRank(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return <Star size={24} color={theme.colors.textSecondary} />;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return theme.colors.textSecondary;
  };

  const formatPoints = (points: number) => {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
  };

  useEffect(() => {
    loadLeaderboard();
    setLoading(false);
  }, [user?.id, selectedPeriod]);

  if (loading) {
    return (
      <View style={themedStyles.container}>
        <View style={themedStyles.loadingContainer}>
          <Text
            style={[
              Typography.bodyRegular,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('achievements.leaderboardLoading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View style={themedStyles.titleContainer}>
          <Trophy size={24} color={theme.colors.primary} />
          <Text
            style={[
              Typography.h2,
              { color: theme.colors.text, marginLeft: theme.spacing.sm },
            ]}
          >
            {t('achievements.leaderboard')}
          </Text>
        </View>
      </View>

      <View style={themedStyles.filterContainer}>
        <Text style={[Typography.bodyBold, { color: theme.colors.text }]}>
          {t('common.period')}:
        </Text>
        <View style={themedStyles.periodSelector}>
          <Picker
            selectedValue={selectedPeriod}
            onValueChange={handlePeriodChange}
            items={periods}
          />
        </View>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {userRank && (
          <View style={themedStyles.userRankCard}>
            <View style={themedStyles.userRankHeader}>
              <View style={themedStyles.userRankTitleContainer}>
                <Trophy size={20} color={theme.colors.primary} />
                <Text
                  style={[
                    Typography.h3,
                    { color: theme.colors.text, marginLeft: theme.spacing.sm },
                  ]}
                >
                  {t('achievements.yourRank')}
                </Text>
              </View>
              <View style={themedStyles.userRankBadge}>
                <Text
                  style={[Typography.bodyBold, { color: theme.colors.primary }]}
                >
                  #{userRank.rank}
                </Text>
              </View>
            </View>
            <View style={themedStyles.userRankInfo}>
              <View style={themedStyles.userRankAvatar}>
                <Text style={[Typography.h3, { color: theme.colors.primary }]}>
                  {userRank.memberName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={themedStyles.userRankDetails}>
                <Text
                  style={[Typography.bodyBold, { color: theme.colors.text }]}
                >
                  {userRank.memberName}
                </Text>
                <View style={themedStyles.statsRow}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {userRank.achievements} {t('achievements.achievements')}
                  </Text>
                  <View style={themedStyles.dot} />
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {userRank.workouts} {t('achievements.workouts')}
                  </Text>
                </View>
              </View>
              <View style={themedStyles.userRankPoints}>
                <Text style={[Typography.h2, { color: theme.colors.primary }]}>
                  {formatPoints(userRank.points)}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('achievements.points')}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={themedStyles.leaderboardContainer}>
          <Text
            style={[
              Typography.h3,
              { color: theme.colors.text, marginBottom: theme.spacing.md },
            ]}
          >
            {t('achievements.topPerformers')}
          </Text>

          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => {
              const isTopThree = entry.rank <= 3;
              return (
                <View
                  key={entry.memberId}
                  style={[
                    themedStyles.leaderboardItem,
                    isTopThree && themedStyles.topThreeItem,
                  ]}
                >
                  <View style={themedStyles.rankContainer}>
                    <View style={themedStyles.rankIconContainer}>
                      {getRankIcon(entry.rank)}
                    </View>
                    <Text
                      style={[
                        Typography.bodyBold,
                        { color: getRankColor(entry.rank) },
                      ]}
                    >
                      #{entry.rank}
                    </Text>
                  </View>

                  <View style={themedStyles.memberInfo}>
                    <View style={themedStyles.memberAvatar}>
                      <Text
                        style={[
                          Typography.bodyBold,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {entry.memberName.charAt(0).toUpperCase()}
                      </Text>
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
                      <View style={themedStyles.statsRow}>
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {entry.achievements} {t('achievements.achievements')}
                        </Text>
                        <View style={themedStyles.dot} />
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {entry.workouts} {t('achievements.workouts')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={themedStyles.pointsContainer}>
                    <Text style={[Typography.h4, { color: theme.colors.text }]}>
                      {formatPoints(entry.points)}
                    </Text>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('achievements.points')}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={themedStyles.emptyContainer}>
              <Trophy size={64} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.h3,
                  { color: theme.colors.text, marginTop: theme.spacing.md },
                ]}
              >
                {t('achievements.noDataAvailable')}
              </Text>
              <Text
                style={[
                  Typography.bodyRegular,
                  {
                    color: theme.colors.textSecondary,
                    marginTop: theme.spacing.sm,
                    textAlign: 'center',
                  },
                ]}
              >
                {t('achievements.noLeaderboardData')}
              </Text>
            </View>
          )}
        </View>

        <View style={themedStyles.infoContainer}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            {t('achievements.pointsDescription')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    periodSelector: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    userRankCard: {
      margin: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      ...theme.shadows.md,
    },
    userRankHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    userRankTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    userRankBadge: {
      backgroundColor: theme.colors.primary + '15',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    userRankInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    userRankAvatar: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '30',
    },
    userRankDetails: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    userRankPoints: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.colors.textSecondary,
    },
    leaderboardContainer: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    topThreeItem: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.md,
    },
    rankContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      minWidth: 64,
    },
    rankIconContainer: {
      width: 28,
      height: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    memberDetails: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    pointsContainer: {
      alignItems: 'flex-end',
      gap: theme.spacing.xs,
      minWidth: 70,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.xl,
    },
    infoContainer: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
