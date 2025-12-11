/**
 * Upgrade/Downgrade Subscription Modal
 * IMPROVEMENT: Modal to show prorated calculation and confirm upgrade/downgrade
 */

import { MembershipPlan } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UpgradeDowngradeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: MembershipPlan;
  newPlan: MembershipPlan;
  proratedCalculation: {
    unusedAmount: number;
    newPlanCost: number;
    priceDifference: number;
    daysRemaining: number;
    totalPeriodDays: number;
  };
  isUpgrade: boolean;
  loading?: boolean;
}

export default function UpgradeDowngradeModal({
  visible,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  proratedCalculation,
  isUpgrade,
  loading = false,
}: UpgradeDowngradeModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
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
    planComparison: {
      marginBottom: 20,
    },
    planRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    planLabel: {
      ...Typography.body,
      color: theme.colors.textSecondary,
    },
    planValue: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
    },
    calculationCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}30`,
      marginBottom: 20,
    },
    calculationTitle: {
      ...Typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '600',
      marginBottom: 12,
    },
    calculationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    calculationLabel: {
      ...Typography.body,
      color: theme.colors.textSecondary,
    },
    calculationValue: {
      ...Typography.body,
      color: theme.colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    totalLabel: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      fontWeight: '600',
    },
    totalValue: {
      ...Typography.h3,
      color: isUpgrade ? theme.colors.primary : theme.colors.success,
      fontWeight: '700',
    },
    refundInfo: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: `${theme.colors.success}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.success}30`,
      marginBottom: 20,
    },
    refundText: {
      ...Typography.body,
      color: theme.colors.success,
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
              {isUpgrade
                ? t('subscription.upgrade') || 'Nâng cấp gói'
                : t('subscription.downgrade') || 'Hạ cấp gói'}
            </Text>
            <TouchableOpacity
              style={themedStyles.closeButton}
              onPress={onClose}
              disabled={loading}
            >
              <Ionicons name="close" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Plan Comparison */}
            <View style={themedStyles.planComparison}>
              <View style={themedStyles.planRow}>
                <Text style={themedStyles.planLabel}>Gói hiện tại:</Text>
                <Text style={themedStyles.planValue}>{currentPlan.name}</Text>
              </View>
              <View style={themedStyles.planRow}>
                <Text style={themedStyles.planLabel}>Gói mới:</Text>
                <Text style={themedStyles.planValue}>{newPlan.name}</Text>
              </View>
            </View>

            {/* Prorated Calculation */}
            <View style={themedStyles.calculationCard}>
              <Text style={themedStyles.calculationTitle}>
                {t('subscription.calculation') || 'Tính toán tỷ lệ'}
              </Text>

              <View style={themedStyles.calculationRow}>
                <Text style={themedStyles.calculationLabel}>
                  Số ngày còn lại:
                </Text>
                <Text style={themedStyles.calculationValue}>
                  {Math.round(proratedCalculation.daysRemaining)} ngày
                </Text>
              </View>

              <View style={themedStyles.calculationRow}>
                <Text style={themedStyles.calculationLabel}>
                  Số tiền chưa dùng (gói cũ):
                </Text>
                <Text style={themedStyles.calculationValue}>
                  {formatPrice(proratedCalculation.unusedAmount)}
                </Text>
              </View>

              <View style={themedStyles.calculationRow}>
                <Text style={themedStyles.calculationLabel}>
                  Chi phí gói mới (còn lại):
                </Text>
                <Text style={themedStyles.calculationValue}>
                  {formatPrice(proratedCalculation.newPlanCost)}
                </Text>
              </View>

              <View style={themedStyles.totalRow}>
                <Text style={themedStyles.totalLabel}>
                  {isUpgrade ? 'Số tiền cần thanh toán:' : 'Số tiền được hoàn:'}
                </Text>
                <Text style={themedStyles.totalValue}>
                  {isUpgrade ? '+' : '-'}
                  {formatPrice(Math.abs(proratedCalculation.priceDifference))}
                </Text>
              </View>
            </View>

            {/* Refund Info for Downgrade */}
            {!isUpgrade && proratedCalculation.priceDifference < 0 && (
              <View style={themedStyles.refundInfo}>
                <Text style={themedStyles.refundText}>
                  {t('subscription.refundInfo') ||
                    'Số tiền hoàn lại sẽ được xử lý trong vòng 3-5 ngày làm việc.'}
                </Text>
              </View>
            )}
          </ScrollView>

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
                  {t('common.confirm') || 'Xác nhận'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

