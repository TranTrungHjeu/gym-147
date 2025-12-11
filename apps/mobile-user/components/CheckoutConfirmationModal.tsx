/**
 * Checkout Confirmation Modal
 * IMPROVEMENT: Modal to confirm early checkout from a class
 */

import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CheckoutConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scheduleName?: string;
  scheduleEndTime?: string;
  loading?: boolean;
}

export default function CheckoutConfirmationModal({
  visible,
  onClose,
  onConfirm,
  scheduleName,
  scheduleEndTime,
  loading = false,
}: CheckoutConfirmationModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 20,
    },
    message: {
      ...Typography.body,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    scheduleInfo: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      marginBottom: 20,
    },
    scheduleInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    scheduleInfoLabel: {
      ...Typography.body,
      color: theme.colors.textSecondary,
    },
    scheduleInfoValue: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
    },
    warningText: {
      ...Typography.bodySmall,
      color: theme.colors.warning || theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 20,
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
    },
    confirmButtonText: {
      ...Typography.bodyMedium,
      color: theme.colors.textInverse,
      fontWeight: '600',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={themedStyles.overlay}>
        <View style={themedStyles.modalContainer}>
          <View style={themedStyles.header}>
            <Text style={themedStyles.title}>
              {t('attendance.checkoutConfirm') || 'Xác nhận Check-out'}
            </Text>
            <TouchableOpacity
              style={themedStyles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.iconContainer}>
            <Ionicons name="log-out-outline" size={40} color={theme.colors.primary} />
          </View>

          <Text style={themedStyles.message}>
            {t('attendance.checkoutConfirmMessage') ||
              'Bạn có chắc muốn check-out sớm khỏi lớp học này?'}
          </Text>

          {scheduleName && (
            <View style={themedStyles.scheduleInfo}>
              <View style={themedStyles.scheduleInfoRow}>
                <Text style={themedStyles.scheduleInfoLabel}>
                  {t('attendance.className') || 'Lớp học:'}
                </Text>
                <Text style={themedStyles.scheduleInfoValue}>{scheduleName}</Text>
              </View>
              {scheduleEndTime && (
                <View style={themedStyles.scheduleInfoRow}>
                  <Text style={themedStyles.scheduleInfoLabel}>
                    {t('attendance.endTime') || 'Kết thúc:'}
                  </Text>
                  <Text style={themedStyles.scheduleInfoValue}>
                    {formatTime(scheduleEndTime)}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text style={themedStyles.warningText}>
            {t('attendance.checkoutWarning') ||
              'Lưu ý: Nếu bạn check-out sớm, hệ thống sẽ tự động check-out khi lớp kết thúc.'}
          </Text>

          <View style={themedStyles.buttonContainer}>
            <TouchableOpacity
              style={themedStyles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={themedStyles.cancelButtonText}>
                {t('common.cancel') || 'Hủy'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themedStyles.confirmButton}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.textInverse} />
              ) : (
                <Text style={themedStyles.confirmButtonText}>
                  {t('attendance.confirmCheckout') || 'Xác nhận Check-out'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

