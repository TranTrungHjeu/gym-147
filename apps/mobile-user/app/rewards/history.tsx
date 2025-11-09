import { useAuth } from '@/contexts/AuthContext';
import { rewardService, type RewardRedemption } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Gift,
  XCircle,
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

export default function RewardHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);

  const themedStyles = styles(theme);

  useEffect(() => {
    if (member?.id) {
      loadHistory();
    }
  }, [member?.id]);

  const loadHistory = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      const response = await rewardService.getMemberRedemptions(member.id);

      if (response.success && response.data) {
        // Sort by redeemed_at descending (newest first)
        const sorted = [...response.data].sort(
          (a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime()
        );
        setRedemptions(sorted);
      }
    } catch (error) {
      console.error('Error loading redemption history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: theme.colors.warning,
      ACTIVE: theme.colors.success,
      USED: theme.colors.info,
      EXPIRED: theme.colors.textSecondary,
      CANCELLED: theme.colors.error,
      REFUNDED: theme.colors.textSecondary,
    };
    return colors[status] || theme.colors.textSecondary;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Đang xử lý',
      ACTIVE: 'Đang hoạt động',
      USED: 'Đã sử dụng',
      EXPIRED: 'Hết hạn',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'USED':
        return <CheckCircle size={18} color={getStatusColor(status)} />;
      case 'EXPIRED':
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle size={18} color={getStatusColor(status)} />;
      default:
        return <Clock size={18} color={getStatusColor(status)} />;
    }
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
        <TouchableOpacity onPress={() => router.back()} style={themedStyles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: theme.colors.text, flex: 1 }]}>
          Lịch sử đổi thưởng
        </Text>
      </View>

      <ScrollView
        style={themedStyles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {redemptions.length === 0 ? (
          <View style={themedStyles.emptyState}>
            <Gift size={64} color={theme.colors.textSecondary} />
            <Text style={[Typography.h4, { color: theme.colors.text, marginTop: 16 }]}>
              Chưa có lịch sử đổi thưởng
            </Text>
            <Text style={[Typography.body, { color: theme.colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
              Bạn chưa đổi phần thưởng nào. Hãy khám phá các phần thưởng có sẵn!
            </Text>
            <TouchableOpacity
              style={[themedStyles.exploreButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/rewards')}
            >
              <Text style={[Typography.bodyMedium, { color: theme.colors.textInverse }]}>
                Khám phá phần thưởng
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={themedStyles.list}>
            {redemptions.map((redemption) => (
              <View key={redemption.id} style={themedStyles.redemptionCard}>
                {/* Reward Info */}
                <View style={themedStyles.redemptionHeader}>
                  <View style={themedStyles.rewardInfo}>
                    {redemption.reward?.image_url ? (
                      <View style={themedStyles.rewardImageContainer}>
                        <View style={[themedStyles.rewardImage, { backgroundColor: theme.colors.surface }]}>
                          <Gift size={24} color={theme.colors.primary} />
                        </View>
                      </View>
                    ) : (
                      <View style={[themedStyles.rewardImage, { backgroundColor: theme.colors.surface }]}>
                        <Gift size={24} color={theme.colors.primary} />
                      </View>
                    )}
                    <View style={themedStyles.rewardDetails}>
                      <Text style={[Typography.bodyMedium, { color: theme.colors.text }]} numberOfLines={2}>
                        {redemption.reward?.title || 'Phần thưởng'}
                      </Text>
                      <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                        {redemption.points_spent.toLocaleString()} điểm
                      </Text>
                    </View>
                  </View>
                  {/* Status Badge */}
                  <View
                    style={[
                      themedStyles.statusBadge,
                      { backgroundColor: getStatusColor(redemption.status) + '15' },
                    ]}
                  >
                    {getStatusIcon(redemption.status)}
                    <Text
                      style={[
                        Typography.caption,
                        { color: getStatusColor(redemption.status), marginLeft: 4 },
                      ]}
                    >
                      {getStatusLabel(redemption.status)}
                    </Text>
                  </View>
                </View>

                {/* Code (if available) */}
                {redemption.code && (
                  <View style={themedStyles.codeContainer}>
                    <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                      Mã: <Text style={[Typography.bodyMedium, { color: theme.colors.text, fontFamily: 'JetBrainsMono-Regular' }]}>{redemption.code}</Text>
                    </Text>
                  </View>
                )}

                {/* Dates */}
                <View style={themedStyles.datesContainer}>
                  <View style={themedStyles.dateRow}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text style={[Typography.caption, { color: theme.colors.textSecondary, marginLeft: 6 }]}>
                      Đổi lúc: {formatDate(redemption.redeemed_at)}
                    </Text>
                  </View>
                  {redemption.used_at && (
                    <View style={[themedStyles.dateRow, { marginTop: 4 }]}>
                      <CheckCircle size={14} color={theme.colors.success} />
                      <Text style={[Typography.caption, { color: theme.colors.success, marginLeft: 6 }]}>
                        Sử dụng: {formatDate(redemption.used_at)}
                      </Text>
                    </View>
                  )}
                  {redemption.expires_at && (
                    <View style={[themedStyles.dateRow, { marginTop: 4 }]}>
                      <Clock size={14} color={theme.colors.warning} />
                      <Text style={[Typography.caption, { color: theme.colors.warning, marginLeft: 6 }]}>
                        Hết hạn: {formatDate(redemption.expires_at)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {redemption.notes && (
                  <View style={themedStyles.notesContainer}>
                    <Text style={[Typography.bodySmall, { color: theme.colors.textSecondary }]}>
                      {redemption.notes}
                    </Text>
                  </View>
                )}
              </View>
            ))}
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
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      minHeight: 400,
    },
    exploreButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 24,
    },
    list: {
      padding: 16,
    },
    redemptionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    redemptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    rewardInfo: {
      flexDirection: 'row',
      flex: 1,
      marginRight: 12,
    },
    rewardImageContainer: {
      marginRight: 12,
    },
    rewardImage: {
      width: 48,
      height: 48,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rewardDetails: {
      flex: 1,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    codeContainer: {
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 12,
    },
    datesContainer: {
      marginTop: 8,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    notesContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });

