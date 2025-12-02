import { PaymentSummary } from '@/components/PaymentSummary';
import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billing/billing.service';
import { memberService } from '@/services/member/member.service';
import { PaymentMethod } from '@/types/billingTypes';
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
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterPaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { setTokens } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const userId = params.userId as string;
  const accessToken = params.accessToken as string;
  const refreshToken = params.refreshToken as string;
  const planId = params.planId as string;
  const planName = params.planName as string;
  const planType = params.planType as string;
  const planPrice = parseFloat(params.planPrice as string);
  const setupFee = parseFloat(params.setupFee as string);
  const durationMonths = parseInt(params.durationMonths as string);
  const discountCode = params.discountCode as string;
  const discountType = params.discountType as string;
  const discountValue = parseFloat((params.discountValue as string) || '0');
  const bonusDays = parseInt((params.bonusDays as string) || '0');

  const plan = {
    id: planId,
    name: planName,
    type: planType,
    price: planPrice,
    setup_fee: setupFee,
    duration_months: durationMonths,
  };

  const discount = discountCode
    ? {
        code: discountCode,
        type: discountType as any,
        value: discountValue,
        bonusDays,
      }
    : null;

  // Check if required params exist, redirect if missing
  useEffect(() => {
    if (!userId || !accessToken || !refreshToken || !planId) {
      console.error(
        '[ERROR] Missing required params for payment screen, redirecting to login'
      );
      Alert.alert(
        t('common.warning'),
        t('registration.sessionExpired') ||
          'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        [
          {
            text: t('common.ok'),
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } else {
      setIsCheckingStatus(false);
    }
  }, []);

  const paymentMethods: {
    method: PaymentMethod;
    icon: string;
    label: string;
    description: string;
  }[] = [
    {
      method: PaymentMethod.VNPAY,
      icon: 'card-outline',
      label: 'VNPAY',
      description:
        t('registration.vnpayDescription') ||
        'Thanh toán qua thẻ ATM, Visa, MasterCard',
    },
    {
      method: PaymentMethod.MOMO,
      icon: 'wallet-outline',
      label: 'MoMo',
      description:
        t('registration.momoDescription') || 'Thanh toán qua ví điện tử MoMo',
    },
    {
      method: PaymentMethod.BANK_TRANSFER,
      icon: 'business-outline',
      label: t('registration.bankTransfer') || 'Chuyển khoản ngân hàng',
      description:
        t('registration.bank_transferDescription') ||
        'Chuyển khoản trực tiếp qua ngân hàng',
    },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert(t('common.warning'), t('registration.selectPaymentMethod'));
      return;
    }

    setIsProcessing(true);

    try {
      console.log('[PAYMENT] Payment params:', {
        userId,
        planId,
        discountCode,
        bonusDays,
      });

      // Validate tokens before proceeding
      if (!accessToken || !refreshToken) {
        console.error('[ERROR] Missing tokens:', {
          hasAccess: !!accessToken,
          hasRefresh: !!refreshToken,
        });
        throw new Error('Missing authentication tokens');
      }

      // Step 1: Set tokens to authenticate member service calls
      console.log('[AUTH] Setting tokens...');
      await setTokens(accessToken, refreshToken);

      // Step 2: Create member first (or get existing member)
      console.log('[USER] Creating/getting member...');
      const memberResult = await memberService.updateMemberProfile({});
      if (!memberResult.success) {
        throw new Error('Failed to create member');
      }
      const memberId = memberResult.data?.id;
      if (!memberId) {
        throw new Error('Member ID not found after creation');
      }
      console.log('[SUCCESS] Member created/retrieved with ID:', memberId);

      // Step 3: Create subscription with member.id
      const subscriptionData = {
        member_id: memberId, // Use actual member.id instead of userId
        plan_id: planId,
        discount_code: discountCode || undefined,
        bonus_days: bonusDays || undefined,
      };

      console.log('[SUBSCRIPTION] Subscription data to send:', subscriptionData);

      const subscription = await billingService.createSubscriptionWithDiscount(
        subscriptionData
      );

      // Step 4: Initiate payment with member.id
      const paymentResponse = await billingService.initiatePayment({
        member_id: memberId, // Use actual member.id instead of userId
        subscription_id: subscription.id,
        amount: subscription.total_amount,
        payment_method: selectedMethod,
      });

      if (selectedMethod === PaymentMethod.BANK_TRANSFER) {
        // Navigate to bank transfer screen with QR code
        console.log('[BANK] Bank transfer payment initiated:', paymentResponse);

        router.push({
          pathname: '/(auth)/register-bank-transfer',
          params: {
            userId,
            accessToken,
            refreshToken,
            subscriptionId: subscription.id,
            paymentId: paymentResponse.payment.id,
            bankTransferId: paymentResponse.gatewayData.bankTransferId,
            amount: subscription.total_amount.toString(),
            qrCodeDataURL: paymentResponse.gatewayData.qrCodeDataURL, // Base64 QR
          },
        });
      } else {
        // For VNPAY/MOMO, would redirect to payment gateway
        // For demo purposes, simulate success
        Alert.alert(t('common.success'), t('registration.paymentInitiated'), [
          {
            text: t('common.ok'),
            onPress: () => {
              router.push({
                pathname: '/(auth)/register-profile',
                params: {
                  userId,
                  accessToken,
                  refreshToken,
                  subscriptionId: subscription.id,
                  paymentId: paymentResponse.payment.id,
                },
              });
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('registration.paymentFailed')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      paddingBottom: 120,
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
    summaryContainer: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    paymentMethodsContainer: {
      marginBottom: theme.spacing.md,
    },
    paymentMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderRadius: theme.radius.xl,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
    },
    paymentMethodSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}08`,
      borderWidth: 2,
    },
    paymentMethodIcon: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.lg,
      backgroundColor: `${theme.colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    paymentMethodIconSelected: {
      backgroundColor: `${theme.colors.primary}30`,
    },
    paymentMethodInfo: {
      flex: 1,
    },
    paymentMethodLabel: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    paymentMethodDescription: {
      fontFamily: FontFamily.interRegular,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    checkmark: {
      width: 28,
      height: 28,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.sm,
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
    payButton: {
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
    payButtonDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    payButtonText: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.3,
      color: theme.colors.textInverse,
    },
  });

  // Show loading while checking payment status
  if (isCheckingStatus) {
    return (
      <View
        style={[
          themedStyles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>
          Đang kiểm tra trạng thái thanh toán...
        </Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>
            {String(t('registration.payment') || 'Thanh toán')}
          </Text>
          <Text style={themedStyles.subtitle}>
            {String(
              t('registration.paymentSubtitle') || 'Chọn phương thức thanh toán'
            )}
          </Text>
        </View>

        <View style={themedStyles.summaryContainer}>
          <PaymentSummary
            plan={plan as any}
            discount={discount}
            bonusDays={bonusDays}
          />
        </View>

        <Text style={themedStyles.sectionTitle}>
          {String(t('registration.paymentMethod') || 'Phương thức thanh toán')}
        </Text>

        <View style={themedStyles.paymentMethodsContainer}>
          {paymentMethods.map((method) => {
            const isSelected = selectedMethod === method.method;
            return (
              <TouchableOpacity
                key={method.method}
                style={[
                  themedStyles.paymentMethod,
                  isSelected && themedStyles.paymentMethodSelected,
                ]}
                onPress={() => setSelectedMethod(method.method)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    themedStyles.paymentMethodIcon,
                    isSelected && themedStyles.paymentMethodIconSelected,
                  ]}
                >
                  <Ionicons
                    name={method.icon as any}
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>

                <View style={themedStyles.paymentMethodInfo}>
                  <Text style={themedStyles.paymentMethodLabel}>
                    {String(method.label)}
                  </Text>
                  <Text style={themedStyles.paymentMethodDescription}>
                    {String(method.description)}
                  </Text>
                </View>

                <View
                  style={[
                    themedStyles.checkmark,
                    !isSelected && { opacity: 0 },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={theme.colors.textInverse}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={themedStyles.footerContainer}>
        <TouchableOpacity
          style={[
            themedStyles.payButton,
            (!selectedMethod || isProcessing) && themedStyles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={themedStyles.payButtonText}>
              {String(
                t('registration.proceedToPayment') || 'Tiếp tục thanh toán'
              )}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterPaymentScreen;
