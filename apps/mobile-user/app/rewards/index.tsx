import { useAuth } from '@/contexts/AuthContext';
import { pointsService, rewardService, type Reward } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Coins, Gift, Sparkles, Tag } from 'lucide-react-native';
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

export default function RewardsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = ['DISCOUNT', 'FREE_CLASS', 'MERCHANDISE', 'MEMBERSHIP_EXTENSION', 'PREMIUM_FEATURE', 'OTHER'];

  const themedStyles = styles(theme);

  useEffect(() => {
    loadData();
  }, [member?.id, selectedCategory]);

  const loadData = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      const [rewardsResponse, pointsResponse] = await Promise.all([
        rewardService.getRewards(selectedCategory ? { category: selectedCategory as any } : {}),
        pointsService.getBalance(member.id),
      ]);

      if (rewardsResponse.success && rewardsResponse.data) {
        setRewards(rewardsResponse.data);
      }

      if (pointsResponse.success && pointsResponse.data) {
        setPointsBalance(pointsResponse.data.current);
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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      DISCOUNT: 'Giảm giá',
      FREE_CLASS: 'Lớp học miễn phí',
      MERCHANDISE: 'Sản phẩm',
      MEMBERSHIP_EXTENSION: 'Gia hạn',
      PREMIUM_FEATURE: 'Tính năng Premium',
      OTHER: 'Khác',
    };
    return labels[category] || category;
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
      {/* Points Header */}
      <View style={themedStyles.header}>
        <View style={themedStyles.pointsHeader}>
          <View style={themedStyles.pointsIconContainer}>
            <Coins size={32} color="#FFD700" />
            <Sparkles size={18} color="#FFD700" style={themedStyles.sparkleIcon} />
          </View>
          <View style={themedStyles.pointsContent}>
            <Text style={themedStyles.pointsLabel}>Điểm thưởng của bạn</Text>
            <Text style={themedStyles.pointsValue}>{pointsBalance.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View style={themedStyles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={themedStyles.categoryScroll}>
          <TouchableOpacity
            style={[themedStyles.categoryChip, !selectedCategory && themedStyles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[themedStyles.categoryText, !selectedCategory && themedStyles.categoryTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[themedStyles.categoryChip, selectedCategory === category && themedStyles.categoryChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[themedStyles.categoryText, selectedCategory === category && themedStyles.categoryTextActive]}>
                {getCategoryLabel(category)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Rewards Grid */}
        {rewards.length > 0 ? (
          <View style={themedStyles.rewardsGrid}>
            {rewards.map((reward) => (
              <TouchableOpacity
                key={reward.id}
                style={themedStyles.rewardCard}
                onPress={() => handleViewReward(reward.id)}
              >
                {reward.image_url ? (
                  <Image source={{ uri: reward.image_url }} style={themedStyles.rewardImage} />
                ) : (
                  <View style={themedStyles.rewardImagePlaceholder}>
                    <Gift size={40} color={theme.colors.primary} />
                  </View>
                )}

                <View style={themedStyles.rewardContent}>
                  <View style={themedStyles.rewardHeader}>
                    <Text style={themedStyles.rewardTitle} numberOfLines={2}>
                      {reward.title}
                    </Text>
                    <Tag size={16} color={theme.colors.textSecondary} />
                  </View>

                  <Text style={themedStyles.rewardDescription} numberOfLines={2}>
                    {reward.description}
                  </Text>

                  <View style={themedStyles.rewardFooter}>
                    <View style={themedStyles.pointsBadge}>
                      <Coins size={14} color="#FFD700" />
                      <Text style={themedStyles.pointsCost}>{reward.points_cost}</Text>
                    </View>
                    {reward.discount_percent && (
                      <Text style={themedStyles.discountBadge}>-{reward.discount_percent}%</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={themedStyles.emptyContainer}>
            <Gift size={64} color={theme.colors.textSecondary} />
            <Text style={themedStyles.emptyText}>Không có phần thưởng nào</Text>
          </View>
        )}

        {/* Redemption History Link */}
        <TouchableOpacity
          style={themedStyles.historyButton}
          onPress={() => router.push('/rewards/history')}
        >
          <Text style={themedStyles.historyButtonText}>Xem lịch sử đổi thưởng</Text>
        </TouchableOpacity>
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
    historyButton: {
      margin: 16,
      padding: 16,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
    },
    historyButtonText: {
      ...Typography.body,
      color: '#FFFFFF',
      fontFamily: 'SpaceGrotesk-SemiBold',
    },
  });

