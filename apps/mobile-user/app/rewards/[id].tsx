import { useAuth } from '@/contexts/AuthContext';
import { pointsService, rewardService, type Reward } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
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
  Alert,
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

  const themedStyles = styles(theme);

  useEffect(() => {
    if (params.id) {
      loadReward();
    }
  }, [params.id, member?.id]);

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

  const handleRedeem = async () => {
    if (!reward || !member?.id) return;

    if (pointsBalance < reward.points_cost) {
      Alert.alert(
        'Không đủ điểm',
        `Bạn cần ${reward.points_cost} điểm để đổi phần thưởng này. Hiện tại bạn có ${pointsBalance} điểm.`
      );
      return;
    }

    Alert.alert(
      'Xác nhận đổi thưởng',
      `Bạn có chắc chắn muốn đổi phần thưởng này với ${reward.points_cost} điểm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đổi thưởng',
          onPress: async () => {
            try {
              setRedeeming(true);
              const response = await rewardService.redeemReward(reward.id, member.id);

              if (response.success && response.data) {
                Alert.alert(
                  'Thành công',
                  'Bạn đã đổi thưởng thành công!',
                  [
                    {
                      text: 'Xem lịch sử',
                      onPress: () => router.push('/rewards/history'),
                    },
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
                // Refresh points balance
                if (response.data.new_balance !== undefined) {
                  setPointsBalance(response.data.new_balance);
                }
              } else {
                Alert.alert('Lỗi', response.error || 'Không thể đổi thưởng');
              }
            } catch (error: any) {
              console.error('Redeem error:', error);
              Alert.alert('Lỗi', error.message || 'Không thể đổi thưởng');
            } finally {
              setRedeeming(false);
            }
          },
        },
      ]
    );
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Không giới hạn';
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
          <Text style={[Typography.h3, { color: theme.colors.text }]}>Chi tiết phần thưởng</Text>
        </View>
        <View style={themedStyles.centerContent}>
          <XCircle size={64} color={theme.colors.textSecondary} />
          <Text style={[Typography.body, { color: theme.colors.textSecondary, marginTop: 16 }]}>
            Không tìm thấy phần thưởng
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
          Chi tiết phần thưởng
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
            <Text style={themedStyles.pointsText}>{reward.points_cost.toLocaleString()} điểm</Text>
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
                Có hiệu lực từ: {formatDate(reward.valid_from)}
              </Text>
            </View>
            {reward.valid_until && (
              <View style={[themedStyles.infoRow, { marginTop: 8 }]}>
                <Calendar size={18} color={theme.colors.textSecondary} />
                <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginLeft: 8 }]}>
                  Hết hạn: {formatDate(reward.valid_until)}
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
                  Còn lại: {reward.stock_quantity - (reward._count?.redemptions || 0)} / {reward.stock_quantity}
                </Text>
              </View>
            </View>
          )}

          {/* Terms & Conditions */}
          {reward.terms_conditions && (
            <View style={themedStyles.section}>
              <Text style={[Typography.h4, { color: theme.colors.text, marginBottom: 8 }]}>
                Điều khoản & Điều kiện
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
                Phần thưởng này hiện không khả dụng
              </Text>
            </View>
          )}

          {available && !affordable && (
            <View style={[themedStyles.statusCard, { backgroundColor: theme.colors.warning + '15' }]}>
              <Info size={20} color={theme.colors.warning} />
              <Text style={[Typography.bodySmall, { color: theme.colors.warning, marginLeft: 8 }]}>
                Bạn cần {reward.points_cost - pointsBalance} điểm nữa để đổi phần thưởng này
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
                  Đổi thưởng ({reward.points_cost.toLocaleString()} điểm)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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

