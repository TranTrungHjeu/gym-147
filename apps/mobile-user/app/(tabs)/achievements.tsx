import AchievementCard from '@/components/AchievementCard';
import {
  achievementService,
  type Achievement,
  type AchievementSummary,
} from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Droplet,
  Dumbbell,
  Footprints,
  Medal,
  Sunrise,
  Trophy,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AchievementsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // State for API data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<AchievementSummary | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [achievementsResponse, summaryResponse] = await Promise.all([
        achievementService.getAchievements(),
        achievementService.getAchievementSummary(),
      ]);

      // Handle achievements data
      if (achievementsResponse.success && achievementsResponse.data) {
        setAchievements(achievementsResponse.data);
      }

      // Handle summary data
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }
    } catch (err: any) {
      console.error('Error loading achievements data:', err);
      setError(err.message || 'Failed to load achievements data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'sunrise':
        return <Sunrise size={24} color={theme.colors.primary} />;
      case 'calendar':
        return <Calendar size={24} color={theme.colors.primary} />;
      case 'dumbbell':
        return <Dumbbell size={24} color={theme.colors.primary} />;
      case 'drop':
        return <Droplet size={24} color={theme.colors.primary} />;
      case 'footprints':
        return <Footprints size={24} color={theme.colors.primary} />;
      default:
        return <Medal size={24} color={theme.colors.primary} />;
    }
  };

  const completedAchievements = achievements.filter(
    (achievement) => achievement.unlocked_at !== null
  );
  const inProgressAchievements = achievements.filter(
    (achievement) => achievement.unlocked_at === null
  );

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('achievements.loadingAchievements')}
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
            onPress={loadData}
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('achievements.title')}
        </Text>
        <TouchableOpacity
          style={[
            styles.leaderboardButton,
            { backgroundColor: theme.colors.primary + '20' },
          ]}
          onPress={() => router.push('/achievements/leaderboard')}
        >
          <Trophy size={20} color={theme.colors.primary} />
          <Text
            style={[
              styles.leaderboardButtonText,
              { color: theme.colors.primary },
            ]}
          >
            {t('achievements.leaderboard')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View
          style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {completedAchievements.length}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            {t('achievements.completed')}
          </Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {inProgressAchievements.length}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            {t('achievements.inProgress')}
          </Text>
        </View>
        <View
          style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {summary?.total_achievements || achievements.length}
          </Text>
          <Text
            style={[styles.statLabel, { color: theme.colors.textSecondary }]}
          >
            {t('achievements.totalAchievements')}
          </Text>
        </View>
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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('achievements.completed')}
          </Text>
          {completedAchievements.length > 0 ? (
            completedAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                title={achievement.title}
                description={achievement.description}
                completed={true}
                progress={100}
                icon={getAchievementIcon('medal')}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('achievements.noAchievements')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('achievements.inProgress')}
          </Text>
          {inProgressAchievements.length > 0 ? (
            inProgressAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                title={achievement.title}
                description={achievement.description}
                completed={false}
                progress={achievement.progress || 0}
                icon={getAchievementIcon('medal')}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('achievements.noAchievements')}
              </Text>
            </View>
          )}
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
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leaderboardButtonText: {
    ...Typography.captionMedium,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    ...Typography.numberSmall,
    marginBottom: 4,
  },
  statLabel: {
    ...Typography.bodySmallMedium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.h5,
    marginBottom: 16,
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
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    ...Typography.bodyRegular,
    textAlign: 'center',
  },
});
