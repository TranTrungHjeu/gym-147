import PlanCard from '@/components/PlanCard';
import PremiumFeatureCard from '@/components/PremiumFeatureCard';
import UpgradeDowngradeModal from '@/components/UpgradeDowngradeModal'; // IMPROVEMENT: Upgrade/downgrade modal
import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billing/billing.service';
import { subscriptionService } from '@/services/billing/subscription.service';
import { memberService } from '@/services/member/member.service';
import type { MembershipPlan, Subscription } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Crown,
  Star,
  Zap,
  Brain,
  Watch,
  BarChart3,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Continue Button Component with Animation
function ContinueButton({
  onPress,
  theme,
  t,
}: {
  onPress: () => void;
  theme: any;
  t: any;
}) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Slide up and fade in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.subscribeContainer,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.subscribeButton,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text
          style={[
            Typography.bodyLarge,
            {
              color: '#FFFFFF',
              textAlign: 'center',
              fontWeight: '700',
            },
          ]}
        >
          {t('subscription.plans.continue', { defaultValue: 'Tiếp tục' })}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, member } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const loadData = async () => {
    if (!member?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch member profile to get membership_type (source of truth)
      let memberProfileData = null;
      try {
        const profileResponse = await memberService.getMemberProfile();
        memberProfileData = profileResponse?.data;
        console.log('[DATA] Member profile loaded in plans:', {
          membership_type: memberProfileData?.membership_type,
          expires_at: memberProfileData?.expires_at,
        });
      } catch (err) {
        console.warn('Could not load member profile in plans:', err);
      }

      const [plansData, subscriptionsData] = await Promise.all([
        subscriptionService.getMembershipPlans(),
        billingService.getMemberSubscriptions(member.id),
      ]);

      // Select best active subscription (highest tier) - same logic as login
      let subscriptionData = null;
      if (subscriptionsData && subscriptionsData.length > 0) {
        // Find all active subscriptions (còn hạn)
        const activeSubscriptions = subscriptionsData.filter((sub: any) => {
          // Check if subscription is ACTIVE/TRIAL and not expired
          if (!['ACTIVE', 'TRIAL'].includes(sub.status)) return false;

          const expirationDate = sub.current_period_end || sub.end_date;
          if (expirationDate) {
            const expiration = new Date(expirationDate);
            const now = new Date();
            if (expiration < now) return false; // Expired
          } else {
            return false; // No expiration date
          }

          // For ACTIVE: must have at least one COMPLETED payment
          if (sub.status === 'ACTIVE') {
            const payments = sub.payments || [];
            const completedPayments = payments.filter(
              (p: any) => p.status === 'COMPLETED'
            );
            if (completedPayments.length === 0) return false;
          }

          return true;
        });

        // If multiple active subscriptions, choose the one with highest plan tier
        if (activeSubscriptions.length > 0) {
          const planTierOrder: { [key: string]: number } = {
            VIP: 4,
            PREMIUM: 3,
            BASIC: 2,
            STUDENT: 1,
          };

          subscriptionData = activeSubscriptions.reduce(
            (highest: any, current: any) => {
              const currentTier =
                planTierOrder[current.plan?.type || 'BASIC'] || 0;
              const highestTier =
                planTierOrder[highest.plan?.type || 'BASIC'] || 0;
              return currentTier > highestTier ? current : highest;
            }
          );

          console.log('[PLANS] Selected best subscription for upgrade check:', {
            totalSubscriptions: subscriptionsData.length,
            totalActive: activeSubscriptions.length,
            selectedPlanType: subscriptionData.plan?.type,
            selectedSubscriptionId: subscriptionData.id,
            allActivePlans: activeSubscriptions.map((s: any) => s.plan?.type),
          });
        } else {
          // Fallback: use first subscription if no active ones found
          subscriptionData = subscriptionsData[0];
          console.log(
            '[PLANS] No active subscriptions found, using first subscription:',
            {
              subscriptionId: subscriptionData?.id,
              planType: subscriptionData?.plan?.type,
            }
          );
        }
      }

      // Correct subscription plan based on member's actual membership_type
      if (subscriptionData && memberProfileData?.membership_type) {
        const memberPlanType = memberProfileData.membership_type;
        const memberPlan = plansData.find((p) => p.type === memberPlanType);

        if (memberPlan) {
          console.log('[SEARCH] Checking plan correction in plans.tsx:', {
            subscriptionPlanId: subscriptionData.plan_id,
            subscriptionPlanType: subscriptionData.plan?.type,
            memberPlanType: memberPlanType,
            memberPlanId: memberPlan.id,
            memberPlanName: memberPlan.name,
            match: memberPlan.id === subscriptionData.plan_id,
          });

          // Always use member's actual plan type from member service
          if (memberPlan.id !== subscriptionData.plan_id) {
            console.warn(
              '[WARNING] Plan mismatch in plans.tsx: Subscription plan_id does not match member membership_type',
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
            console.log('[SUCCESS] Corrected subscription plan in plans.tsx:', {
              newPlanId: memberPlan.id,
              newPlanName: memberPlan.name,
              newPlanType: memberPlan.type,
            });
          } else {
            // Plan IDs match, but ensure plan object is correct
            subscriptionData.plan = memberPlan;
          }
        } else {
          console.warn(
            '[WARNING] Could not find plan for membership_type in plans.tsx:',
            memberPlanType
          );
        }
      }

      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading plans data:', error);
      Alert.alert(t('common.error'), t('subscription.plans.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async (planId?: string) => {
    const targetPlanId = planId || selectedPlan;

    if (!targetPlanId) {
      Alert.alert(t('common.error'), t('subscription.plans.pleaseSelectPlan'));
      return;
    }

    const planData = plans.find((p) => p.id === targetPlanId);
    if (!planData) {
      Alert.alert(t('common.error'), 'Plan not found');
      return;
    }

    // Khi chưa có subscription, có thể chưa có member
    // Payment screen sẽ tự xử lý việc tạo member nếu cần
    // Navigate to payment screen
    router.push({
      pathname: '/subscription/payment',
      params: {
        planId: targetPlanId,
        action: 'SUBSCRIBE',
        amount: planData.price.toString(),
      },
    });
  };

  const handleRenew = async () => {
    console.log('[RENEW] handleRenew called', {
      hasSubscription: !!currentSubscription,
      memberId: member?.id,
    });

    if (!currentSubscription || !member?.id) {
      Alert.alert(
        t('common.error'),
        'Please ensure you have an active subscription'
      );
      return;
    }

    const currentPlanId = getCurrentPlanId();
    if (!currentPlanId) {
      Alert.alert(t('common.error'), 'Current plan ID not found');
      return;
    }

    const currentPlanData = plans.find((p) => String(p.id) === currentPlanId);
    if (!currentPlanData) {
      console.error('[ERROR] Current plan not found in plans list:', {
        currentPlanId,
        availablePlanIds: plans.map((p) => p.id),
        subscriptionPlanId: currentSubscription.plan_id,
        planObjectId: currentSubscription.plan?.id,
      });
      Alert.alert(
        t('common.error'),
        'Current plan not found in available plans'
      );
      return;
    }

    // Navigate to payment screen for renewal
    router.push({
      pathname: '/subscription/payment',
      params: {
        plan: JSON.stringify(currentPlanData),
        subscriptionId: currentSubscription.id,
        action: 'RENEW',
        amount:
          currentSubscription.total_amount?.toString() ||
          currentPlanData.price.toString(),
      },
    });
  };

  const handleUpgrade = async (planId: string) => {
    console.log('[UPGRADE] handleUpgrade called', {
      planId,
      hasSubscription: !!currentSubscription,
      memberId: member?.id,
    });

    if (!currentSubscription || !member?.id) {
      Alert.alert(
        t('common.error'),
        'Please ensure you have an active subscription'
      );
      return;
    }

    // Nếu plan được chọn là plan hiện tại, chuyển sang renew thay vì upgrade
    if (isCurrentPlan(planId)) {
      handleRenew();
      return;
    }

    const selectedPlanData = plans.find((p) => String(p.id) === String(planId));
    if (!selectedPlanData) {
      Alert.alert(t('common.error'), 'Selected plan not found');
      return;
    }

    const currentPlanId = getCurrentPlanId();
    if (!currentPlanId) {
      Alert.alert(t('common.error'), 'Current plan ID not found');
      return;
    }

    const currentPlanData = plans.find((p) => String(p.id) === currentPlanId);
    if (!currentPlanData) {
      console.error('[ERROR] Current plan not found in plans list:', {
        currentPlanId,
        availablePlanIds: plans.map((p) => p.id),
        subscriptionPlanId: currentSubscription.plan_id,
        planObjectId: currentSubscription.plan?.id,
      });
      Alert.alert(
        t('common.error'),
        'Current plan not found in available plans'
      );
      return;
    }

    // IMPROVEMENT: Calculate prorated amount
    const now = new Date();
    const periodStart = new Date(
      currentSubscription.current_period_start || currentSubscription.start_date
    );
    const periodEnd = new Date(
      currentSubscription.current_period_end ||
        currentSubscription.end_date ||
        new Date()
    );
    const totalPeriodDays =
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining =
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    const oldPrice = currentPlanData.price;
    const newPrice = selectedPlanData.price;
    const unusedAmount = (daysRemaining / totalPeriodDays) * oldPrice;
    const newPlanCost = (daysRemaining / totalPeriodDays) * newPrice;
    const priceDifference = newPlanCost - unusedAmount;
    const isUpgrade = newPrice > oldPrice;

    // IMPROVEMENT: Show upgrade/downgrade modal with prorated calculation
    setShowUpgradeModal(true);
    setUpgradeData({
      currentPlan: currentPlanData,
      newPlan: selectedPlanData,
      proratedCalculation: {
        unusedAmount,
        newPlanCost,
        priceDifference,
        daysRemaining,
        totalPeriodDays,
      },
      isUpgrade,
    });
  };

  // IMPROVEMENT: State for upgrade/downgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeData, setUpgradeData] = useState<{
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
  } | null>(null);

  const handleConfirmUpgradeDowngrade = async () => {
    if (!upgradeData || !currentSubscription) return;

    try {
      setUpgrading(upgradeData.newPlan.id);
      setShowUpgradeModal(false);

      // Log detailed information for debugging
      const currentPlanId = getCurrentPlanId();
      console.log('[UPGRADE] Upgrade request details:', {
        subscriptionId: currentSubscription.id,
        currentPlanId,
        currentPlanIdType: typeof currentPlanId,
        newPlanId: upgradeData.newPlan.id,
        newPlanIdType: typeof upgradeData.newPlan.id,
        newPlanType: upgradeData.newPlan.type,
        currentPlanType: upgradeData.currentPlan.type,
        subscriptionPlanId: currentSubscription.plan_id,
        subscriptionPlanIdType: typeof currentSubscription.plan_id,
        planObjectId: currentSubscription.plan?.id,
        planObjectIdType: typeof currentSubscription.plan?.id,
      });

      // IMPROVEMENT: Use upgrade-downgrade endpoint
      const result = await subscriptionService.upgradeDowngradeSubscription(
        currentSubscription.id,
        {
          new_plan_id: String(upgradeData.newPlan.id), // Ensure it's a string
          change_reason: upgradeData.isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
        }
      );

      console.log('[UPGRADE] upgradeDowngradeSubscription result:', {
        change_type: result.change_type,
        price_difference: result.price_difference,
        payment: result.payment,
        payment_id: result.payment?.id,
      });

      await loadData();

      // Show success message
      if (result.change_type === 'UPGRADE' && result.price_difference > 0) {
        // Navigate to payment for upgrade
        // Pass paymentId if available (payment was created by upgradeDowngradeSubscription)
        const paymentId = result.payment?.id;
        console.log(
          '[UPGRADE] Passing paymentId to payment screen:',
          paymentId
        );
        router.push({
          pathname: '/subscription/payment',
          params: {
            plan: JSON.stringify(upgradeData.newPlan),
            subscriptionId: currentSubscription.id,
            action: 'UPGRADE',
            amount: result.price_difference.toString(),
            ...(paymentId ? { paymentId: String(paymentId) } : {}),
          },
        });
      } else {
        // Downgrade or free upgrade - show success
        Alert.alert(
          t('common.success'),
          t('subscription.plans.subscriptionUpgraded') ||
            `Successfully ${
              upgradeData.isUpgrade ? 'upgraded' : 'downgraded'
            } to ${upgradeData.newPlan.name}!`,
          [
            {
              text: t('common.ok'),
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error upgrading/downgrading subscription:', error);
      const errorMessage =
        error?.message ||
        error?.response?.data?.message ||
        t('subscription.plans.failedToUpgrade');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setUpgrading(null);
      setUpgradeData(null);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'BASIC':
        return <Zap size={24} color={theme.colors.primary} />;
      case 'PREMIUM':
        return <Star size={24} color={theme.colors.warning} />;
      case 'VIP':
        return <Crown size={24} color={theme.colors.error} />;
      default:
        return <Zap size={24} color={theme.colors.primary} />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'BASIC':
        return theme.colors.primary;
      case 'PREMIUM':
        return theme.colors.warning;
      case 'VIP':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  // Helper function to get current plan ID consistently
  // IMPORTANT: Use plan from last COMPLETED payment, not subscription.plan_id
  // Because subscription.plan_id may be updated by upgrade but payment not completed yet
  const getCurrentPlanId = (): string | null => {
    if (!currentSubscription) return null;

    // Check payments to find the plan from last COMPLETED payment
    // Note: payments may not be included in subscription object, so use type assertion
    const payments = (currentSubscription as any).payments || [];
    const completedPayments = payments.filter(
      (p: any) => p.status === 'COMPLETED'
    );

    // If there's a COMPLETED payment, check if it has plan info
    // Otherwise, use subscription.plan_id as fallback
    if (completedPayments.length > 0) {
      // Get the latest COMPLETED payment
      const latestCompletedPayment = completedPayments[0];

      // Check if payment has subscription info with plan
      if (latestCompletedPayment.subscription?.plan_id) {
        const planIdFromPayment = latestCompletedPayment.subscription.plan_id;
        console.log('[PLANS] Using plan from COMPLETED payment:', {
          paymentId: latestCompletedPayment.id,
          planIdFromPayment,
          subscriptionPlanId: currentSubscription.plan_id,
          match: planIdFromPayment === currentSubscription.plan_id,
        });
        return String(planIdFromPayment);
      }
    }

    // Fallback: Check both plan_id (from API) and plan?.id (from populated plan object)
    // But also check if there are PENDING payments for upgrade
    const pendingPayments = payments.filter(
      (p: any) => p.status === 'PENDING' || p.status === 'PROCESSING'
    );

    if (pendingPayments.length > 0) {
      console.log(
        '[PLANS] Warning: Subscription has PENDING payments, plan_id may be updated but not paid:',
        {
          subscriptionPlanId: currentSubscription.plan_id,
          pendingPaymentsCount: pendingPayments.length,
          completedPaymentsCount: completedPayments.length,
        }
      );
      // If there are PENDING payments, the subscription.plan_id might be from an unpaid upgrade
      // In this case, we should use the plan from the last COMPLETED payment's subscription
      // But if we don't have that info, we'll use subscription.plan_id as is
      // The backend will handle the duplicate upgrade check
    }

    const planId = currentSubscription.plan_id || currentSubscription.plan?.id;
    return planId ? String(planId) : null;
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentSubscription) return false;

    const currentPlanId = getCurrentPlanId();
    if (!currentPlanId) return false;

    const comparePlanId = String(planId);

    console.log('[SEARCH] Checking if plan is current:', {
      planId: comparePlanId,
      currentPlanId,
      subscriptionPlanId: currentSubscription.plan_id,
      planObjectId: currentSubscription.plan?.id,
      match: currentPlanId === comparePlanId,
    });

    return currentPlanId === comparePlanId;
  };

  const canUpgrade = (plan: MembershipPlan) => {
    // If plan is current plan, don't show upgrade button (will show renew instead)
    if (isCurrentPlan(plan.id)) {
      return false;
    }

    // If no subscription, all plans are available
    if (!currentSubscription) {
      return true;
    }

    // If subscription exists but no plan data, allow upgrade
    if (!currentSubscription.plan) {
      return true;
    }

    const planOrder = ['BASIC', 'PREMIUM', 'VIP'];
    const currentPlanType = currentSubscription.plan?.type || 'BASIC';
    const currentIndex = planOrder.indexOf(currentPlanType);
    const planIndex = planOrder.indexOf(plan.type);

    // Can upgrade if plan is higher tier, or same tier (for switching)
    return planIndex >= currentIndex;
  };

  useEffect(() => {
    loadData();
  }, [member?.id]);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('subscription.plans.loading') || 'Loading plans...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[Typography.h2, { color: theme.colors.text }]}>
            {t('subscription.plans.title')}
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t('subscription.plans.subtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Premium Features Overview Section - Only show when no subscription */}
        {!currentSubscription && (
          <View style={styles.premiumFeaturesSection}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  Typography.h2,
                  { color: theme.colors.text, marginBottom: 8 },
                ]}
              >
                {t('subscription.plans.premiumFeatures.title', {
                  defaultValue: 'Premium Features',
                })}
              </Text>
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.textSecondary, marginBottom: 24 },
                ]}
              >
                {t('subscription.plans.premiumFeatures.subtitle', {
                  defaultValue:
                    'Unlock advanced features with our premium plans',
                })}
              </Text>
            </View>

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
              isLocked={false}
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
                defaultValue: 'PREMIUM+',
              })}
            />

            <PremiumFeatureCard
              title={t('subscription.premiumFeatures.wearable.title', {
                defaultValue: 'Wearable Integration',
              })}
              description={t(
                'subscription.premiumFeatures.wearable.description',
                {
                  defaultValue: 'Sync your fitness tracker and smartwatch data',
                }
              )}
              icon={<Watch size={24} color={theme.colors.primary} />}
              isLocked={false}
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
                defaultValue: 'PREMIUM+',
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
              isLocked={false}
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
        )}

        {/* Plans List */}
        <View
          style={[
            styles.plansSection,
            !currentSubscription && styles.plansSectionNoSubscription,
          ]}
        >
          <Text
            style={[
              !currentSubscription ? Typography.h2 : Typography.h3,
              {
                color: theme.colors.text,
                marginBottom: !currentSubscription ? 8 : 16,
              },
            ]}
          >
            {!currentSubscription
              ? t('subscription.plans.choosePlan', {
                  defaultValue: 'Choose Your Plan',
                })
              : t('subscription.plans.availablePlans', {
                  defaultValue: 'Available Plans',
                })}
          </Text>
          {!currentSubscription && (
            <Text
              style={[
                Typography.bodyMedium,
                {
                  color: theme.colors.textSecondary,
                  marginBottom: 20,
                },
              ]}
            >
              {t('subscription.plans.selectPlanDescription', {
                defaultValue: 'Select a plan to get started',
              })}
            </Text>
          )}
        </View>

        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text
              style={[
                Typography.bodyLarge,
                { color: theme.colors.textSecondary, textAlign: 'center' },
              ]}
            >
              {t('subscription.plans.noPlansAvailable', {
                defaultValue: 'No plans available at the moment',
              })}
            </Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {plans.map((plan) => {
              const handlePlanUpgrade = () => {
                console.log('🔘 onUpgrade callback called', {
                  planId: plan.id,
                  planName: plan.name,
                  isCurrentPlan: isCurrentPlan(plan.id),
                  hasSubscription: !!currentSubscription,
                });

                // Nếu plan được chọn là plan hiện tại, gọi handleRenew thay vì handleUpgrade
                if (isCurrentPlan(plan.id)) {
                  console.log('[RENEW] Redirecting to renew');
                  handleRenew();
                  return;
                }
                if (currentSubscription) {
                  console.log('[UPGRADE] Calling handleUpgrade');
                  handleUpgrade(plan.id);
                } else {
                  // Khi chưa có subscription, nhấn subscribe chỉ chọn plan (không navigate)
                  console.log('[SELECT] No subscription, selecting plan');
                  handleSelectPlan(plan.id);
                }
              };

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan(plan.id)}
                  canUpgrade={canUpgrade(plan)}
                  isSelected={selectedPlan === plan.id}
                  onSelect={() => {
                    console.log('[SELECT] Plan selected:', plan.id);
                    handleSelectPlan(plan.id);
                  }}
                  onUpgrade={handlePlanUpgrade}
                  onRenew={handleRenew}
                  upgrading={upgrading === plan.id}
                />
              );
            })}
          </View>
        )}

        {/* Continue Button - Only show when plan is selected and no subscription */}
        {!currentSubscription && selectedPlan && (
          <ContinueButton
            onPress={() => handleSubscribe()}
            theme={theme}
            t={t}
          />
        )}
      </ScrollView>

      {/* IMPROVEMENT: Upgrade/Downgrade Modal */}
      {upgradeData && (
        <UpgradeDowngradeModal
          visible={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            setUpgradeData(null);
          }}
          onConfirm={handleConfirmUpgradeDowngrade}
          currentPlan={upgradeData.currentPlan}
          newPlan={upgradeData.newPlan}
          proratedCalculation={upgradeData.proratedCalculation}
          isUpgrade={upgradeData.isUpgrade}
          loading={upgrading !== null}
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  premiumFeaturesSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    marginBottom: 20,
  },
  plansSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  plansSectionNoSubscription: {
    marginTop: 0,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plansList: {
    width: '100%',
    alignItems: 'center',
  },
  planCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  planInfo: {
    flex: 1,
  },
  planPrice: {
    alignItems: 'flex-end',
  },
  planBenefits: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  planFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  featureItem: {
    alignItems: 'center',
  },
  planActions: {
    marginTop: 8,
  },
  currentPlanActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: '100%',
  },
  currentButton: {
    width: '100%',
    opacity: 0.6,
  },
  subscribeContainer: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  subscribeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
