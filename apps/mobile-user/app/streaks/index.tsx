import { useAuth } from '@/contexts/AuthContext';
import {
  streakService,
  type DailyStreak,
  type StreakLeaderboardEntry,
} from '@/services/member/streak.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Flame, TrendingUp, Trophy } from 'lucide-react-native';
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

export default function StreaksScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [topStreaks, setTopStreaks] = useState<StreakLeaderboardEntry[]>([]);

  const themedStyles = styles(theme);

  useEffect(() => {
    loadData();
  }, [member?.id]);

  const loadData = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      const [streakResponse, topStreaksResponse] = await Promise.all([
        streakService.getStreak(member.id),
        streakService.getLeaderboard({ limit: 10, type: 'current' }),
      ]);

      if (streakResponse.success && streakResponse.data) {
        setStreak(streakResponse.data);
      }

      if (topStreaksResponse.success && topStreaksResponse.data) {
        setTopStreaks(topStreaksResponse.data);
      }
    } catch (error) {
      console.error('Error loading streaks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStreakMessage = (days: number) => {
    if (days === 0) return 'Bắt đầu streak của bạn!';
    if (days < 7) return `Tiếp tục phấn đấu! ${days} ngày liên tiếp`;
    if (days < 30) return `Tuyệt vời! ${days} ngày streak`;
    if (days < 90) return `Ấn tượng! ${days} ngày streak`;
    return `Xuất sắc! ${days} ngày streak`;
  };

  const getStreakColor = (days: number) => {
    if (days === 0) return theme.colors.textSecondary;
    if (days < 7) return '#FFA500';
    if (days < 30) return '#FF6B6B';
    if (days < 90) return '#4ECDC4';
    return '#95E1D3';
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[themedStyles.container, themedStyles.centerContent]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={themedStyles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {t('streaks.title')}
        </Text>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Current Streak Card */}
        {streak && (
          <View style={themedStyles.streakCard}>
            <View style={themedStyles.streakHeader}>
              <Flame size={32} color={getStreakColor(streak.current_streak)} />
              <Text style={themedStyles.streakTitle}>Streak hiện tại</Text>
            </View>

            <View style={themedStyles.streakNumberContainer}>
              <Text
                style={[
                  themedStyles.streakNumber,
                  { color: getStreakColor(streak.current_streak) },
                ]}
              >
                {streak.current_streak}
              </Text>
              <Text style={themedStyles.streakLabel}>ngày</Text>
            </View>

            <Text style={themedStyles.streakMessage}>
              {getStreakMessage(streak.current_streak)}
            </Text>

            <View style={themedStyles.streakStats}>
              <View style={themedStyles.statItem}>
                <Trophy size={20} color={theme.colors.primary} />
                <Text style={themedStyles.statLabel}>Kỷ lục</Text>
                <Text style={themedStyles.statValue}>
                  {streak.longest_streak} ngày
                </Text>
              </View>
            </View>

            {streak.last_activity_date && (
              <Text style={themedStyles.lastActivity}>
                Hoạt động cuối:{' '}
                {new Date(streak.last_activity_date).toLocaleDateString(
                  'vi-VN'
                )}
              </Text>
            )}
          </View>
        )}

        {/* Top Streaks Leaderboard */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <TrendingUp size={24} color={theme.colors.primary} />
            <Text style={themedStyles.sectionTitle}>Bảng xếp hạng</Text>
          </View>

          {topStreaks.length > 0 ? (
            <View style={themedStyles.leaderboard}>
              {topStreaks.map((entry, index) => (
                <View
                  key={entry.memberId || index}
                  style={themedStyles.leaderboardItem}
                >
                  <View style={themedStyles.rankContainer}>
                    {index === 0 && <Trophy size={20} color="#FFD700" />}
                    {index === 1 && <Trophy size={20} color="#C0C0C0" />}
                    {index === 2 && <Trophy size={20} color="#CD7F32" />}
                    {index > 2 && (
                      <Text
                        style={[
                          themedStyles.rankNumber,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={themedStyles.memberInfo}>
                    <Text style={themedStyles.memberName}>
                      {entry.memberName || 'Unknown'}
                    </Text>
                  </View>

                  <View style={themedStyles.streakInfo}>
                    <Flame
                      size={16}
                      color={getStreakColor(entry.currentStreak)}
                    />
                    <Text
                      style={[
                        themedStyles.streakValue,
                        { color: getStreakColor(entry.currentStreak) },
                      ]}
                    >
                      {entry.currentStreak}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={themedStyles.emptyText}>Chưa có dữ liệu streak</Text>
          )}
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
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'transparent',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    scrollView: {
      flex: 1,
    },
    streakCard: {
      backgroundColor: theme.colors.card,
      margin: 16,
      padding: 24,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    streakHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    streakTitle: {
      ...Typography.heading3,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    streakNumberContainer: {
      alignItems: 'center',
      marginVertical: 16,
    },
    streakNumber: {
      fontSize: 64,
      fontFamily: 'SpaceGrotesk-Bold',
      fontWeight: '700',
    },
    streakLabel: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    streakMessage: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    streakStats: {
      width: '100%',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
    },
    statLabel: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    statValue: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
      marginLeft: 4,
    },
    lastActivity: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 12,
    },
    section: {
      margin: 16,
      marginTop: 0,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      ...Typography.heading4,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    leaderboard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 12,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rankContainer: {
      width: 32,
      alignItems: 'center',
      marginRight: 12,
    },
    rankNumber: {
      ...Typography.body,
      fontFamily: 'JetBrainsMono-Regular',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    memberNumber: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono-Regular',
      marginTop: 2,
    },
    streakInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    streakValue: {
      ...Typography.body,
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontWeight: '600',
    },
    emptyText: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      padding: 24,
    },
  });
