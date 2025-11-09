import { useAuth } from '@/contexts/AuthContext';
import {
  challengeService,
  type Challenge,
  type ChallengeProgress,
} from '@/services/member/challenge.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, CheckCircle, Clock, Target, Trophy, Users, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [myProgress, setMyProgress] = useState<ChallengeProgress | null>(null);

  const themedStyles = styles(theme);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, member?.id]);

  const loadData = async () => {
    if (!id || !member?.id) return;

    try {
      setLoading(true);
      const [challengeResponse, myChallengesResponse] = await Promise.all([
        challengeService.getChallengeById(id),
        challengeService.getMemberChallenges(member.id, 'all'),
      ]);

      if (challengeResponse.success && challengeResponse.data) {
        setChallenge(challengeResponse.data);
      }

      if (myChallengesResponse.success && myChallengesResponse.data) {
        const progress = myChallengesResponse.data.find((p) => p.challenge_id === id);
        setMyProgress(progress || null);
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleJoinChallenge = async () => {
    if (!member?.id || !id) return;

    try {
      const response = await challengeService.joinChallenge(id, member.id);
      if (response.success) {
        Alert.alert('Thành công', 'Đã tham gia thử thách!');
        loadData();
      } else {
        Alert.alert('Lỗi', response.error || 'Không thể tham gia thử thách');
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tham gia thử thách');
    }
  };

  const getProgressPercentage = () => {
    if (!myProgress) return 0;
    return Math.min((myProgress.current_value / myProgress.target_value) * 100, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getChallengeIcon = (category: string) => {
    switch (category) {
      case 'ATTENDANCE':
        return <Calendar size={32} color={theme.colors.primary} />;
      case 'FITNESS':
        return <Zap size={32} color={theme.colors.primary} />;
      default:
        return <Target size={32} color={theme.colors.primary} />;
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[themedStyles.container, themedStyles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!challenge) {
    return (
      <SafeAreaView style={[themedStyles.container, themedStyles.centerContent]}>
        <Text style={themedStyles.errorText}>Không tìm thấy thử thách</Text>
        <TouchableOpacity style={themedStyles.backButton} onPress={() => router.back()}>
          <Text style={themedStyles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progressPercentage = getProgressPercentage();
  const isCompleted = myProgress?.completed || false;
  const isJoined = !!myProgress;

  return (
    <SafeAreaView style={themedStyles.container}>
      <ScrollView
        style={themedStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Challenge Header */}
        <View style={themedStyles.header}>
          <View style={themedStyles.iconContainer}>{getChallengeIcon(challenge.category)}</View>
          <Text style={themedStyles.title}>{challenge.title}</Text>
          <Text style={themedStyles.type}>{challenge.type}</Text>
        </View>

        {/* Challenge Description */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.description}>{challenge.description}</Text>
        </View>

        {/* Challenge Info */}
        <View style={themedStyles.infoSection}>
          <View style={themedStyles.infoItem}>
            <Target size={20} color={theme.colors.primary} />
            <View style={themedStyles.infoContent}>
              <Text style={themedStyles.infoLabel}>Mục tiêu</Text>
              <Text style={themedStyles.infoValue}>
                {challenge.target_value} {challenge.target_unit || 'điểm'}
              </Text>
            </View>
          </View>

          <View style={themedStyles.infoItem}>
            <Calendar size={20} color={theme.colors.primary} />
            <View style={themedStyles.infoContent}>
              <Text style={themedStyles.infoLabel}>Thời gian</Text>
              <Text style={themedStyles.infoValue}>
                {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
              </Text>
            </View>
          </View>

          {challenge.reward_points > 0 && (
            <View style={themedStyles.infoItem}>
              <Trophy size={20} color="#FFD700" />
              <View style={themedStyles.infoContent}>
                <Text style={themedStyles.infoLabel}>Phần thưởng</Text>
                <Text style={[themedStyles.infoValue, { color: '#FFD700' }]}>
                  {challenge.reward_points} điểm
                </Text>
              </View>
            </View>
          )}

          {challenge._count && (
            <View style={themedStyles.infoItem}>
              <Users size={20} color={theme.colors.primary} />
              <View style={themedStyles.infoContent}>
                <Text style={themedStyles.infoLabel}>Người tham gia</Text>
                <Text style={themedStyles.infoValue}>{challenge._count.progress} người</Text>
              </View>
            </View>
          )}
        </View>

        {/* My Progress */}
        {isJoined && (
          <View style={themedStyles.section}>
            <View style={themedStyles.progressHeader}>
              <Text style={themedStyles.progressTitle}>Tiến độ của bạn</Text>
              {isCompleted && (
                <View style={themedStyles.completedBadge}>
                  <CheckCircle size={16} color="#4CAF50" />
                  <Text style={themedStyles.completedText}>Hoàn thành</Text>
                </View>
              )}
            </View>

            <View style={themedStyles.progressBarContainer}>
              <View style={themedStyles.progressBar}>
                <View
                  style={[
                    themedStyles.progressFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: isCompleted ? '#4CAF50' : theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={themedStyles.progressText}>
                {myProgress?.current_value || 0} / {challenge.target_value} {challenge.target_unit || 'điểm'}
              </Text>
            </View>

            {myProgress?.completed_at && (
              <Text style={themedStyles.completedDate}>
                Hoàn thành: {formatDate(myProgress.completed_at)}
              </Text>
            )}
          </View>
        )}

        {/* Leaderboard */}
        {challenge.progress && challenge.progress.length > 0 && (
          <View style={themedStyles.section}>
            <Text style={themedStyles.sectionTitle}>Bảng xếp hạng</Text>
            <View style={themedStyles.leaderboard}>
              {challenge.progress
                .sort((a, b) => b.current_value - a.current_value)
                .slice(0, 10)
                .map((entry, index) => (
                  <View key={entry.member_id} style={themedStyles.leaderboardItem}>
                    <View style={themedStyles.rankContainer}>
                      {index === 0 && <Trophy size={20} color="#FFD700" />}
                      {index === 1 && <Trophy size={20} color="#C0C0C0" />}
                      {index === 2 && <Trophy size={20} color="#CD7F32" />}
                      {index > 2 && (
                        <Text style={themedStyles.rankNumber}>{index + 1}</Text>
                      )}
                    </View>
                    <Text style={themedStyles.leaderboardName}>
                      {entry.member?.full_name || 'Member'}
                    </Text>
                    <Text style={themedStyles.leaderboardValue}>
                      {entry.current_value} / {entry.target_value}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Join Button */}
        {!isJoined && (
          <View style={themedStyles.buttonContainer}>
            <TouchableOpacity style={themedStyles.joinButton} onPress={handleJoinChallenge}>
              <Text style={themedStyles.joinButtonText}>Tham gia thử thách</Text>
            </TouchableOpacity>
          </View>
        )}
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
    scrollView: {
      flex: 1,
    },
    header: {
      alignItems: 'center',
      padding: 24,
      backgroundColor: theme.colors.card,
      marginBottom: 16,
    },
    iconContainer: {
      marginBottom: 12,
    },
    title: {
      ...Typography.heading2,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-Bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    type: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono-Regular',
    },
    section: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
    },
    description: {
      ...Typography.body,
      color: theme.colors.text,
      lineHeight: 24,
    },
    infoSection: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
    },
    infoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressTitle: {
      ...Typography.heading4,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    completedText: {
      ...Typography.caption,
      color: '#4CAF50',
      fontFamily: 'Inter-SemiBold',
    },
    progressBarContainer: {
      marginBottom: 8,
    },
    progressBar: {
      height: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
    },
    progressText: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'JetBrainsMono-Regular',
      textAlign: 'center',
    },
    completedDate: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    sectionTitle: {
      ...Typography.heading4,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
      marginBottom: 12,
    },
    leaderboard: {
      gap: 8,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
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
    leaderboardName: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
      flex: 1,
    },
    leaderboardValue: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono-Regular',
    },
    buttonContainer: {
      margin: 16,
      marginBottom: 32,
    },
    joinButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    joinButtonText: {
      ...Typography.heading4,
      color: '#FFFFFF',
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    errorText: {
      ...Typography.body,
      color: theme.colors.error,
      marginBottom: 16,
    },
    backButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    backButtonText: {
      ...Typography.body,
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
    },
  });

