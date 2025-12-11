/**
 * Cancellation Reason Modal
 * IMPROVEMENT: Modal to collect cancellation reason when canceling booking
 */

import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CancellationReasonModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  scheduleStartTime?: string; // To show refund policy
  loading?: boolean;
}

// Note: Labels will be translated in the component using translation keys
const CANCELLATION_REASONS = [
  {
    id: 'schedule_conflict',
    translationKey: 'classes.booking.cancellation.reasons.scheduleConflict',
    icon: 'calendar-outline',
  },
  {
    id: 'health_issue',
    translationKey: 'classes.booking.cancellation.reasons.healthIssue',
    icon: 'medical-outline',
  },
  {
    id: 'cannot_attend',
    translationKey: 'classes.booking.cancellation.reasons.cannotAttend',
    icon: 'close-circle-outline',
  },
  {
    id: 'found_alternative',
    translationKey: 'classes.booking.cancellation.reasons.foundAlternative',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'other',
    translationKey: 'classes.booking.cancellation.reasons.other',
    icon: 'ellipsis-horizontal-outline',
  },
];

export default function CancellationReasonModal({
  visible,
  onClose,
  onConfirm,
  scheduleStartTime,
  loading = false,
}: CancellationReasonModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      return;
    }

    const reason =
      selectedReason === 'other' && customReason.trim()
        ? customReason.trim()
        : t(CANCELLATION_REASONS.find((r) => r.id === selectedReason)?.translationKey || '') ||
          selectedReason;

    onConfirm(reason);
    // Reset form
    setSelectedReason(null);
    setCustomReason('');
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedReason(null);
      setCustomReason('');
      onClose();
    }
  };

  // Calculate refund policy based on time until class starts
  const getRefundPolicy = () => {
    if (!scheduleStartTime) return null;

    const now = new Date();
    const startTime = new Date(scheduleStartTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart >= 24) {
      return {
        percentage: 100,
        message: t('classes.booking.cancellation.refund100') || 'Hoàn tiền 100%',
      };
    } else if (hoursUntilStart >= 12) {
      return {
        percentage: 50,
        message: t('classes.booking.cancellation.refund50') || 'Hoàn tiền 50%',
      };
    } else {
      return {
        percentage: 0,
        message: t('classes.booking.cancellation.noRefund') || 'Không hoàn tiền',
      };
    }
  };

  const refundPolicy = getRefundPolicy();

  const themedStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 15,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      ...Typography.h2,
      color: theme.colors.text,
      flex: 1,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    subtitle: {
      ...Typography.body,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    refundPolicyCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      marginBottom: 20,
    },
    refundPolicyText: {
      ...Typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    reasonsContainer: {
      marginBottom: 20,
    },
    reasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    reasonItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    },
    reasonIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    reasonLabel: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      flex: 1,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    customReasonInput: {
      ...Typography.body,
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      color: theme.colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
      marginTop: 12,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      opacity: selectedReason ? 1 : 0.5,
    },
    confirmButtonText: {
      ...Typography.bodyMedium,
      color: theme.colors.textInverse,
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={themedStyles.overlay}>
        <View style={themedStyles.modalContainer}>
          <View style={themedStyles.header}>
            <Text style={themedStyles.title}>
              {t('classes.booking.cancellation.title') || 'Lý do hủy đăng ký'}
            </Text>
            <TouchableOpacity
              style={themedStyles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={themedStyles.subtitle}>
            {t('classes.booking.cancellation.subtitle') ||
              'Vui lòng cho chúng tôi biết lý do bạn hủy đăng ký lớp học này.'}
          </Text>

          {/* Refund Policy */}
          {refundPolicy && (
            <View style={themedStyles.refundPolicyCard}>
              <Text style={themedStyles.refundPolicyText}>
                {t('classes.booking.cancellation.refundPolicy') || 'Chính sách hoàn tiền'}:{' '}
                {refundPolicy.message}
              </Text>
            </View>
          )}

          <ScrollView style={themedStyles.reasonsContainer} showsVerticalScrollIndicator={false}>
            {CANCELLATION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  themedStyles.reasonItem,
                  selectedReason === reason.id && themedStyles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.id)}
                disabled={loading}
              >
                <View style={themedStyles.reasonIcon}>
                  <Ionicons
                    name={reason.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={themedStyles.reasonLabel}>
                  {t(reason.translationKey) || reason.id}
                </Text>
                {selectedReason === reason.id && (
                  <View style={themedStyles.checkmark}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.textInverse} />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Custom Reason Input */}
            {selectedReason === 'other' && (
              <TextInput
                style={themedStyles.customReasonInput}
                placeholder={
                  t('classes.booking.cancellation.customReasonPlaceholder') ||
                  'Vui lòng mô tả lý do hủy...'
                }
                placeholderTextColor={theme.colors.textTertiary}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                editable={!loading}
              />
            )}
          </ScrollView>

          <View style={themedStyles.buttonContainer}>
            <TouchableOpacity
              style={themedStyles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={themedStyles.cancelButtonText}>
                {t('common.cancel') || 'Hủy'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.confirmButton}
              onPress={handleConfirm}
              disabled={!selectedReason || loading}
            >
              <Text style={themedStyles.confirmButtonText}>
                {t('classes.booking.cancellation.confirm') || 'Xác nhận hủy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

