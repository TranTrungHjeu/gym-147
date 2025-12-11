import { PaymentSummary } from '@/components/PaymentSummary';
import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billing/billing.service';
import { subscriptionService } from '@/services/billing/subscription.service';
import type {
  DiscountCode,
  MembershipPlan,
  PaymentMethod,
} from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { FontFamily } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { PartyPopper } from 'lucide-react-native';
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
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentAction = 'SUBSCRIBE' | 'UPGRADE' | 'RENEW';

export default function SubscriptionPaymentScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { member } = useAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    plan?: string; // JSON string of plan object
    planId?: string; // Plan ID (fallback)
    subscriptionId?: string;
    action: PaymentAction;
    amount?: string;
  }>();

  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [originalAmount, setOriginalAmount] = useState<number>(0); // Store original amount before discount
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discount, setDiscount] = useState<DiscountCode | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [discountError, setDiscountError] = useState<string>('');

  const action = params.action as PaymentAction;
  const planId = params.planId;
  const subscriptionId = params.subscriptionId;

  useEffect(() => {
    loadPlanData();
  }, [params.plan, params.planId]);

  const loadPlanData = async () => {
    try {
      // Try to parse plan from JSON string first
      if (params.plan) {
        try {
          const parsedPlan = JSON.parse(params.plan) as MembershipPlan;
          setPlan(parsedPlan);
          const calculatedAmount = params.amount
            ? parseFloat(params.amount)
            : parseFloat(parsedPlan.price.toString());
          setAmount(calculatedAmount);
          setOriginalAmount(calculatedAmount);
          return;
        } catch (parseError) {
          console.warn(
            'Failed to parse plan from JSON, falling back to planId'
          );
        }
      }

      // Fallback to loading plan by ID
      if (planId) {
        const plans = await subscriptionService.getMembershipPlans();
        const selectedPlan = plans.find((p) => p.id === planId);
        if (selectedPlan) {
          setPlan(selectedPlan);
          const calculatedAmount = params.amount
            ? parseFloat(params.amount)
            : parseFloat(selectedPlan.price.toString());
          setAmount(calculatedAmount);
          setOriginalAmount(calculatedAmount);
        }
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      Alert.alert(
        t('common.error'),
        t('subscription.payment.failedToLoadPlanDetails')
      );
    }
  };

  const calculateDiscountAmount = (basePrice: number) => {
    if (!discount) return 0;

    if (discount.type === 'PERCENTAGE') {
      const discountAmount = (basePrice * discount.value) / 100;
      return discount.maxDiscount
        ? Math.min(discountAmount, discount.maxDiscount)
        : discountAmount;
    } else if (discount.type === 'FIXED_AMOUNT') {
      return discount.value;
    }
    return 0;
  };

  const handleValidateDiscount = async () => {
    if (!discountCode.trim() || !plan || !member?.id) {
      setDiscountError(
        t('registration.enterCouponCode') || 'Vui lòng nhập mã giảm giá'
      );
      return;
    }

    setIsValidating(true);
    setDiscountError('');

    try {
      const validatedDiscount = await billingService.validateCoupon(
        discountCode.trim().toUpperCase(),
        plan.id,
        member.id
      );

      setDiscount(validatedDiscount);
      const discountAmount = calculateDiscountAmount(originalAmount);
      const newAmount = Math.max(0, originalAmount - discountAmount);
      setAmount(newAmount);
      Alert.alert(
        t('common.success'),
        t('registration.couponValid') || 'Áp dụng mã thành công!'
      );
    } catch (error: any) {
      console.error('Discount validation error:', error);
      setDiscountError(
        error.response?.data?.message ||
          t('registration.couponInvalid') ||
          'Mã không hợp lệ hoặc đã hết hạn'
      );
      setDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscount(null);
    setDiscountCode('');
    setDiscountError('');
    // Reset amount to original
    setAmount(originalAmount);
  };

  const paymentMethods: {
    method: PaymentMethod;
    icon: string;
    label: string;
    description: string;
  }[] = [
    {
      method: 'VNPAY',
      icon: 'card-outline',
      label: 'VNPAY',
      description:
        t('payment.vnpayDesc') || 'Thanh toán qua thẻ ATM, Visa, MasterCard',
    },
    {
      method: 'MOMO',
      icon: 'wallet-outline',
      label: 'MoMo',
      description: t('payment.momoDesc') || 'Thanh toán qua ví điện tử MoMo',
    },
    {
      method: 'BANK_TRANSFER',
      icon: 'business-outline',
      label: t('payment.bankTransfer') || 'Chuyển khoản ngân hàng',
      description:
        t('payment.bankTransferDesc') || 'Chuyển khoản trực tiếp qua ngân hàng',
    },
  ];

  const handlePayment = async () => {
    if (!selectedMethod || !member?.id || !plan) {
      Alert.alert(t('common.warning'), t('payment.selectPaymentMethod'));
      return;
    }

    setLoading(true);

    try {
      let subscription;
      let paymentResponse;

      if (action === 'SUBSCRIBE') {
        // Create subscription with discount (creates PENDING subscription)
        subscription = await billingService.createSubscriptionWithDiscount({
          member_id: member.id,
          plan_id: plan.id,
          discount_code: discount?.code || undefined,
          bonus_days: discount?.bonusDays || undefined,
        });

        // Get subscription details to get correct amount
        const subscriptionDetails =
          await subscriptionService.getSubscriptionById(subscription.id);
        const paymentAmount = subscriptionDetails.total_amount
          ? parseFloat(subscriptionDetails.total_amount.toString())
          : amount;

        // Initiate payment
        paymentResponse = await billingService.initiatePayment({
          member_id: member.id,
          subscription_id: subscription.id,
          amount: paymentAmount,
          payment_method: selectedMethod,
        });
      } else if (action === 'UPGRADE' && subscriptionId) {
        // For upgrade with payment:
        // 1. Create payment first (with PENDING status)
        // 2. Update subscription after payment is created
        // This ensures payment exists before subscription is updated

        const priceDifference = amount; // Amount is already the difference

        if (priceDifference > 0) {
          // Step 1: Create payment first
          paymentResponse = await billingService.initiatePayment({
            member_id: member.id,
            subscription_id: subscriptionId,
            amount: priceDifference,
            payment_method: selectedMethod,
          });

          // Step 2: Update subscription after payment is created
          // Note: Subscription will be fully activated when payment is completed
          subscription = await subscriptionService.updateSubscription(
            subscriptionId,
            {
              plan_id: plan.id,
              ...(discount?.code ? { discount_code: discount.code } : {}),
            }
          );
        } else {
          // No payment needed for downgrade or same price
          // Update subscription directly
          subscription = await subscriptionService.updateSubscription(
            subscriptionId,
            {
              plan_id: plan.id,
            }
          );
          Alert.alert(
            t('common.success'),
            t('subscription.plans.subscriptionUpgraded'),
            [
              {
                text: t('common.ok'),
                onPress: () => router.replace('/subscription'),
              },
            ]
          );
          return;
        }
      } else if (action === 'RENEW' && subscriptionId) {
        // Renew subscription - backend creates payment with PENDING status if payment_method provided
        console.log(
          '[RENEW] Renewing subscription with payment method:',
          selectedMethod
        );

        // Note: renewSubscription doesn't support discount_code directly
        // Discount would need to be applied at payment level if supported
        const renewResponse = await subscriptionService.renewSubscription(
          subscriptionId,
          selectedMethod
        );

        console.log('[SUCCESS] Renew response:', renewResponse);

        // Backend returns payment info if payment_method was provided
        // We need to initiate payment gateway for the created payment
        if (amount > 0 && selectedMethod) {
          // Get the payment ID from the renewal response if available
          // Otherwise, initiate payment separately
          try {
            paymentResponse = await billingService.initiatePayment({
              member_id: member.id,
              subscription_id: subscriptionId,
              amount: amount,
              payment_method: selectedMethod,
            });
          } catch (paymentError: any) {
            console.error(
              'Error initiating payment after renewal:',
              paymentError
            );
            // If payment initiation fails, subscription is still renewed
            // Show success message
            Alert.alert(
              t('common.success'),
              t('subscription.plans.subscriptionRenewed') +
                '. ' +
                (paymentError?.message || ''),
              [
                {
                  text: t('common.ok'),
                  onPress: () => router.replace('/subscription'),
                },
              ]
            );
            return;
          }
        } else {
          // No payment needed
          Alert.alert(
            t('common.success'),
            t('subscription.plans.subscriptionRenewed'),
            [
              {
                text: t('common.ok'),
                onPress: () => router.replace('/subscription'),
              },
            ]
          );
          return;
        }
      }

      // Handle payment based on method
      if (paymentResponse) {
        if (selectedMethod === 'BANK_TRANSFER') {
          // Navigate to bank transfer screen
          router.push({
            pathname: '/subscription/payment-processing',
            params: {
              paymentId: paymentResponse.payment.id,
              bankTransferId: paymentResponse.gatewayData?.bankTransferId,
              subscriptionId: subscription?.id || subscriptionId || '',
              amount: (paymentResponse.payment.amount || amount).toString(),
              qrCodeDataURL: paymentResponse.gatewayData?.qrCodeDataURL,
              action: action,
            },
          });
        } else if (selectedMethod === 'VNPAY' || selectedMethod === 'MOMO') {
          // Redirect to payment gateway
          if (paymentResponse.paymentUrl) {
            // In a real app, you would use Linking.openURL or WebBrowser
            Alert.alert(
              t('common.info'),
              t('payment.redirectingToGateway') ||
                'Redirecting to payment gateway...',
              [
                {
                  text: t('common.ok'),
                  onPress: () => {
                    // Handle payment gateway redirect
                    router.back();
                  },
                },
              ]
            );
          } else {
            throw new Error('Payment URL not provided by gateway');
          }
        }
      } else {
        throw new Error('Payment response is missing');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        t('common.error'),
        error?.response?.data?.message ||
          t('payment.paymentFailed') ||
          'Payment failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'SUBSCRIBE':
        return t('subscription.plans.subscribe') || 'Subscribe';
      case 'UPGRADE':
        return t('subscription.plans.upgrade') || 'Upgrade';
      case 'RENEW':
        return t('subscription.plans.extend') || 'Renew';
      default:
        return t('payment.title') || 'Payment';
    }
  };

  const getActionSubtitle = () => {
    switch (action) {
      case 'SUBSCRIBE':
        return (
          t('payment.subscribeSubtitle') ||
          'Chọn phương thức thanh toán để đăng ký gói thành viên'
        );
      case 'UPGRADE':
        return (
          t('payment.upgradeSubtitle') ||
          'Chọn phương thức thanh toán để nâng cấp gói thành viên'
        );
      case 'RENEW':
        return (
          t('payment.renewSubtitle') ||
          'Chọn phương thức thanh toán để gia hạn gói thành viên'
        );
      default:
        return (
          t('payment.selectPaymentMethod') || 'Chọn phương thức thanh toán'
        );
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
    discountSection: {
      marginBottom: theme.spacing.xl,
    },
    discountSectionTitle: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    discountSectionSubtitle: {
      fontFamily: FontFamily.interRegular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    discountInputContainer: {
      position: 'relative',
      marginBottom: theme.spacing.sm,
    },
    discountInput: {
      fontFamily: FontFamily.interMedium,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingRight: 110,
      textTransform: 'uppercase',
      letterSpacing: 1,
      height: 56,
    },
    discountInputError: {
      borderColor: theme.colors.error,
    },
    validateDiscountButton: {
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
    validateDiscountButtonDisabled: {
      opacity: 0.5,
    },
    validateDiscountButtonText: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.3,
      color: theme.colors.textInverse,
    },
    discountErrorText: {
      fontFamily: FontFamily.interMedium,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.error,
      marginTop: theme.spacing.xs,
      paddingLeft: theme.spacing.sm,
    },
    discountAppliedCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: `${theme.colors.success}10`,
      borderWidth: 2,
      borderColor: `${theme.colors.success}30`,
    },
    discountAppliedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    discountAppliedTitle: {
      fontFamily: FontFamily.spaceGroteskSemiBold,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.success,
    },
    removeDiscountButton: {
      padding: 4,
    },
    discountAppliedCode: {
      fontFamily: FontFamily.interRegular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      marginTop: theme.spacing.xs,
    },
    bonusDaysText: {
      fontFamily: FontFamily.interMedium,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
    },
  });

  if (!plan) {
    return (
      <SafeAreaView
        style={[
          themedStyles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
        edges={['top']}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>
          {t('common.loading')}...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themedStyles.container} edges={['top']}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>{getActionTitle()}</Text>
          <Text style={themedStyles.subtitle}>{getActionSubtitle()}</Text>
        </View>

        <View style={themedStyles.summaryContainer}>
          <PaymentSummary
            plan={plan}
            totalAmount={amount}
            discount={discount}
            bonusDays={discount?.bonusDays}
          />
        </View>

        {/* Discount Code Input */}
        <View style={themedStyles.discountSection}>
          <Text style={themedStyles.discountSectionTitle}>
            {t('registration.couponOrReferral') || 'Mã giảm giá'}
          </Text>
          <Text style={themedStyles.discountSectionSubtitle}>
            {t('registration.couponSubtitle') || 'Có mã giảm giá? Nhập tại đây'}
          </Text>

          {!discount ? (
            <View style={themedStyles.discountInputContainer}>
              <TextInput
                style={[
                  themedStyles.discountInput,
                  discountError && themedStyles.discountInputError,
                ]}
                placeholder={
                  t('registration.enterCouponPlaceholder') || 'Nhập mã'
                }
                placeholderTextColor={theme.colors.textSecondary}
                value={discountCode}
                onChangeText={(text) => {
                  setDiscountCode(text.toUpperCase());
                  setDiscountError('');
                }}
                autoCapitalize="characters"
                editable={!isValidating}
              />
              <TouchableOpacity
                style={[
                  themedStyles.validateDiscountButton,
                  (!discountCode.trim() || isValidating) &&
                    themedStyles.validateDiscountButtonDisabled,
                ]}
                onPress={handleValidateDiscount}
                disabled={!discountCode.trim() || isValidating}
                activeOpacity={0.8}
              >
                {isValidating ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                  />
                ) : (
                  <Text style={themedStyles.validateDiscountButtonText}>
                    {t('registration.apply') || 'Áp dụng'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={themedStyles.discountAppliedCard}>
              <View style={themedStyles.discountAppliedHeader}>
                <Text style={themedStyles.discountAppliedTitle}>
                  ✓ {t('registration.discountApplied') || 'Đã áp dụng giảm giá'}
                </Text>
                <TouchableOpacity
                  onPress={handleRemoveDiscount}
                  style={themedStyles.removeDiscountButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={theme.colors.error}
                  />
                </TouchableOpacity>
              </View>
              <Text style={themedStyles.discountAppliedCode}>
                {discount.name || discount.code}
              </Text>
              {discount.bonusDays && discount.bonusDays > 0 && (
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <PartyPopper size={16} color={theme.colors.primary} />
                  <Text style={themedStyles.bonusDaysText}>
                    +{discount.bonusDays}{' '}
                    {t('registration.bonusDays') || 'ngày thưởng'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {discountError ? (
            <Text style={themedStyles.discountErrorText}>{discountError}</Text>
          ) : null}
        </View>

        <Text style={themedStyles.sectionTitle}>
          {t('payment.selectPaymentMethod') || 'Phương thức thanh toán'}
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
                    {method.label}
                  </Text>
                  <Text style={themedStyles.paymentMethodDescription}>
                    {method.description}
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
            (!selectedMethod || loading) && themedStyles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={themedStyles.payButtonText}>
              {t('payment.proceedToPayment') || 'Tiếp tục thanh toán'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
