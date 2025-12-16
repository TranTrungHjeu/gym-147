/**
 * Refund Timeline Screen
 * IMPROVEMENT: Screen to view refund processing timeline
 */

import { paymentService } from '@/services';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TimelineItem {
  status: string;
  timestamp: string;
  message: string;
  processed_by?: string;
}

interface RefundTimeline {
  refund_id: string;
  status: string;
  timeline: TimelineItem[];
  estimated_completion?: string;
}

export default function RefundTimelineScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { refundId } = useLocalSearchParams<{ refundId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<RefundTimeline | null>(null);

  useEffect(() => {
    if (refundId) {
      loadRefundTimeline();
    }
  }, [refundId]);

  const loadRefundTimeline = async () => {
    if (!refundId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await paymentService.getRefundTimeline(refundId);

      if (response.success && response.data) {
        setTimeline(response.data);
      } else {
        setError('Failed to load refund timeline');
      }
    } catch (err: any) {
      console.error('[ERROR] Error loading refund timeline:', err);
      setError(err.message || 'Failed to load refund timeline');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) {
      return <Clock size={20} color={theme.colors.textSecondary} />;
    }
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'PROCESSED':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'PENDING':
      case 'PROCESSING':
        return <Clock size={20} color={theme.colors.warning} />;
      case 'FAILED':
      case 'REJECTED':
        return <XCircle size={20} color={theme.colors.error} />;
      default:
        return <Clock size={20} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) {
      return theme.colors.textSecondary;
    }
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'PROCESSED':
        return theme.colors.success;
      case 'PENDING':
      case 'PROCESSING':
        return theme.colors.warning;
      case 'FAILED':
      case 'REJECTED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
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
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statusText: {
      ...Typography.h6,
      color: theme.colors.text,
    },
    timelineContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    timelineItem: {
      flexDirection: 'row',
      marginBottom: 24,
    },
    timelineItemLast: {
      marginBottom: 0,
    },
    timelineLine: {
      width: 2,
      backgroundColor: theme.colors.border,
      marginRight: 16,
      marginTop: 20,
    },
    timelineLineActive: {
      backgroundColor: theme.colors.primary,
    },
    timelineContent: {
      flex: 1,
    },
    timelineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    timelineStatus: {
      ...Typography.bodyMedium,
      fontWeight: '600',
    },
    timelineDate: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    timelineMessage: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
    },
    timelineProcessedBy: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontStyle: 'italic',
    },
    estimatedCompletion: {
      backgroundColor: `${theme.colors.info}15`,
      borderRadius: 12,
      padding: 12,
      marginTop: 16,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.info,
    },
    estimatedText: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    estimatedDate: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
      marginTop: 4,
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

  if (loading) {
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
            {t('subscription.refundTimeline') || 'Lịch sử hoàn tiền'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[themedStyles.content, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !timeline) {
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
            {t('subscription.refundTimeline') || 'Lịch sử hoàn tiền'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={themedStyles.emptyContainer}>
          <Text style={themedStyles.errorText}>
            {error || 'Refund timeline not found'}
          </Text>
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
        <Text style={themedStyles.headerTitle}>{'Lịch sử hoàn tiền'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={themedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status */}
        <View style={themedStyles.statusCard}>
          <View style={themedStyles.statusRow}>
            {getStatusIcon(timeline.status)}
            <Text
              style={[
                themedStyles.statusText,
                { color: getStatusColor(timeline.status) },
              ]}
            >
              {timeline.refund?.status || 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={themedStyles.timelineContainer}>
          <Text
            style={[
              Typography.h6,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            {t('subscription.timeline') || 'Timeline xử lý'}
          </Text>

          {timeline.timeline.map((item, index) => {
            const isLast = index === timeline.timeline.length - 1;
            const isActive =
              item.status &&
              timeline.status &&
              item.status.toUpperCase() === timeline.status.toUpperCase();

            return (
              <View
                key={index}
                style={[
                  themedStyles.timelineItem,
                  isLast && themedStyles.timelineItemLast,
                ]}
              >
                <View
                  style={[
                    themedStyles.timelineLine,
                    isActive && themedStyles.timelineLineActive,
                    isLast && { height: 0 },
                  ]}
                />
                <View style={themedStyles.timelineContent}>
                  <View style={themedStyles.timelineHeader}>
                    {getStatusIcon(item.status)}
                    <Text
                      style={[
                        themedStyles.timelineStatus,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {item.status || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={themedStyles.timelineDate}>
                    {formatDate(item.timestamp)}
                  </Text>
                  <Text style={themedStyles.timelineMessage}>
                    {item.message}
                  </Text>
                  {item.processed_by && (
                    <Text style={themedStyles.timelineProcessedBy}>
                      {t('subscription.processedBy') || 'Xử lý bởi'}:{' '}
                      {item.processed_by}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Estimated Completion */}
        {timeline.estimated_completion && (
          <View style={themedStyles.estimatedCompletion}>
            <Text style={themedStyles.estimatedText}>
              {t('subscription.estimatedCompletion') || 'Dự kiến hoàn thành'}
            </Text>
            <Text style={themedStyles.estimatedDate}>
              {formatDate(timeline.estimated_completion)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
