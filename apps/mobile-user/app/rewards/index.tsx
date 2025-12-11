import { useAuth } from '@/contexts/AuthContext';
import { pointsService, rewardService, type Reward } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { AppEvents } from '@/utils/eventEmitter';
import { useRouter } from 'expo-router';
import { Coins, Gift, Sparkles, Tag, History } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import PointsEarnedModal from '@/components/PointsEarnedModal';
import type { PointsTransaction } from '@/services/member/points.service';

export default function RewardsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [recommendedRewards, setRecommendedRewards] = useState<Reward[]>([]);
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsModalData, setPointsModalData] = useState<{
    points: number;
    source?: string;
    description?: string;
    newBalance?: number;
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pointsHistory, setPointsHistory] = useState<PointsTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const categories = [
    'DISCOUNT',
    'FREE_CLASS',
    'MERCHANDISE',
    'MEMBERSHIP_EXTENSION',
    'PREMIUM_FEATURE',
    'OTHER',
  ];

  const themedStyles = styles(theme);

  useEffect(() => {
    loadData();
  }, [member?.id, selectedCategory]);

  // Listen for socket events to refresh data
  useEffect(() => {
    const handleRewardRedeemed = (data: any) => {
      console.log('[GIFT] Reward redeemed event received:', data);
      // Refresh rewards and points balance
      loadData();
    };

    const handleRewardRefunded = (data: any) => {
      console.log('[REWARD] Reward refunded event received:', data);
      loadData();
    };

    const handlePointsUpdated = (data: any) => {
      console.log('[POINTS] Points updated event received:', data);
      // Update points balance immediately
      if (data?.new_balance !== undefined) {
        setPointsBalance(data.new_balance);
      } else {
        // Refresh balance
        if (member?.id) {
          pointsService.getBalance(member.id).then((response) => {
            if (response.success && response.data) {
              setPointsBalance(response.data.current);
            }
          });
        }
      }

      // Show modal if points were earned (positive change)
      if (data?.points_earned && data.points_earned > 0) {
        setPointsModalData({
          points: data.points_earned,
          source: data.source,
          description: data.description,
          newBalance: data.new_balance,
        });
        setShowPointsModal(true);
      }
    };

    const unsubscribe1 = AppEvents.on('reward:redeemed', handleRewardRedeemed);
    const unsubscribe2 = AppEvents.on('reward:refunded', handleRewardRefunded);
    const unsubscribe3 = AppEvents.on('points:updated', handlePointsUpdated);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, [member?.id]);

  const loadData = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      const [rewardsResponse, pointsResponse, recommendationsResponse] =
        await Promise.all([
          rewardService.getRewards(
            selectedCategory ? { category: selectedCategory as any } : {}
          ),
          pointsService.getBalance(member.id),
          rewardService.getRecommendedRewards(member.id),
        ]);

      if (rewardsResponse.success && rewardsResponse.data) {
        setRewards(rewardsResponse.data);
      }

      if (pointsResponse.success && pointsResponse.data) {
        setPointsBalance(pointsResponse.data.current);
      }

      if (recommendationsResponse.success && recommendationsResponse.data) {
        setRecommendedRewards(recommendationsResponse.data);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleViewReward = (rewardId: string) => {
    router.push(`/rewards/${rewardId}`);
  };

  const loadPointsHistory = async () => {
    if (!member?.id) return;

    try {
      setLoadingHistory(true);
      const response = await pointsService.getHistory(member.id, {
        limit: 50,
      });

      if (response.success && response.data) {
        setPointsHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading points history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory && member?.id) {
      loadPointsHistory();
    }
  }, [showHistory, member?.id]);

  const getCategoryLabel = (category: string) => {
    return t(`rewards.category.${category}` as any) || category;
  };

  if (loading && !refreshing) {
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
      {/* Points Header */}
      <View style={themedStyles.header}>
        <View style={themedStyles.pointsHeader}>
          <View style={themedStyles.pointsIconContainer}>
            <Coins size={32} color="#FFD700" />
            <Sparkles
              size={18}
              color="#FFD700"
              style={themedStyles.sparkleIcon}
            />
          </View>
          <View style={themedStyles.pointsContent}>
            <Text style={themedStyles.pointsLabel}>{t('rewards.pointsBalance')}</Text>
            <Text style={themedStyles.pointsValue}>
              {pointsBalance.toLocaleString()} {t('rewards.points')}
            </Text>
          </View>
          <TouchableOpacity
            style={themedStyles.historyButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <History size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Points History Section */}
      {showHistory && (
        <View style={themedStyles.historySection}>
          <View style={themedStyles.historyHeader}>
            <Text style={themedStyles.historyTitle}>
              {t('points.history.title') || 'Lịch sử điểm'}
            </Text>
            {loadingHistory ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
          </View>
          {pointsHistory.length > 0 ? (
            <FlatList
              data={pointsHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={themedStyles.historyItem}>
                  <View style={themedStyles.historyItemLeft}>
                    <View style={themedStyles.historyItemIcon}>
                      {item.type === 'EARNED' ? (
                        <Coins size={20} color="#FFD700" />
                      ) : (
                        <Coins size={20} color={theme.colors.error} />
                      )}
                    </View>
                    <View style={themedStyles.historyItemContent}>
                      <Text style={themedStyles.historyItemDescription}>
                        {item.description || t('points.history.noDescription')}
                      </Text>
                      <Text style={themedStyles.historyItemDate}>
                        {new Date(item.created_at).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={themedStyles.historyItemRight}>
                    <Text
                      style={[
                        themedStyles.historyItemPoints,
                        item.type === 'EARNED'
                          ? { color: '#4CAF50' }
                          : { color: theme.colors.error },
                      ]}
                    >
                      {item.type === 'EARNED' ? '+' : '-'}
                      {Math.abs(item.points).toLocaleString()}
                    </Text>
                    <Text style={themedStyles.historyItemBalance}>
                      {t('points.history.balance') || 'Số dư'}: {item.balance_after.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              style={themedStyles.historyList}
              contentContainerStyle={themedStyles.historyListContent}
            />
          ) : (
            <View style={themedStyles.historyEmpty}>
              <History size={48} color={theme.colors.textSecondary} />
              <Text style={themedStyles.historyEmptyText}>
                {t('points.history.empty') || 'Chưa có lịch sử điểm'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Category Filter */}
      <View style={themedStyles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={themedStyles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              themedStyles.categoryChip,
              !selectedCategory && themedStyles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                themedStyles.categoryText,
                !selectedCategory && themedStyles.categoryTextActive,
              ]}
            >
              {t('rewards.allCategories')}
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                themedStyles.categoryChip,
                selectedCategory === category &&
                  themedStyles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  themedStyles.categoryText,
                  selectedCategory === category &&
                    themedStyles.categoryTextActive,
                ]}
              >
                {getCategoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Recommended Rewards Section */}
        {recommendedRewards.length > 0 && !selectedCategory && (
          <View style={themedStyles.section}>
            <View style={themedStyles.sectionHeader}>
              <Sparkles size={20} color={theme.colors.primary} />
              <Text
                style={[
                  themedStyles.sectionTitle,
                  { color: theme.colors.primary },
                ]}
              >
                {t('rewards.recommendedForYou')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={themedStyles.recommendedList}
            >
              {recommendedRewards.map((reward) => (
                <TouchableOpacity
                  key={reward.id}
                  style={themedStyles.recommendedCard}
                  onPress={() => handleViewReward(reward.id)}
                >
                  {reward.image_url ? (
                    <Image
                      source={{ uri: reward.image_url }}
                      style={themedStyles.rewardImage}
                    />
                  ) : (
                    <View style={themedStyles.rewardImagePlaceholder}>
                      <Gift size={32} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={themedStyles.rewardContent}>
                    <Text style={themedStyles.rewardTitle} numberOfLines={2}>
                      {reward.title}
                    </Text>
                    <View style={themedStyles.rewardFooter}>
                      <View style={themedStyles.pointsBadge}>
                        <Coins size={14} color="#FFD700" />
                        <Text style={themedStyles.pointsCost}>
                          {reward.points_cost}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Rewards Section */}
        {rewards.length > 0 ? (
          <View style={themedStyles.rewardsList}>
            {recommendedRewards.length > 0 && !selectedCategory && (
              <View style={themedStyles.sectionHeader}>
                <Tag size={20} color={theme.colors.text} />
                <Text style={themedStyles.sectionTitle}>
                  {t('rewards.availableRewards')}
                </Text>
              </View>
            )}
            <View style={themedStyles.rewardsGrid}>
              {rewards
                .filter(
                  (reward) =>
                    !recommendedRewards.find((r) => r.id === reward.id)
                )
                .map((reward) => (
                  <TouchableOpacity
                    key={reward.id}
                    style={themedStyles.rewardCard}
                    onPress={() => handleViewReward(reward.id)}
                  >
                    {reward.image_url ? (
                      <Image
                        source={{ uri: reward.image_url }}
                        style={themedStyles.rewardImage}
                      />
                    ) : (
                      <View style={themedStyles.rewardImagePlaceholder}>
                        <Gift size={40} color={theme.colors.primary} />
                      </View>
                    )}

                    <View style={themedStyles.rewardContent}>
                      <View style={themedStyles.rewardHeader}>
                        <Text
                          style={themedStyles.rewardTitle}
                          numberOfLines={2}
                        >
                          {reward.title}
                        </Text>
                        <Tag size={16} color={theme.colors.textSecondary} />
                      </View>

                      <Text
                        style={themedStyles.rewardDescription}
                        numberOfLines={2}
                      >
                        {reward.description}
                      </Text>

                      <View style={themedStyles.rewardFooter}>
                        <View style={themedStyles.pointsBadge}>
                          <Coins size={14} color="#FFD700" />
                          <Text style={themedStyles.pointsCost}>
                            {reward.points_cost}
                          </Text>
                        </View>
                        {reward.discount_percent && (
                          <Text style={themedStyles.discountBadge}>
                            -{reward.discount_percent}%
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        ) : (
          <View style={themedStyles.emptyContainer}>
            <Gift size={64} color={theme.colors.textSecondary} />
            <Text style={themedStyles.emptyText}>{t('rewards.noRewards')}</Text>
            <Text style={[themedStyles.emptySubtext, { color: theme.colors.textSecondary }]}>
              {t('rewards.noRewardsMessage')}
            </Text>
          </View>
        )}

        {/* Redemption History Link */}
        <TouchableOpacity
          style={themedStyles.historyButton}
          onPress={() => router.push('/rewards/history')}
        >
          <Text style={themedStyles.historyButtonText}>
            {t('rewards.history')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Points Earned Modal */}
      <PointsEarnedModal
        visible={showPointsModal}
        onClose={() => {
          setShowPointsModal(false);
          setPointsModalData(null);
        }}
        points={pointsModalData?.points || 0}
        source={pointsModalData?.source}
        description={pointsModalData?.description}
        newBalance={pointsModalData?.newBalance}
      />
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
      backgroundColor: theme.colors.card,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    pointsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    pointsIconContainer: {
      position: 'relative',
      marginRight: 12,
    },
    sparkleIcon: {
      position: 'absolute',
      top: -6,
      right: -6,
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
      fontSize: 32,
      fontFamily: 'SpaceGrotesk-Bold',
      color: '#FFD700',
      fontWeight: '700',
    },
    categoryContainer: {
      backgroundColor: theme.colors.card,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    categoryScroll: {
      paddingHorizontal: 16,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    categoryText: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'Inter-Medium',
    },
    categoryTextActive: {
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
    },
    scrollView: {
      flex: 1,
    },
    rewardsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 16,
      gap: 12,
    },
    rewardCard: {
      width: '48%',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    rewardImage: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.background,
    },
    rewardImagePlaceholder: {
      width: '100%',
      height: 120,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rewardContent: {
      padding: 12,
    },
    rewardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    rewardTitle: {
      ...Typography.body,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
      flex: 1,
      marginRight: 4,
    },
    rewardDescription: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    rewardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pointsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FFF9E6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    pointsCost: {
      ...Typography.caption,
      color: '#B8860B',
      fontFamily: 'Inter-SemiBold',
    },
    discountBadge: {
      ...Typography.caption,
      color: '#4CAF50',
      fontFamily: 'Inter-SemiBold',
      backgroundColor: '#E8F5E9',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    emptyContainer: {
      padding: 48,
      alignItems: 'center',
    },
    emptyText: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    emptySubtext: {
      ...Typography.bodySmall,
      marginTop: 8,
      textAlign: 'center',
    },
    historyButton: {
      padding: 8,
      marginLeft: 12,
    },
    historyButtonText: {
      ...Typography.body,
      color: '#FFFFFF',
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    historySection: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      maxHeight: 400,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyTitle: {
      ...Typography.h6,
      color: theme.colors.text,
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
    historyList: {
      maxHeight: 300,
    },
    historyListContent: {
      padding: 16,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      marginBottom: 8,
    },
    historyItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    historyItemIcon: {
      marginRight: 12,
    },
    historyItemContent: {
      flex: 1,
    },
    historyItemDescription: {
      ...Typography.body,
      color: theme.colors.text,
      marginBottom: 4,
    },
    historyItemDate: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
    },
    historyItemRight: {
      alignItems: 'flex-end',
    },
    historyItemPoints: {
      ...Typography.h6,
      fontFamily: 'SpaceGrotesk-Bold',
      marginBottom: 4,
    },
    historyItemBalance: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
    },
    historyEmpty: {
      padding: 48,
      alignItems: 'center',
    },
    historyEmptyText: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    redemptionHistoryButton: {
      margin: 16,
      padding: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
    },
  });
