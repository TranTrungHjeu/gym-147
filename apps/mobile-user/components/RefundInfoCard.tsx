import { Refund, RefundStatus } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface RefundInfoCardProps {
  refund: Refund | null;
  refundAmount?: number;
  refundStatus?: string;
  refundPolicy?: string;
  hoursUntilStart?: number;
  originalAmount?: number;
  onViewTimeline?: () => void;
  showTimelineButton?: boolean;
}

export default function RefundInfoCard({
  refund,
  refundAmount,
  refundStatus,
  refundPolicy,
  hoursUntilStart,
  originalAmount,
  onViewTimeline,
  showTimelineButton = true,
}: RefundInfoCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Use refund data if available, otherwise use props
  const amount = refund && refund.amount !== undefined && refund.amount !== null
    ? parseFloat(refund.amount.toString())
    : refundAmount || 0;
  const status = refund?.status || refundStatus || 'PENDING';
  const policy = refundPolicy || 'NO_REFUND';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return theme.colors.success;
      case 'APPROVED':
        return theme.colors.info || theme.colors.primary;
      case 'PENDING':
        return theme.colors.warning;
      case 'FAILED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle size={20} color={getStatusColor(status)} />;
      case 'APPROVED':
        return <CheckCircle size={20} color={getStatusColor(status)} />;
      case 'PENDING':
        return <Clock size={20} color={getStatusColor(status)} />;
      case 'FAILED':
        return <XCircle size={20} color={getStatusColor(status)} />;
      default:
        return <AlertCircle size={20} color={getStatusColor(status)} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return t('classes.refund.status.processed');
      case 'APPROVED':
        return t('classes.refund.status.approved');
      case 'PENDING':
        return t('classes.refund.status.pending');
      case 'FAILED':
        return t('classes.refund.status.failed');
      default:
        return status;
    }
  };

  const getPolicyText = (policy: string) => {
    switch (policy) {
      case 'FULL_REFUND':
        return t('classes.refund.policy.full');
      case 'PARTIAL_REFUND':
        return t('classes.refund.policy.partial');
      case 'NO_REFUND':
        return t('classes.refund.policy.none');
      default:
        return policy;
    }
  };

  // Don't show card if no refund
  if (amount <= 0 && !refund) {
    return null;
  }

  const handleViewTimeline = async () => {
    if (!refund?.id || !onViewTimeline) return;
    
    setLoadingTimeline(true);
    try {
      await onViewTimeline();
    } finally {
      setLoadingTimeline(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderLeftColor: getStatusColor(status),
          ...(theme.shadows?.sm || {}),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          {getStatusIcon(status)}
          <Text
            style={[
              styles.statusText,
              {
                color: getStatusColor(status),
              },
            ]}
          >
            {getStatusText(status)}
          </Text>
        </View>
      </View>

      {amount > 0 && (
        <View style={styles.amountContainer}>
          <Text style={[styles.amountLabel, { color: theme.colors.textSecondary }]}>
            {t('classes.refund.amount')}
          </Text>
          <Text style={[styles.amountValue, { color: theme.colors.text }]}>
            {formatPrice(amount)}
          </Text>
        </View>
      )}

      {originalAmount && originalAmount > 0 && (
        <View style={styles.originalAmountContainer}>
          <Text style={[styles.originalAmountLabel, { color: theme.colors.textSecondary }]}>
            {t('classes.refund.originalAmount')}
          </Text>
          <Text style={[styles.originalAmountValue, { color: theme.colors.textSecondary }]}>
            {formatPrice(originalAmount)}
          </Text>
        </View>
      )}

      {policy && policy !== 'NO_REFUND' && (
        <View style={styles.policyContainer}>
          <Text style={[styles.policyLabel, { color: theme.colors.textSecondary }]}>
            {t('classes.refund.policy.label')}
          </Text>
          <Text style={[styles.policyValue, { color: theme.colors.text }]}>
            {getPolicyText(policy)}
            {hoursUntilStart !== undefined && (
              <Text style={{ color: theme.colors.textSecondary }}>
                {' '}
                ({t('classes.refund.hoursUntilStart', { hours: Math.round(hoursUntilStart) })})
              </Text>
            )}
          </Text>
        </View>
      )}

      {refund?.processed_at && status === 'PROCESSED' && (
        <View style={styles.processedContainer}>
          <Text style={[styles.processedLabel, { color: theme.colors.textSecondary }]}>
            {t('classes.refund.processedAt')}
          </Text>
          <Text style={[styles.processedValue, { color: theme.colors.text }]}>
            {new Date(refund.processed_at).toLocaleString('vi-VN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      )}

      {refund?.failure_reason && status === 'FAILED' && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorLabel, { color: theme.colors.error }]}>
            {t('classes.refund.failureReason')}
          </Text>
          <Text style={[styles.errorValue, { color: theme.colors.error }]}>
            {refund.failure_reason}
          </Text>
        </View>
      )}

      {showTimelineButton && refund?.id && onViewTimeline && (
        <TouchableOpacity
          style={[
            styles.timelineButton,
            {
              backgroundColor: theme.colors.primary + '15',
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={handleViewTimeline}
          disabled={loadingTimeline}
        >
          {loadingTimeline ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.timelineButtonText, { color: theme.colors.primary }]}>
              {t('classes.refund.viewTimeline')}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  amountContainer: {
    marginBottom: 8,
  },
  amountLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  amountValue: {
    ...Typography.h6,
    fontWeight: '700',
  },
  originalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  originalAmountLabel: {
    ...Typography.bodySmall,
  },
  originalAmountValue: {
    ...Typography.bodySmall,
    textDecorationLine: 'line-through',
  },
  policyContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  policyLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  policyValue: {
    ...Typography.bodyMedium,
  },
  processedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  processedLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  processedValue: {
    ...Typography.bodyMedium,
  },
  errorContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,0,0,0.2)',
  },
  errorLabel: {
    ...Typography.bodySmall,
    marginBottom: 4,
    fontWeight: '600',
  },
  errorValue: {
    ...Typography.bodyMedium,
  },
  timelineButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineButtonText: {
    ...Typography.buttonMedium,
  },
});

