import RewardRedemptionModal from '@/components/RewardRedemptionModal';
import RewardSuccessModal from '@/components/RewardSuccessModal';
import { useAuth } from '@/contexts/AuthContext';
import { pointsService, rewardService, type Reward } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Coins,
  Gift,
  Info,
  Sparkles,
  Tag,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RewardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redemptionData, setRedemptionData] = useState<{
    code: string;
    pointsSpent: number;
    newBalance: number;
  } | null>(null);

  const themedStyles = styles(theme);

  useEffect(() => {
    if (params.id) {
      loadReward();
    }
  }, [params.id, member?.id]);

  // Listen for socket events for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined' || !member?.id) return;

    const handleRewardRedeemed = (event: any) => {
      console.log('🎁 Reward redeemed event received:', event.detail);
      // Refresh reward and points balance
      if (params.id && member?.id) {
        loadReward();
      }
    };

    const handlePointsUpdated = (event: any) => {
      console.log('💎 Points updated event received:', event.detail);
      // Update points balance immediately
      if (event.detail?.new_balance !== undefined) {
        setPointsBalance(event.detail.new_balance);
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
    };

    window.addEventListener('reward:redeemed', handleRewardRedeemed);
    window.addEventListener('points:updated', handlePointsUpdated);

    return () => {
      window.removeEventListener('reward:redeemed', handleRewardRedeemed);
      window.removeEventListener('points:updated', handlePointsUpdated);
    };
  }, [member?.id, params.id]);

  const loadReward = async () => {
    if (!params.id || !member?.id) return;

    try {
      setLoading(true);
      const [rewardResponse, pointsResponse] = await Promise.all([
        rewardService.getRewardById(params.id),
        pointsService.getBalance(member.id),
      ]);

      if (rewardResponse.success && rewardResponse.data) {
        setReward(rewardResponse.data);
      }

      if (pointsResponse.success && pointsResponse.data) {
        setPointsBalance(pointsResponse.data.current);
      }
    } catch (error) {
      console.error('Error loading reward:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin phần thưởng');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = () => {
    if (!reward || !member?.id) return;
    setShowConfirmModal(true);
  };

  const handleConfirmRedeem = async () => {
    if (!reward || !member?.id) return;

    try {
      setRedeeming(true);
      setShowConfirmModal(false);
      const response = await rewardService.redeemReward(reward.id, member.id);

      if (response.success && response.data) {
        // Update points balance
        if (response.data.new_balance !== undefined) {
          setPointsBalance(response.data.new_balance);
        }

        // Set redemption data for success modal
        setRedemptionData({
          code: response.data.code || '',
          pointsSpent: reward.points_cost,
          newBalance: response.data.new_balance || pointsBalance - reward.points_cost,
        });

        // Show success modal
        setShowSuccessModal(true);
      } else {
        // Handle error - could show error modal here
        console.error('Redeem error:', response.error);
      }
    } catch (error: any) {
      console.error('Redeem error:', error);
      // Handle error - could show error modal here
    } finally {
      setRedeeming(false);
    }
  };

  const handleViewHistory = () => {
    setShowSuccessModal(false);
    router.push('/rewards/history');
  };

  const getCategoryLabel = (category: string) => {
    return t(`rewards.category.${category}` as any) || category;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('rewards.noExpiry');
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isAvailable = () => {
    if (!reward) return false;
    if (!reward.is_active) return false;
    if (reward.valid_until && new Date(reward.valid_until) < new Date()) return false;
    if (reward.stock_quantity !== null) {
      const redeemed = reward._count?.redemptions || 0;
      if (redeemed >= reward.stock_quantity) return false;
    }
    return true;
  };

  const canAfford = () => {
    return reward ? pointsBalance >= reward.points_cost : false;
  };

  if (loading) {
    return (
      <SafeAreaView style={[themedStyles.container, themedStyles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!reward) {
    return (
      <SafeAreaView style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            {t('rewards.rewardDetails')}
          </Text>
        </View>
        <View style={themedStyles.centerContent}>
          <XCircle size={64} color={theme.colors.textSecondary} />
          <Text style={[Typography.body, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            {t('rewards.noRewards')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const available = isAvailable();
  const affordable = canAfford();

  return (
    <SafeAreaView style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {t('rewards.rewardDetails')}
        </Text>
      </View>

      <ScrollView style={themedStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Reward Image */}
        {reward.image_url ? (
          <Image source={{ uri: reward.image_url }} style={themedStyles.rewardImage} />
        ) : (
          <View style={[themedStyles.rewardImage, themedStyles.rewardImagePlaceholder]}>
            <Gift size={64} color={theme.colors.textSecondary} />
          </View>
        )}

        {/* Reward Info */}
        <View style={themedStyles.content}>
          {/* Category Badge */}
          <View style={themedStyles.categoryBadge}>
            <Tag size={16} color={theme.colors.primary} />
            <Text style={themedStyles.categoryText}>{getCategoryLabel(reward.category)}</Text>
          </View>

          {/* Title */}
          <Text style={[Typography.h2, { color: theme.colors.text, marginTop: 12 }]}>
            {reward.title}
          </Text>

          {/* Points Cost */}
          <View style={themedStyles.pointsContainer}>
            <View style={themedStyles.pointsIconContainer}>
              <Coins size={20} color="#FFD700" />
              <Sparkles size={12} color="#FFD700" style={themedStyles.sparkleIcon} />
            </View>
            <Text style={themedStyles.pointsText}>
              {reward.points_cost.toLocaleString()} {t('rewards.points')}
            </Text>
          </View>

          {/* Description */}
          {reward.description && (
            <View style={themedStyles.section}>
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                {reward.description}
              </Text>
            </View>
          )}

          {/* Discount Info */}
          {(reward.discount_percent || reward.discount_amount) && (
            <View style={themedStyles.infoCard}>
              <Gift size={20} color={theme.colors.success} />
              <View style={themedStyles.infoContent}>
                <Text style={[Typography.bodyMedium, { color: theme.colors.text }]}>
                  {reward.discount_percent
                    ? `Giảm ${reward.discount_percent}%`
                    : `Giảm ${reward.discount_amount?.toLocaleString()} VNĐ`}
                </Text>
              </View>
            </View>
          )}

          {/* Validity */}
          <View style={themedStyles.section}>
            <View style={themedStyles.infoRow}>
              <Calendar size={18} color={theme.colors.textSecondary} />
              <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                {t('rewards.validFrom')}: {formatDate(reward.valid_from)}
              </Text>
            </View>
            {reward.valid_until && (
              <View style={[themedStyles.infoRow, { marginTop: 8 }]}>
                <Calendar size={18} color={theme.colors.textSecondary} />
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                  {t('rewards.validUntil')}: {formatDate(reward.valid_until)}
                </Text>
              </View>
            )}
          </View>

          {/* Stock Info */}
          {reward.stock_quantity !== null && (
            <View style={themedStyles.section}>
              <View style={themedStyles.infoRow}>
                <Info size={18} color={theme.colors.textSecondary} />
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                  {t('rewards.stockAvailable')}: {reward.stock_quantity - (reward._count?.redemptions || 0)} / {reward.stock_quantity}
                </Text>
              </View>
            </View>
          )}

          {/* Terms & Conditions */}
          {reward.terms_conditions && (
            <View style={themedStyles.section}>
              <Text style={[Typography.h4, { color: theme.colors.text, marginBottom: 8 }]}>
                {t('rewards.termsConditions')}
              </Text>
              <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                {reward.terms_conditions}
              </Text>
            </View>
          )}

          {/* Availability Status */}
          {!available && (
            <View style={[themedStyles.statusCard, { backgroundColor: theme.colors.error + '15' }]}>
              <XCircle size={20} color={theme.colors.error} />
              <Text style={[Typography.bodySmall, { color: theme.colors.error, marginLeft: 8 }]}>
                {t('rewards.notAvailable')}
              </Text>
            </View>
          )}

          {available && !affordable && (
            <View style={[themedStyles.statusCard, { backgroundColor: theme.colors.warning + '15' }]}>
              <Info size={20} color={theme.colors.warning} />
              <Text style={[Typography.bodySmall, { color: theme.colors.warning, marginLeft: 8 }]}>
                {t('rewards.pointsNeeded', { points: reward.points_cost - pointsBalance })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Redeem Button */}
      {available && (
        <View style={themedStyles.footer}>
          <TouchableOpacity
            style={[
              themedStyles.redeemButton,
              {
                backgroundColor: affordable ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={handleRedeem}
            disabled={!affordable || redeeming}
          >
            {redeeming ? (
              <ActivityIndicator size="small" color={theme.colors.textInverse} />
            ) : (
              <>
                <Gift size={20} color={theme.colors.textInverse} />
                <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse, marginLeft: 8 }]}>
                  {t('rewards.redeem')} ({reward.points_cost.toLocaleString()} {t('rewards.points')})
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <RewardRedemptionModal
        visible={showConfirmModal}
        reward={reward}
        pointsBalance={pointsBalance}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmRedeem}
        loading={redeeming}
      />

      {/* Success Modal */}
      {redemptionData && (
        <RewardSuccessModal
          visible={showSuccessModal}
          rewardTitle={reward?.title || ''}
          rewardImageUrl={reward?.image_url}
          redemptionCode={redemptionData.code}
          pointsSpent={redemptionData.pointsSpent}
          newBalance={redemptionData.newBalance}
          onClose={() => {
            setShowSuccessModal(false);
            router.back();
          }}
          onViewHistory={handleViewHistory}
        />
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
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backButton: {
      marginRight: 12,
    },
    scrollView: {
      flex: 1,
    },
    rewardImage: {
      width: '100%',
      height: 250,
      backgroundColor: theme.colors.surface,
    },
    rewardImagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: 16,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
    },
    categoryText: {
      ...Typography.bodySmall,
      color: theme.colors.primary,
      marginLeft: 6,
      fontFamily: 'Inter-SemiBold',
    },
    pointsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
    },
    pointsIconContainer: {
      position: 'relative',
      marginRight: 8,
    },
    sparkleIcon: {
      position: 'absolute',
      top: -4,
      right: -4,
    },
    pointsText: {
      ...Typography.h3,
      color: '#FFD700',
      fontFamily: 'SpaceGrotesk-Bold',
    },
    section: {
      marginTop: 20,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 16,
    },
    infoContent: {
      flex: 1,
      marginLeft: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    redeemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
    },
  });

