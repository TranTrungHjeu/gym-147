import { billingService } from '@/services/billing/billing.service';
import { DiscountCode } from '@/types/billingTypes';
import { getTokens } from '@/utils/auth/storage';
import { useTheme } from '@/utils/theme';
import { FontFamily } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterCouponScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<DiscountCode | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [isTrialCode, setIsTrialCode] = useState(false); // IMPROVEMENT: Track if trial code
  const [accessToken, setAccessToken] = useState<string>(params.accessToken as string);
  const [refreshToken, setRefreshToken] = useState<string>(params.refreshToken as string);

  const userId = params.userId as string;
  const planId = params.planId as string;
  const planName = params.planName as string;
  const planType = params.planType as string;
  const planPrice = parseFloat(params.planPrice as string);
  const setupFee = 0; // setup_fee removed from schema
  const durationMonths = parseInt(params.durationMonths as string);

  // Load tokens from storage if params are empty
  useEffect(() => {
    const loadTokens = async () => {
      if (!accessToken || !refreshToken) {
        const tokens = await getTokens();
        if (tokens.accessToken && tokens.refreshToken) {
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);
        }
      }
    };
    loadTokens();
  }, []);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setError(t('registration.enterCouponCode'));
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const validatedDiscount = await billingService.validateCoupon(
        couponCode.trim(),
        planId,
        userId
      );

      setDiscount(validatedDiscount);
      // IMPROVEMENT: Check if this is a trial code
      const isTrial = validatedDiscount.isTrialCode || 
                      couponCode.trim().toUpperCase().startsWith('TRIAL-') ||
                      validatedDiscount.type === 'FREE_TRIAL';
      setIsTrialCode(isTrial);
      
      if (isTrial) {
        Alert.alert(
          t('registration.trialCodeValid') || 'Mã trial hợp lệ',
          t('registration.trialCodeMessage') || 'Bạn sẽ được dùng thử 7 ngày miễn phí với gói Basic. Sau đó bạn có thể nâng cấp lên gói khác.'
        );
      } else {
        Alert.alert(t('common.success'), t('registration.couponValid'));
      }
    } catch (error: any) {
      console.error('Coupon validation error:', error);
      setError(
        error.response?.data?.message || t('registration.couponInvalid')
      );
      setDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    // IMPROVEMENT: If trial code, skip payment and go directly to create subscription
    if (isTrialCode && discount) {
      // For trial, we'll create subscription directly without payment
      // The backend will handle trial subscription creation
      router.push({
        pathname: '/(auth)/register-payment',
        params: {
          userId,
          accessToken,
          refreshToken,
          planId,
          planName,
          planType,
          planPrice: '0', // Trial is free
          durationMonths: durationMonths.toString(),
          discountCode: discount.code,
          discountType: discount.type || 'FREE_TRIAL',
          discountValue: '0',
          bonusDays: '0',
          isTrial: 'true', // Flag to indicate trial
        },
      });
      return;
    }

    router.push({
      pathname: '/(auth)/register-payment',
      params: {
        userId,
        accessToken,
        refreshToken,
        planId,
        planName,
        planType,
        planPrice: planPrice.toString(),
        durationMonths: durationMonths.toString(),
        discountCode: discount?.code || '',
        discountType: discount?.type || '',
        discountValue: discount?.value?.toString() || '0',
        bonusDays: discount?.bonusDays?.toString() || '0',
        isTrial: 'false',
      },
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const calculateDiscount = () => {
    if (!discount) return 0;

    const subtotal = planPrice;

    if (discount.type === 'PERCENTAGE') {
      const discountAmount = (subtotal * discount.value) / 100;
      return discount.maxDiscount
        ? Math.min(discountAmount, discount.maxDiscount)
        : discountAmount;
    } else if (discount.type === 'FIXED_AMOUNT') {
      return discount.value;
    }

    return 0;
  };

  const discountAmount = calculateDiscount();
    const finalPrice = Math.max(0, planPrice - discountAmount);

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      paddingBottom: 160,
    },
    header: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontFamily: FontFamily.interRegular,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textSecondary,
    },
    planInfoCard: {
      padding: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      backgroundColor: `${theme.colors.primary}08`,
      borderWidth: 2,
      borderColor: `${theme.colors.primary}20`,
      marginBottom: theme.spacing.xl,
    },
    planName: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    planPrice: {
      fontFamily: FontFamily.spaceGroteskBold,
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.5,
      color: theme.colors.primary,
    },
    sectionTitle: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 18,
      lineHeight: 24,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    inputContainer: {
      position: 'relative',
      marginBottom: theme.spacing.sm,
    },
    input: {
      fontFamily: FontFamily.interMedium,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingVertical: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingRight: 110,
      textTransform: 'uppercase',
      letterSpacing: 1,
      height: 56,
      textAlignVertical: 'center',
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    validateButton: {
      position: 'absolute',
      right: 6,
      top: '50%',
      transform: [{ translateY: -18 }],
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    validateButtonText: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.3,
      color: theme.colors.textInverse,
    },
    errorText: {
      fontFamily: FontFamily.interMedium,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
    },
    discountCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: `${theme.colors.success}10`,
      borderWidth: 2,
      borderColor: `${theme.colors.success}30`,
      marginTop: theme.spacing.md,
    },
    discountTitle: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.success,
      marginBottom: theme.spacing.xs,
    },
    discountDescription: {
      fontFamily: FontFamily.interRegular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    bonusDaysContainer: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: `${theme.colors.success}20`,
    },
    bonusDaysText: {
      fontFamily: FontFamily.interMedium,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: `${theme.colors.border}50`,
      marginVertical: theme.spacing.xl,
    },
    summaryContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    summaryLabel: {
      fontFamily: FontFamily.interRegular,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      fontFamily: FontFamily.interSemiBold,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    continueButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    continueButtonText: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.3,
      color: theme.colors.textInverse,
    },
  });

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>
            {t('registration.couponOrReferral')}
          </Text>
          <Text style={themedStyles.subtitle}>
            {t('registration.couponSubtitle')}
          </Text>
        </View>

        {/* Plan Info Card */}
        <View style={themedStyles.planInfoCard}>
          <Text style={themedStyles.planName}>{planName}</Text>
          <Text style={themedStyles.planPrice}>
            {formatPrice(planPrice)}
          </Text>
        </View>

        {/* Coupon Input Section */}
        <Text style={themedStyles.sectionTitle}>
          {t('registration.enterCouponCode')}
        </Text>

        <View style={themedStyles.inputContainer}>
          <TextInput
            style={[themedStyles.input, error && themedStyles.inputError]}
            value={couponCode}
            onChangeText={(text) => {
              setCouponCode(text);
              setError('');
            }}
            placeholder={t('registration.enterCouponPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="characters"
            editable={!discount}
          />
          {!discount ? (
            <TouchableOpacity
              style={themedStyles.validateButton}
              onPress={handleValidateCoupon}
              disabled={isValidating}
              activeOpacity={0.8}
            >
              {isValidating ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <Text style={themedStyles.validateButtonText}>
                  {t('registration.apply')}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {error ? <Text style={themedStyles.errorText}>{error}</Text> : null}

        {/* IMPROVEMENT: Trial Code Info Card */}
        {isTrialCode && discount ? (
          <View style={[themedStyles.discountCard, { 
            backgroundColor: `${theme.colors.primary}15`,
            borderColor: theme.colors.primary,
            borderWidth: 2,
          }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="gift" size={24} color={theme.colors.primary} />
              <Text style={[themedStyles.discountTitle, { color: theme.colors.primary, marginLeft: 8 }]}>
                {t('registration.trialCode') || 'Mã Trial'}
              </Text>
            </View>
            <Text style={[themedStyles.discountDescription, { color: theme.colors.text }]}>
              {t('registration.trialCodeDescription') || 'Bạn sẽ được dùng thử miễn phí 7 ngày với gói Basic. Sau thời gian trial, bạn có thể nâng cấp lên gói khác.'}
            </Text>
            <View style={{ marginTop: 12, padding: 12, backgroundColor: `${theme.colors.primary}10`, borderRadius: 8 }}>
              <Text style={[themedStyles.discountCode, { color: theme.colors.primary }]}>
                {discount.code}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Discount Applied Card */}
        {discount && !isTrialCode ? (
          <View style={themedStyles.discountCard}>
            <Text style={themedStyles.discountTitle}>
              ✓ {t('registration.discountApplied')}
            </Text>
            <Text style={themedStyles.discountDescription}>
              {discount.name || discount.code}
            </Text>
            {discount.bonusDays && discount.bonusDays > 0 ? (
              <View style={themedStyles.bonusDaysContainer}>
                <Text style={themedStyles.bonusDaysText}>
                  [CELEBRATE] +{discount.bonusDays} {t('registration.bonusDays')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={themedStyles.divider} />

        {/* Summary */}
        <View style={themedStyles.summaryContainer}>
          <View style={themedStyles.summaryRow}>
            <Text style={themedStyles.summaryLabel}>
              {t('registration.subtotal')}
            </Text>
            <Text style={themedStyles.summaryValue}>
              {formatPrice(planPrice)}
            </Text>
          </View>

          {discountAmount > 0 ? (
            <View style={themedStyles.summaryRow}>
              <Text
                style={[
                  themedStyles.summaryLabel,
                  { color: theme.colors.success },
                ]}
              >
                {t('registration.discount')}
              </Text>
              <Text
                style={[
                  themedStyles.summaryValue,
                  { color: theme.colors.success },
                ]}
              >
                -{formatPrice(discountAmount)}
              </Text>
            </View>
          ) : null}

          <View style={themedStyles.totalRow}>
            <Text style={themedStyles.totalLabel}>
              {t('registration.total')}
            </Text>
            <Text style={themedStyles.totalValue}>
              {formatPrice(finalPrice)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={themedStyles.footerContainer}>
        <TouchableOpacity
          style={themedStyles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={themedStyles.continueButtonText}>
            {t('registration.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterCouponScreen;
