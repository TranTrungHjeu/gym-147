import { useAuth } from '@/contexts/AuthContext';
import {
  challengeService,
  type Challenge,
  type ChallengeProgress,
} from '@/services/member/challenge.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, CheckCircle, Clock, Target, Trophy, Zap } from 'lucide-react-native';
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

export default function ChallengesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available');
  const [availableChallenges, setAvailableChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<ChallengeProgress[]>([]);

  const themedStyles = styles(theme);

  useEffect(() => {
    loadData();
  }, [member?.id, activeTab]);

  const loadData = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);

      if (activeTab === 'available') {
        const response = await challengeService.getChallenges({ is_active: true });
        if (response.success && response.data) {
          setAvailableChallenges(response.data);
        }
      } else {
        const response = await challengeService.getMemberChallenges(member.id, 'all');
        if (response.success && response.data) {
          setMyChallenges(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!member?.id) return;

    try {
      const response = await challengeService.joinChallenge(challengeId, member.id);
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

  const handleViewChallenge = (challengeId: string) => {
    router.push(`/challenges/${challengeId}`);
  };

  const getChallengeIcon = (category: string) => {
    switch (category) {
      case 'ATTENDANCE':
        return <Calendar size={24} color={theme.colors.primary} />;
      case 'FITNESS':
        return <Zap size={24} color={theme.colors.primary} />;
      default:
        return <Target size={24} color={theme.colors.primary} />;
    }
  };

  const getProgressPercentage = (progress: ChallengeProgress) => {
    return Math.min((progress.current_value / progress.target_value) * 100, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[themedStyles.container, themedStyles.centerContent]}>
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
          {t('challenges.title')}
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={themedStyles.tabContainer}>
        <TouchableOpacity
          style={[themedStyles.tab, activeTab === 'available' && themedStyles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[themedStyles.tabText, activeTab === 'available' && themedStyles.activeTabText]}>
            Có sẵn
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[themedStyles.tab, activeTab === 'my' && themedStyles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[themedStyles.tabText, activeTab === 'my' && themedStyles.activeTabText]}>
            Của tôi
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'available' ? (
          <>
            {availableChallenges.length > 0 ? (
              availableChallenges.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={themedStyles.challengeCard}
                  onPress={() => handleViewChallenge(challenge.id)}
                >
                  <View style={themedStyles.challengeHeader}>
                    {getChallengeIcon(challenge.category)}
                    <View style={themedStyles.challengeTitleContainer}>
                      <Text style={themedStyles.challengeTitle}>{challenge.title}</Text>
                      <Text style={themedStyles.challengeType}>{challenge.type}</Text>
                    </View>
                  </View>

                  <Text style={themedStyles.challengeDescription}>{challenge.description}</Text>

                  <View style={themedStyles.challengeTarget}>
                    <Target size={16} color={theme.colors.textSecondary} />
                    <Text style={themedStyles.targetText}>
                      Mục tiêu: {challenge.target_value} {challenge.target_unit || 'điểm'}
                    </Text>
                  </View>

                  <View style={themedStyles.challengeFooter}>
                    <View style={themedStyles.challengeInfo}>
                      <Calendar size={14} color={theme.colors.textSecondary} />
                      <Text style={themedStyles.challengeDate}>
                        {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                      </Text>
                    </View>
                    {challenge.reward_points > 0 && (
                      <View style={themedStyles.rewardBadge}>
                        <Trophy size={14} color="#FFD700" />
                        <Text style={themedStyles.rewardText}>{challenge.reward_points} điểm</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={themedStyles.joinButton}
                    onPress={() => handleJoinChallenge(challenge.id)}
                  >
                    <Text style={themedStyles.joinButtonText}>Tham gia</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={themedStyles.emptyContainer}>
                <Text style={themedStyles.emptyText}>Không có thử thách nào</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {myChallenges.length > 0 ? (
              myChallenges.map((progress) => {
                const challenge = progress.challenge;
                if (!challenge) return null;

                const progressPercentage = getProgressPercentage(progress);

                return (
                  <TouchableOpacity
                    key={progress.id}
                    style={themedStyles.challengeCard}
                    onPress={() => handleViewChallenge(challenge.id)}
                  >
                    <View style={themedStyles.challengeHeader}>
                      {getChallengeIcon(challenge.category)}
                      <View style={themedStyles.challengeTitleContainer}>
                        <Text style={themedStyles.challengeTitle}>{challenge.title}</Text>
                        {progress.completed && (
                          <View style={themedStyles.completedBadge}>
                            <CheckCircle size={14} color="#4CAF50" />
                            <Text style={themedStyles.completedText}>Hoàn thành</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <Text style={themedStyles.challengeDescription}>{challenge.description}</Text>

                    {/* Progress Bar */}
                    <View style={themedStyles.progressContainer}>
                      <View style={themedStyles.progressBar}>
                        <View
                          style={[
                            themedStyles.progressFill,
                            { width: `${progressPercentage}%`, backgroundColor: progress.completed ? '#4CAF50' : theme.colors.primary },
                          ]}
                        />
                      </View>
                      <Text style={themedStyles.progressText}>
                        {progress.current_value} / {progress.target_value} {challenge.target_unit || 'điểm'}
                      </Text>
                    </View>

                    <View style={themedStyles.challengeFooter}>
                      <View style={themedStyles.challengeInfo}>
                        <Clock size={14} color={theme.colors.textSecondary} />
                        <Text style={themedStyles.challengeDate}>
                          {formatDate(challenge.end_date)}
                        </Text>
                      </View>
                      {challenge.reward_points > 0 && (
                        <View style={themedStyles.rewardBadge}>
                          <Trophy size={14} color="#FFD700" />
                          <Text style={themedStyles.rewardText}>{challenge.reward_points} điểm</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={themedStyles.emptyContainer}>
                <Text style={themedStyles.emptyText}>Bạn chưa tham gia thử thách nào</Text>
              </View>
            )}
          </>
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
    tabContainer: {
      flexDirection: 'row',
      margin: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      fontFamily: 'Inter-Medium',
    },
    activeTabText: {
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
    },
    scrollView: {
      flex: 1,
    },
    challengeCard: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    challengeTitleContainer: {
      flex: 1,
    },
    challengeTitle: {
      ...Typography.heading4,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    challengeType: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono-Regular',
      marginTop: 2,
    },
    challengeDescription: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    challengeTarget: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    targetText: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'Inter-SemiBold',
    },
    progressContainer: {
      marginBottom: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono-Regular',
    },
    challengeFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    challengeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    challengeDate: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      fontFamily: 'Inter-Regular',
    },
    rewardBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FFF9E6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    rewardText: {
      ...Typography.caption,
      color: '#B8860B',
      fontFamily: 'Inter-SemiBold',
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    completedText: {
      ...Typography.caption,
      color: '#4CAF50',
      fontFamily: 'Inter-SemiBold',
      fontSize: 10,
    },
    joinButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    joinButtonText: {
      ...Typography.body,
      color: '#FFFFFF',
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    emptyContainer: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

