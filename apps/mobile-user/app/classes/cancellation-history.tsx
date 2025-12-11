/**
 * Cancellation History Screen
 * IMPROVEMENT: Screen to view member's cancellation history
 */

import RefundInfoCard from '@/components/RefundInfoCard';
import { useAuth } from '@/contexts/AuthContext';
import { bookingService } from '@/services';
import { paymentService } from '@/services/billing/payment.service';
import { Refund } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, DollarSign, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CancellationHistoryItem {
  booking_id: string;
  schedule_id: string;
  class_name: string;
  cancelled_at: string;
  cancellation_reason: string;
  refund_amount: number;
}

export default function CancellationHistoryScreen() {
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellations, setCancellations] = useState<CancellationHistoryItem[]>([]);
  const [refundMap, setRefundMap] = useState<Record<string, Refund | null>>({});

  useEffect(() => {
    if (member?.id) {
      loadCancellationHistory();
    }
  }, [member?.id]);

  const loadCancellationHistory = async () => {
    if (!member?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await bookingService.getCancellationHistory(member.id, 50);

      if (response.success && response.data) {
        setCancellations(response.data);
        
        // Load refund info for each cancellation
        const refundPromises = response.data.map(async (item) => {
          try {
            const refundResponse = await paymentService.getRefundByBookingId(item.booking_id);
            return {
              bookingId: item.booking_id,
              refund: refundResponse.success && refundResponse.data ? refundResponse.data : null,
            };
          } catch (error) {
            console.error(`[ERROR] Failed to load refund for booking ${item.booking_id}:`, error);
            return {
              bookingId: item.booking_id,
              refund: null,
            };
          }
        });
        
        const refundResults = await Promise.all(refundPromises);
        const newRefundMap: Record<string, Refund | null> = {};
        refundResults.forEach(({ bookingId, refund }) => {
          newRefundMap[bookingId] = refund;
        });
        setRefundMap(newRefundMap);
      } else {
        setError(response.error || 'Failed to load cancellation history');
      }
    } catch (err: any) {
      console.error('[ERROR] Error loading cancellation history:', err);
      setError(err.message || 'Failed to load cancellation history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCancellationHistory();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      ...Typography.h5,
      color: theme.colors.text,
    },
    backButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    className: {
      ...Typography.h6,
      color: theme.colors.text,
      flex: 1,
    },
    cancelledDate: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    infoLabel: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      minWidth: 100,
    },
    infoValue: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      flex: 1,
    },
    reasonCard: {
      backgroundColor: `${theme.colors.warning}10`,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.warning,
    },
    reasonLabel: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    reasonText: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
    },
    refundBadge: {
      backgroundColor: `${theme.colors.success}20`,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    refundText: {
      ...Typography.bodySmall,
      color: theme.colors.success,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      ...Typography.h6,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    errorText: {
      ...Typography.body,
      color: theme.colors.error,
      textAlign: 'center',
    },
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={themedStyles.headerTitle}>
            {t('classes.cancellationHistory') || 'Lịch sử hủy lớp'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[themedStyles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>
          {t('classes.cancellationHistory') || 'Lịch sử hủy lớp'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={themedStyles.emptyContainer}>
          <Text style={themedStyles.errorText}>{error}</Text>
        </View>
      ) : cancellations.length === 0 ? (
        <View style={themedStyles.emptyContainer}>
          <FileText size={48} color={theme.colors.textSecondary} />
          <Text style={themedStyles.emptyText}>
            {t('classes.noCancellations') || 'Chưa có lịch sử hủy lớp'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={cancellations}
          keyExtractor={(item) => item.booking_id}
          renderItem={({ item }) => (
            <View style={themedStyles.card}>
              <View style={themedStyles.cardHeader}>
                <Text style={themedStyles.className}>{item.class_name}</Text>
                {item.refund_amount > 0 && (
                  <View style={themedStyles.refundBadge}>
                    <Text style={themedStyles.refundText}>
                      {formatCurrency(item.refund_amount)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={themedStyles.infoRow}>
                <Calendar size={16} color={theme.colors.textSecondary} />
                <Text style={themedStyles.infoLabel}>
                  {t('classes.cancelledAt') || 'Hủy lúc'}:
                </Text>
                <Text style={themedStyles.infoValue}>
                  {formatDate(item.cancelled_at)}
                </Text>
              </View>

              {item.refund_amount > 0 && (
                <View style={themedStyles.infoRow}>
                  <DollarSign size={16} color={theme.colors.success} />
                  <Text style={themedStyles.infoLabel}>
                    {t('classes.refundAmount') || 'Hoàn tiền'}:
                  </Text>
                  <Text
                    style={[
                      themedStyles.infoValue,
                      { color: theme.colors.success, fontWeight: '600' },
                    ]}
                  >
                    {formatCurrency(item.refund_amount)}
                  </Text>
                </View>
              )}

              <View style={themedStyles.reasonCard}>
                <Text style={themedStyles.reasonLabel}>
                  {t('classes.cancellationReason') || 'Lý do hủy'}:
                </Text>
                <Text style={themedStyles.reasonText}>
                  {item.cancellation_reason}
                </Text>
              </View>

              {/* Refund Info Card */}
              {refundMap[item.booking_id] && (
                <View style={{ marginTop: 12 }}>
                  <RefundInfoCard
                    refund={refundMap[item.booking_id]}
                    onViewTimeline={async () => {
                      const refund = refundMap[item.booking_id];
                      if (refund?.id) {
                        try {
                          const timelineResponse = await paymentService.getRefundTimeline(refund.id);
                          if (timelineResponse.success && timelineResponse.data) {
                            const timeline = timelineResponse.data.timeline || [];
                            const timelineText = timeline
                              .map((item: any) => {
                                const date = new Date(item.timestamp).toLocaleString('vi-VN');
                                return `${date}: ${item.action} (${item.actor})`;
                              })
                              .join('\n');
                            
                            const { Alert } = require('react-native');
                            Alert.alert(
                              t('classes.refund.viewTimeline'),
                              timelineText || t('classes.refund.noRefund'),
                              [{ text: t('common.ok') }]
                            );
                          }
                        } catch (error) {
                          console.error('[ERROR] Failed to load refund timeline:', error);
                        }
                      }
                    }}
                    showTimelineButton={!!refundMap[item.booking_id]?.id}
                  />
                </View>
              )}
            </View>
          )}
          contentContainerStyle={themedStyles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

