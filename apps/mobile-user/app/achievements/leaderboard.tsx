import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { achievementService } from '@/services/member/achievement.service';
import type { LeaderboardEntry } from '@/types/achievementTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Award, Crown, Medal, Star, Trophy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  const periods = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'All Time', value: 'alltime' },
  ];

  const loadLeaderboard = async () => {
    if (!user?.id) return;

    try {
      const [leaderboardData, userRankData] = await Promise.all([
        achievementService.getLeaderboard(selectedPeriod),
        achievementService.getUserRank(user.id, selectedPeriod),
      ]);

      setLeaderboard(leaderboardData);
      setUserRank(userRankData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      Alert.alert('Error', 'Failed to load leaderboard');
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
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[Typography.body, { color: theme.colors.textSecondary }]}
          >
            Loading leaderboard...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Leaderboard
        </Text>
        <View style={styles.periodSelector}>
          <Picker
            selectedValue={selectedPeriod}
            onValueChange={handlePeriodChange}
            items={periods}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {userRank && (
          <View
            style={[
              styles.userRankCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <View style={styles.userRankHeader}>
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                Your Rank
              </Text>
              <View style={styles.userRankBadge}>
                <Text
                  style={[Typography.caption, { color: theme.colors.primary }]}
                >
                  #{userRank.rank}
                </Text>
              </View>
            </View>
            <View style={styles.userRankInfo}>
              <View style={styles.userRankAvatar}>
                <Text style={[Typography.h4, { color: theme.colors.text }]}>
                  {userRank.memberName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userRankDetails}>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  {userRank.memberName}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {formatPoints(userRank.points)} points
                </Text>
              </View>
              <View style={styles.userRankStats}>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {userRank.achievements} achievements
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {userRank.workouts} workouts
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.leaderboardContainer}>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            Top Performers
          </Text>

          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <View
                key={entry.memberId}
                style={[
                  styles.leaderboardItem,
                  { borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.rankContainer}>
                  {getRankIcon(entry.rank)}
                  <Text
                    style={[Typography.h4, { color: getRankColor(entry.rank) }]}
                  >
                    #{entry.rank}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: theme.colors.primary + '20' },
                    ]}
                  >
                    <Text
                      style={[Typography.h4, { color: theme.colors.primary }]}
                    >
                      {entry.memberName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text
                      style={[Typography.body, { color: theme.colors.text }]}
                    >
                      {entry.memberName}
                    </Text>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {entry.achievements} achievements • {entry.workouts}{' '}
                      workouts
                    </Text>
                  </View>
                </View>

                <View style={styles.pointsContainer}>
                  <Text style={[Typography.h4, { color: theme.colors.text }]}>
                    {formatPoints(entry.points)}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    points
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Trophy size={48} color={theme.colors.textSecondary} />
              <Text style={[Typography.h3, { color: theme.colors.text }]}>
                No Data Available
              </Text>
              <Text
                style={[Typography.body, { color: theme.colors.textSecondary }]}
              >
                No leaderboard data for this period
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text
            style={[Typography.caption, { color: theme.colors.textSecondary }]}
          >
            Points are earned by completing workouts, achieving goals, and
            maintaining streaks. The leaderboard is updated in real-time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  periodSelector: {
    minWidth: 120,
  },
  scrollView: {
    flex: 1,
  },
  userRankCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  userRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userRankBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRankAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userRankDetails: {
    flex: 1,
  },
  userRankStats: {
    alignItems: 'flex-end',
  },
  leaderboardContainer: {
    margin: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  infoContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
});
