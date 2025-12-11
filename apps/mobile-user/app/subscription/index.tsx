import { Button } from '@/components/ui/Button';
import PremiumFeatureCard from '@/components/PremiumFeatureCard';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import { subscriptionService } from '@/services/billing/subscription.service';
import { memberService } from '@/services/member/member.service';
import type { Invoice, Payment, Subscription } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Brain,
  Watch,
  BarChart3,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t, i18n } = useTranslation();

  // Helper function to get subscription status translation
  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('subscription.status.active');
      case 'INACTIVE':
        return t('subscription.status.inactive');
      case 'CANCELLED':
        return t('subscription.status.cancelled');
      case 'EXPIRED':
        return t('subscription.status.expired');
      case 'PENDING':
        return t('subscription.status.pending');
      default:
        return status;
    }
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState<Invoice[]>([]);
  const [memberProfile, setMemberProfile] = useState<any>(null);

  const loadData = async () => {
    if (!member?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch member profile to get expires_at
      let memberProfileData = null;
      try {
        const profileResponse = await memberService.getMemberProfile();
        memberProfileData = profileResponse?.data;
        console.log('[DATA] Member profile loaded:', memberProfileData);
        setMemberProfile(memberProfileData);
      } catch (err) {
        console.warn('Could not load member profile:', err);
      }

      // Load plans first to verify plan_id
      const plansData = await subscriptionService.getMembershipPlans();

      const [subscriptionData, paymentsData, invoicesData] = await Promise.all([
        subscriptionService.getMemberSubscription(member.id),
        paymentService.getMemberPayments(member.id, { limit: 5 }),
        paymentService.getMemberInvoices(member.id, { limit: 3 }),
      ]);

      // Debug: Log subscription data to verify plan_id matches plan object
      if (subscriptionData) {
        const actualPlan = plansData.find(
          (p) => String(p.id) === String(subscriptionData.plan_id)
        );

        // Check member profile for membership type
        const memberPlanType = memberProfileData?.membership_type;
        const memberPlanName = memberProfileData?.membership_type; // Could be BASIC, PREMIUM, VIP, STUDENT

        console.log('[SUBSCRIPTION] Subscription data loaded:', {
          subscriptionPlanId: subscriptionData.plan_id,
          subscriptionPlanName: subscriptionData.plan?.name,
          subscriptionPlanType: subscriptionData.plan?.type,
          planObjectId: subscriptionData.plan?.id,
          actualPlanId: actualPlan?.id,
          actualPlanName: actualPlan?.name,
          actualPlanType: actualPlan?.type,
          memberPlanType: memberPlanType,
          memberExpiresAt: memberProfileData?.expires_at,
          match: subscriptionData.plan_id === subscriptionData.plan?.id,
          actualPlanMatch: subscriptionData.plan_id === actualPlan?.id,
        });

        // If member profile has different plan type, use that instead
        // This ensures we display the correct plan based on member's actual membership_type
        if (memberPlanType) {
          const memberPlan = plansData.find((p) => p.type === memberPlanType);

          if (memberPlan) {
            // Always use member's actual plan type from member service
            // This is the source of truth for what plan the member actually has
            if (memberPlan.id !== subscriptionData.plan_id) {
              console.warn(
                '[WARNING] Plan mismatch: Subscription plan_id does not match member membership_type',
                {
                  subscriptionPlanId: subscriptionData.plan_id,
                  subscriptionPlanType: subscriptionData.plan?.type,
                  memberPlanType: memberPlanType,
                  memberPlanId: memberPlan.id,
                  memberPlanName: memberPlan.name,
                }
              );

              // Use member's actual plan type instead
              subscriptionData.plan_id = memberPlan.id;
              subscriptionData.plan = memberPlan;
              console.log(
                '[SUCCESS] Corrected subscription plan to match member:',
                {
                  oldPlanId: subscriptionData.plan_id,
                  oldPlanName: subscriptionData.plan?.name,
                  newPlanId: memberPlan.id,
                  newPlanName: memberPlan.name,
                  newPlanType: memberPlan.type,
                }
              );
            } else {
              // Plan IDs match, but ensure plan object is correct
              subscriptionData.plan = memberPlan;
            }
          } else {
            console.warn(
              '[WARNING] Could not find plan for membership_type:',
              memberPlanType
            );
          }
        } else if (
          actualPlan &&
          subscriptionData.plan_id !== subscriptionData.plan?.id
        ) {
          console.warn(
            '[WARNING] Plan object mismatch detected, replacing with correct plan'
          );
          subscriptionData.plan = actualPlan;
        }
      }

      setSubscription(subscriptionData);
      setRecentPayments(paymentsData);
      setUpcomingInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert(t('common.error'), t('subscription.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleViewPlans = () => {
    router.push('/subscription/plans');
  };

  const handleViewPaymentHistory = () => {
    router.push('/subscription/history');
  };

  const handleViewInvoices = () => {
    router.push('/subscription/invoices');
  };

  const handleManagePaymentMethods = () => {
    router.push('/subscription/payment-methods');
  };

  const handleUpgradeSubscription = () => {
    router.push('/subscription/plans');
  };

  const handleRenewSubscription = async () => {
    if (!subscription || !member?.id) {
      Alert.alert(t('common.error'), 'Subscription not found');
      return;
    }

    try {
      // Navigate to payment screen for renewal
      router.push({
        pathname: '/subscription/payment',
        params: {
          plan: JSON.stringify(subscription.plan),
          subscriptionId: subscription.id,
          action: 'RENEW',
          amount:
            subscription.total_amount?.toString() ||
            subscription.plan?.price?.toString() ||
            '0',
        },
      });
    } catch (error: any) {
      console.error('Error navigating to renew:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to navigate to renewal'
      );
    }
  };

  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!subscription) return;

    try {
      setLoading(true);
      const reason = cancelReason.trim() || 'User requested cancellation';
      await subscriptionService.cancelSubscription(subscription.id, reason);

      // Optimistic UI update
      setSubscription((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'CANCELLED' };
      });

      Alert.alert(t('common.success'), t('subscription.cancelSuccess'), [
        { text: t('common.ok') },
      ]);

      setShowCancelModal(false);
      setCancelReason('');
      await loadData(); // Reload data to reflect changes
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t('subscription.cancelFailed');

      Alert.alert(t('common.error'), errorMessage, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.retry'),
          onPress: () => handleConfirmCancel(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [member?.id]);

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('common.loading')}...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}>
          {t('subscription.title')}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {subscription ? (
          <View style={styles.subscriptionContainer}>
            <View
              style={[
                styles.subscriptionCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              {(() => {
                // Calculate if subscription is expired
                const expirationDate =
                  subscription.current_period_end ||
                  subscription.end_date ||
                  subscription.next_billing_date ||
                  subscription.nextBillingDate ||
                  (memberProfile?.expires_at
                    ? new Date(memberProfile.expires_at)
                    : null);

                let isExpired = false;
                if (expirationDate) {
                  const endDate = new Date(expirationDate);
                  if (!isNaN(endDate.getTime())) {
                    const now = new Date();
                    const diff = endDate.getTime() - now.getTime();
                    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    isExpired = daysLeft < 0;
                  }
                }

                return (
                  <>
                    <View style={styles.subscriptionHeader}>
                      <Text
                        style={[Typography.h3, { color: theme.colors.text }]}
                      >
                        {subscription.plan?.name ||
                          subscription.plan_id ||
                          t('subscription.unknownPlan')}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              subscription.status === 'ACTIVE' && !isExpired
                                ? theme.colors.success + '20'
                                : theme.colors.error + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            {
                              color:
                                subscription.status === 'ACTIVE' && !isExpired
                                  ? theme.colors.success
                                  : theme.colors.error,
                            },
                          ]}
                        >
                          {isExpired
                            ? t('subscription.status.expired')
                            : getStatusTranslation(subscription.status)}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              })()}

              <Text
                style={[
                  Typography.bodyLarge,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {subscription.plan.description}
              </Text>

              <View style={styles.subscriptionDetails}>
                {/* Helper function to get expiration date */}
                {(() => {
                  // Debug: Log subscription data
                  const memberExpiresAt = memberProfile?.expires_at;
                  console.log('[DATA] Subscription dates:', {
                    current_period_end: subscription.current_period_end,
                    end_date: subscription.end_date,
                    next_billing_date: subscription.next_billing_date,
                    nextBillingDate: subscription.nextBillingDate,
                    member_expires_at: memberExpiresAt,
                    memberProfile: memberProfile,
                    subscription: subscription,
                  });

                  // Priority: current_period_end > end_date > next_billing_date > member.expires_at
                  const expirationDate =
                    subscription.current_period_end ||
                    subscription.end_date ||
                    subscription.next_billing_date ||
                    subscription.nextBillingDate ||
                    (memberExpiresAt ? new Date(memberExpiresAt) : null);

                  console.log(
                    '[DATA] Selected expiration date:',
                    expirationDate
                  );

                  // Always show time remaining, even if date is missing
                  if (!expirationDate) {
                    return (
                      <>
                        {/* Thời hạn còn lại - No date available */}
                        <View style={styles.detailItem}>
                          <Text
                            style={[
                              Typography.caption,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {t('subscription.timeRemaining') ||
                              'Time Remaining'}
                          </Text>
                          <Text
                            style={[
                              Typography.bodyMedium,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {t('subscription.notAvailable') || 'Not available'}
                          </Text>
                        </View>
                      </>
                    );
                  }

                  const endDate = new Date(expirationDate);

                  // Check if date is valid
                  if (isNaN(endDate.getTime())) {
                    console.error('[ERROR] Invalid date:', expirationDate);
                    return (
                      <View style={styles.detailItem}>
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t('subscription.timeRemaining') || 'Time Remaining'}
                        </Text>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            { color: theme.colors.error },
                          ]}
                        >
                          Invalid date
                        </Text>
                      </View>
                    );
                  }

                  const now = new Date();
                  const diff = endDate.getTime() - now.getTime();
                  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  const monthsLeft = Math.floor(daysLeft / 30);
                  const weeksLeft = Math.floor((daysLeft % 30) / 7);
                  const remainingDays = daysLeft % 7;
                  const isExpired = daysLeft < 0;

                  // Format time remaining text
                  // Only add 's' for English, not for Vietnamese
                  const isEnglish =
                    i18n.language === 'en' || i18n.language.startsWith('en');
                  const pluralS = isEnglish ? 's' : '';

                  let timeRemainingText = 'N/A';
                  if (isExpired) {
                    timeRemainingText = t('subscription.expired') || 'Expired';
                  } else if (daysLeft === 0) {
                    timeRemainingText =
                      t('subscription.expiresToday') || 'Expires today';
                  } else if (monthsLeft > 0) {
                    timeRemainingText = `${monthsLeft} ${
                      t('subscription.month') || 'month'
                    }${monthsLeft > 1 ? pluralS : ''}${
                      weeksLeft > 0
                        ? ` ${weeksLeft} ${t('subscription.week') || 'week'}${
                            weeksLeft > 1 ? pluralS : ''
                          }`
                        : ''
                    }`;
                  } else if (weeksLeft > 0) {
                    timeRemainingText = `${weeksLeft} ${
                      t('subscription.week') || 'week'
                    }${weeksLeft > 1 ? pluralS : ''}${
                      remainingDays > 0
                        ? ` ${remainingDays} ${t('subscription.day') || 'day'}${
                            remainingDays > 1 ? pluralS : ''
                          }`
                        : ''
                    }`;
                  } else {
                    timeRemainingText = `${daysLeft} ${
                      t('subscription.day') || 'day'
                    }${daysLeft > 1 ? pluralS : ''}`;
                  }

                  // Determine color based on days left
                  let timeRemainingColor = theme.colors.text;
                  if (daysLeft <= 7) {
                    timeRemainingColor = theme.colors.error;
                  } else if (daysLeft <= 30) {
                    timeRemainingColor = theme.colors.warning;
                  } else {
                    timeRemainingColor = theme.colors.success;
                  }

                  return (
                    <>
                      {/* Thời hạn còn lại */}
                      <View style={styles.detailItem}>
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t('subscription.timeRemaining') || 'Time Remaining'}
                        </Text>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            { color: timeRemainingColor, fontWeight: '600' },
                          ]}
                        >
                          {timeRemainingText}
                        </Text>
                      </View>
                      {/* Ngày hết hạn */}
                      <View style={styles.detailItem}>
                        <Text
                          style={[
                            Typography.caption,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t('subscription.expiresOn') || 'Expires On'}
                        </Text>
                        <Text
                          style={[
                            Typography.bodyMedium,
                            { color: theme.colors.text },
                          ]}
                        >
                          {endDate.toLocaleDateString(
                            i18n.language === 'vi' ? 'vi-VN' : i18n.language,
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: 'Asia/Ho_Chi_Minh',
                            }
                          )}
                        </Text>
                      </View>
                    </>
                  );
                })()}
                {(subscription.nextBillingDate ||
                  subscription.next_billing_date) && (
                  <View style={styles.detailItem}>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t('subscription.nextBilling')}
                    </Text>
                    <Text
                      style={[Typography.body, { color: theme.colors.text }]}
                    >
                      {new Date(
                        subscription.nextBillingDate ||
                          subscription.next_billing_date
                      ).toLocaleDateString(
                        i18n.language === 'vi' ? 'vi-VN' : i18n.language,
                        {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        }
                      )}
                    </Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('subscription.amount')}
                  </Text>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    ${subscription.amount || subscription.total_amount}{' '}
                    {subscription.currency || 'USD'}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('subscription.autoRenew')}
                  </Text>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {t('common.yes')}
                  </Text>
                </View>
              </View>

              <View style={styles.subscriptionActions}>
                {/* Show Renew/Extend button if subscription is expired or expiring soon */}
                {(() => {
                  const expirationDate =
                    subscription.current_period_end ||
                    subscription.end_date ||
                    subscription.next_billing_date ||
                    subscription.nextBillingDate ||
                    (memberProfile?.expires_at
                      ? new Date(memberProfile.expires_at)
                      : null);

                  if (!expirationDate) return null;

                  const endDate = new Date(expirationDate);
                  if (isNaN(endDate.getTime())) return null;

                  const now = new Date();
                  const diff = endDate.getTime() - now.getTime();
                  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft < 0;
                  const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0;

                  // Show renew button if expired or expiring soon
                  if (isExpired || isExpiringSoon) {
                    return (
                      <Button
                        title={
                          t('subscription.plans.extend') ||
                          t('subscription.renew') ||
                          'Gia hạn'
                        }
                        onPress={handleRenewSubscription}
                        style={[
                          styles.actionButton,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      />
                    );
                  }

                  return null;
                })()}

                <Button
                  title={t('subscription.upgradePlan')}
                  onPress={handleUpgradeSubscription}
                  variant="outline"
                  style={styles.actionButton}
                />
                <Button
                  title={t('common.cancel')}
                  onPress={handleCancelSubscription}
                  variant="outline"
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.error },
                  ]}
                />
              </View>
            </View>

            {/* Addons feature removed - not implemented */}

            {/* Premium Features Upgrade Section - Show if user has BASIC plan */}
            {subscription.plan?.type === 'BASIC' && (
              <View style={styles.premiumFeaturesSection}>
                <Text
                  style={[
                    Typography.h4,
                    { color: theme.colors.text, marginBottom: 16 },
                  ]}
                >
                  {t('subscription.premiumFeatures.upgradeTitle', {
                    defaultValue: 'Unlock Premium Features',
                  })}
                </Text>

                {!subscription.plan.smart_workout_plans && (
                  <PremiumFeatureCard
                    title={t(
                      'subscription.premiumFeatures.smartWorkouts.title',
                      {
                        defaultValue: 'Smart Workout Plans',
                      }
                    )}
                    description={t(
                      'subscription.premiumFeatures.smartWorkouts.description',
                      {
                        defaultValue:
                          'AI-generated personalized workout plans based on your goals',
                      }
                    )}
                    icon={<Brain size={24} color={theme.colors.primary} />}
                    isLocked={true}
                    onUpgrade={handleUpgradeSubscription}
                    featureList={[
                      t('subscription.premiumFeatures.smartWorkouts.feature1', {
                        defaultValue: 'AI-powered workout generation',
                      }),
                      t('subscription.premiumFeatures.smartWorkouts.feature2', {
                        defaultValue: 'Personalized exercise recommendations',
                      }),
                    ]}
                  />
                )}

                {!subscription.plan.smart_workout_plans && (
                  <PremiumFeatureCard
                    title={t('subscription.premiumFeatures.analytics.title', {
                      defaultValue: 'Advanced Analytics',
                    })}
                    description={t(
                      'subscription.premiumFeatures.analytics.description',
                      {
                        defaultValue:
                          'Deep insights into your fitness progress and trends',
                      }
                    )}
                    icon={<BarChart3 size={24} color={theme.colors.primary} />}
                    isLocked={true}
                    onUpgrade={handleUpgradeSubscription}
                    featureList={[
                      t('subscription.premiumFeatures.analytics.feature1', {
                        defaultValue: 'Detailed progress reports',
                      }),
                      t('subscription.premiumFeatures.analytics.feature2', {
                        defaultValue: 'Performance trends analysis',
                      }),
                    ]}
                    badge={t('subscription.premiumFeatures.badge', {
                      defaultValue: 'VIP',
                    })}
                  />
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noSubscriptionContainer}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              {t('subscription.noActiveSubscription')}
            </Text>
            <Text
              style={[
                Typography.bodyLarge,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('subscription.choosePlan')}
            </Text>
            <Button
              title={t('subscription.viewPlans')}
              onPress={handleViewPlans}
              style={styles.viewPlansButton}
            />

            {/* Premium Features Section */}
            <View style={styles.premiumFeaturesSection}>
              <Text
                style={[
                  Typography.h4,
                  { color: theme.colors.text, marginBottom: 16 },
                ]}
              >
                {t('subscription.premiumFeatures.title', {
                  defaultValue: 'Premium Features',
                })}
              </Text>

              <PremiumFeatureCard
                title={t('subscription.premiumFeatures.smartWorkouts.title', {
                  defaultValue: 'Smart Workout Plans',
                })}
                description={t(
                  'subscription.premiumFeatures.smartWorkouts.description',
                  {
                    defaultValue:
                      'AI-generated personalized workout plans based on your goals',
                  }
                )}
                icon={<Brain size={24} color={theme.colors.primary} />}
                isLocked={true}
                onUpgrade={handleViewPlans}
                featureList={[
                  t('subscription.premiumFeatures.smartWorkouts.feature1', {
                    defaultValue: 'AI-powered workout generation',
                  }),
                  t('subscription.premiumFeatures.smartWorkouts.feature2', {
                    defaultValue: 'Personalized exercise recommendations',
                  }),
                  t('subscription.premiumFeatures.smartWorkouts.feature3', {
                    defaultValue: 'Adaptive training programs',
                  }),
                ]}
                badge={t('subscription.premiumFeatures.badge', {
                  defaultValue: 'PREMIUM',
                })}
              />

              <PremiumFeatureCard
                title={t('subscription.premiumFeatures.wearable.title', {
                  defaultValue: 'Wearable Integration',
                })}
                description={t(
                  'subscription.premiumFeatures.wearable.description',
                  {
                    defaultValue:
                      'Sync your fitness tracker and smartwatch data',
                  }
                )}
                icon={<Watch size={24} color={theme.colors.primary} />}
                isLocked={true}
                onUpgrade={handleViewPlans}
                featureList={[
                  t('subscription.premiumFeatures.wearable.feature1', {
                    defaultValue: 'Real-time heart rate monitoring',
                  }),
                  t('subscription.premiumFeatures.wearable.feature2', {
                    defaultValue: 'Activity tracking sync',
                  }),
                  t('subscription.premiumFeatures.wearable.feature3', {
                    defaultValue: 'Sleep and recovery insights',
                  }),
                ]}
                badge={t('subscription.premiumFeatures.badge', {
                  defaultValue: 'PREMIUM',
                })}
              />

              <PremiumFeatureCard
                title={t('subscription.premiumFeatures.analytics.title', {
                  defaultValue: 'Advanced Analytics',
                })}
                description={t(
                  'subscription.premiumFeatures.analytics.description',
                  {
                    defaultValue:
                      'Deep insights into your fitness progress and trends',
                  }
                )}
                icon={<BarChart3 size={24} color={theme.colors.primary} />}
                isLocked={true}
                onUpgrade={handleViewPlans}
                featureList={[
                  t('subscription.premiumFeatures.analytics.feature1', {
                    defaultValue: 'Detailed progress reports',
                  }),
                  t('subscription.premiumFeatures.analytics.feature2', {
                    defaultValue: 'Performance trends analysis',
                  }),
                  t('subscription.premiumFeatures.analytics.feature3', {
                    defaultValue: 'Goal achievement tracking',
                  }),
                ]}
                badge={t('subscription.premiumFeatures.badge', {
                  defaultValue: 'VIP',
                })}
              />
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            {t('subscription.quickActions')}
          </Text>

          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleViewPlans}
            >
              <TrendingUp size={24} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                {t('subscription.viewPlans')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleViewPaymentHistory}
            >
              <CreditCard size={24} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Payment History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleViewInvoices}
            >
              <FileText size={24} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Invoices
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={handleManagePaymentMethods}
            >
              <Calendar size={24} color={theme.colors.primary} />
              <Text style={[Typography.body, { color: theme.colors.text }]}>
                Payment Methods
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {recentPayments.length > 0 && (
          <View style={styles.recentPayments}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Recent Payments
            </Text>
            {recentPayments.map((payment) => (
              <View
                key={payment.id}
                style={[
                  styles.paymentItem,
                  { borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.paymentInfo}>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {payment.description || 'Subscription Payment'}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.paymentAmount}>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    ${payment.amount} {payment.currency}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      {
                        color:
                          payment.status === 'COMPLETED'
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {payment.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Cancel Subscription Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCancelModal(false);
          setCancelReason('');
        }}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              {t('subscription.cancelTitle')}
            </Text>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary, marginTop: 8 },
              ]}
            >
              {t('subscription.cancelDescription')}
            </Text>

            <View style={styles.modalInputContainer}>
              <Text style={[Typography.label, { color: theme.colors.text }]}>
                {t('subscription.cancelReason')} ({t('common.optional')})
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder={t('subscription.cancelReasonPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title={t('common.cancel')}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={t('subscription.confirmCancel')}
                onPress={handleConfirmCancel}
                loading={loading}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.error },
                ]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  subscriptionContainer: {
    padding: 16,
  },
  subscriptionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  addonsContainer: {
    marginTop: 16,
  },
  addonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  noSubscriptionContainer: {
    alignItems: 'center',
    padding: 32,
  },
  viewPlansButton: {
    marginTop: 16,
  },
  premiumFeaturesSection: {
    marginTop: 32,
    paddingHorizontal: 16,
    width: '100%',
  },
  quickActions: {
    padding: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  recentPayments: {
    padding: 16,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalInputContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  modalInput: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 100,
    ...Typography.bodyRegular,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
