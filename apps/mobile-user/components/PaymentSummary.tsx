import { DiscountCode, MembershipPlan } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { FontFamily } from '@/utils/typography';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface PaymentSummaryProps {
  plan: MembershipPlan;
  discount?: DiscountCode | null;
  bonusDays?: number;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  plan,
  discount,
  bonusDays = 0,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(numPrice);
  };

  const calculateDiscount = () => {
    if (!discount) return 0;

    const setupFeeNum =
      typeof plan.setup_fee === 'string'
        ? parseFloat(plan.setup_fee)
        : plan.setup_fee || 0;
    const priceNum =
      typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price;
    const basePrice = priceNum + setupFeeNum;

    if (discount.type === 'PERCENTAGE') {
      const discountAmount = (basePrice * discount.value) / 100;
      return discount.maxDiscount
        ? Math.min(discountAmount, discount.maxDiscount)
        : discountAmount;
    } else if (discount.type === 'FIXED_AMOUNT') {
      return discount.value;
    } else if (
      discount.type === 'FREE_TRIAL' ||
      discount.type === 'FIRST_MONTH_FREE'
    ) {
      return basePrice;
    }

    return 0;
  };

  const setupFeeNum =
    typeof plan.setup_fee === 'string'
      ? parseFloat(plan.setup_fee)
      : plan.setup_fee || 0;
  const priceNum =
    typeof plan.price === 'string' ? parseFloat(plan.price) : plan.price;
  const subtotal = priceNum + setupFeeNum;
  const discountAmount = calculateDiscount();
  const total = Math.max(0, subtotal - discountAmount);

  const themedStyles = StyleSheet.create({
    container: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    planInfo: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: `${theme.colors.primary}08`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}20`,
      marginBottom: theme.spacing.lg,
    },
    planName: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    planDuration: {
      fontFamily: FontFamily.interRegular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    bonusInfo: {
      fontFamily: FontFamily.interMedium,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.success,
      marginTop: theme.spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: `${theme.colors.border}50`,
      marginVertical: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    label: {
      fontFamily: FontFamily.interRegular,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    value: {
      fontFamily: FontFamily.interSemiBold,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
    discountRow: {
      marginBottom: theme.spacing.sm,
    },
    discountLabel: {
      fontFamily: FontFamily.interMedium,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.success,
    },
    discountValue: {
      fontFamily: FontFamily.interSemiBold,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.success,
    },
    discountCode: {
      fontFamily: FontFamily.interRegular,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 2,
      borderTopColor: theme.colors.border,
    },
    totalLabel: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 20,
      lineHeight: 28,
      color: theme.colors.text,
    },
    totalValue: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: theme.colors.primary,
    },
  });

  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.title}>
        {String(t('registration.paymentSummary') || 'Tóm tắt thanh toán')}
      </Text>

      <View style={themedStyles.planInfo}>
        <Text style={themedStyles.planName}>{String(plan.name || '')}</Text>
        <Text style={themedStyles.planDuration}>
          {String(
            `${plan.duration_months} ${t('common.months') || 'tháng'}${
              bonusDays > 0
                ? ` + ${bonusDays} ${t('registration.bonusDays') || 'ngày'}`
                : ''
            }`
          )}
        </Text>
        {bonusDays > 0 ? (
          <Text style={themedStyles.bonusInfo}>
            {String(
              `🎉 ${
                t('registration.bonusDaysApplied', { days: bonusDays }) ||
                `Đã thêm ${bonusDays} ngày sử dụng`
              }`
            )}
          </Text>
        ) : null}
      </View>

      <View style={themedStyles.row}>
        <Text style={themedStyles.label}>
          {String(t('registration.membershipFee') || 'Phí thành viên')}
        </Text>
        <Text style={themedStyles.value}>{formatPrice(plan.price)}</Text>
      </View>

      {plan.setup_fee && Number(plan.setup_fee) > 0 ? (
        <View style={themedStyles.row}>
          <Text style={themedStyles.label}>
            {String(t('registration.setupFee') || 'Phí thiết lập')}
          </Text>
          <Text style={themedStyles.value}>{formatPrice(plan.setup_fee)}</Text>
        </View>
      ) : null}

      <View style={themedStyles.divider} />

      <View style={themedStyles.row}>
        <Text style={themedStyles.label}>
          {String(t('registration.subtotal') || 'Tạm tính')}
        </Text>
        <Text style={themedStyles.value}>{formatPrice(subtotal)}</Text>
      </View>

      {discount && discountAmount > 0 ? (
        <View style={themedStyles.discountRow}>
          <View style={themedStyles.row}>
            <Text style={themedStyles.discountLabel}>
              {String(t('registration.discount') || 'Giảm giá')}
            </Text>
            <Text style={themedStyles.discountValue}>
              {String(`-${formatPrice(discountAmount)}`)}
            </Text>
          </View>
          <Text style={themedStyles.discountCode}>
            {String(
              `${t('registration.code') || 'Mã'}: ${discount.code || ''}`
            )}
          </Text>
        </View>
      ) : null}

      <View style={themedStyles.totalRow}>
        <Text style={themedStyles.totalLabel}>
          {String(t('registration.total') || 'Tổng cộng')}
        </Text>
        <Text style={themedStyles.totalValue}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
};
