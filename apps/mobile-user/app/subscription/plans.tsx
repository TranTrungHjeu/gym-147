import PlanCard from '@/components/PlanCard';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/billing/subscription.service';
import { memberService } from '@/services/member/member.service';
import type { MembershipPlan, Subscription } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Star, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        console.log('📅 Member profile loaded in plans:', {
          membership_type: memberProfileData?.membership_type,
          expires_at: memberProfileData?.expires_at,
        });
      } catch (err) {
        console.warn('Could not load member profile in plans:', err);
      }

      const [plansData, subscriptionData] = await Promise.all([
        subscriptionService.getMembershipPlans(),
        subscriptionService.getMemberSubscription(member.id),
      ]);

      // Correct subscription plan based on member's actual membership_type
      if (subscriptionData && memberProfileData?.membership_type) {
        const memberPlanType = memberProfileData.membership_type;
        const memberPlan = plansData.find((p) => p.type === memberPlanType);

        if (memberPlan) {
          console.log('🔍 Checking plan correction in plans.tsx:', {
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
              '⚠️ Plan mismatch in plans.tsx: Subscription plan_id does not match member membership_type',
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
            console.log('✅ Corrected subscription plan in plans.tsx:', {
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
            '⚠️ Could not find plan for membership_type in plans.tsx:',
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

  const handleSubscribe = async () => {
    if (!selectedPlan || !member?.id) {
      Alert.alert(t('common.error'), t('subscription.plans.pleaseSelectPlan'));
      return;
    }

    const planData = plans.find((p) => p.id === selectedPlan);
    if (!planData) {
      Alert.alert(t('common.error'), 'Plan not found');
      return;
    }

    // Navigate to payment screen
    router.push({
      pathname: '/subscription/payment',
      params: {
        planId: selectedPlan,
        action: 'SUBSCRIBE',
        amount: planData.price.toString(),
      },
    });
  };

  const handleRenew = async () => {
    console.log('🔄 handleRenew called', {
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
      console.error('❌ Current plan not found in plans list:', {
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
    console.log('⬆️ handleUpgrade called', {
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
      console.error('❌ Current plan not found in plans list:', {
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

    const priceDifference = selectedPlanData.price - currentPlanData.price;

    // If no additional cost, upgrade directly
    if (priceDifference <= 0) {
      Alert.alert(
        t('subscription.plans.upgradeConfirm') || 'Upgrade Subscription',
        `Upgrade from ${currentPlanData?.name || 'Current Plan'} to ${
          selectedPlanData.name
        }?`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm') || 'Confirm',
            onPress: async () => {
              try {
                setUpgrading(planId);
                await subscriptionService.updateSubscription(
                  currentSubscription.id,
                  {
                    plan_id: planId,
                  }
                );

                await loadData();

                Alert.alert(
                  t('common.success'),
                  t('subscription.plans.subscriptionUpgraded') ||
                    `Successfully upgraded to ${selectedPlanData.name}!`,
                  [
                    {
                      text: t('common.ok'),
                      onPress: () => {
                        router.back();
                      },
                    },
                  ]
                );
              } catch (error: any) {
                console.error('Error upgrading subscription:', error);
                const errorMessage =
                  error?.message ||
                  error?.response?.data?.message ||
                  t('subscription.plans.failedToUpgrade');
                Alert.alert(t('common.error'), errorMessage);
              } finally {
                setUpgrading(null);
              }
            },
          },
        ]
      );
      return;
    }

    // Navigate to payment screen for upgrade with additional cost
    router.push({
      pathname: '/subscription/payment',
      params: {
        plan: JSON.stringify(selectedPlanData),
        subscriptionId: currentSubscription.id,
        action: 'UPGRADE',
        amount: priceDifference.toString(),
      },
    });
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
  const getCurrentPlanId = (): string | null => {
    if (!currentSubscription) return null;

    // Check both plan_id (from API) and plan?.id (from populated plan object)
    const planId = currentSubscription.plan_id || currentSubscription.plan?.id;
    return planId ? String(planId) : null;
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentSubscription) return false;

    const currentPlanId = getCurrentPlanId();
    if (!currentPlanId) return false;

    const comparePlanId = String(planId);

    console.log('🔍 Checking if plan is current:', {
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
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={isCurrentPlan(plan.id)}
            canUpgrade={canUpgrade(plan)}
            isSelected={selectedPlan === plan.id}
            onSelect={() => handleSelectPlan(plan.id)}
            onUpgrade={() => {
              console.log('🔘 onUpgrade callback called', {
                planId: plan.id,
                planName: plan.name,
                isCurrentPlan: isCurrentPlan(plan.id),
                hasSubscription: !!currentSubscription,
              });

              // Nếu plan được chọn là plan hiện tại, gọi handleRenew thay vì handleUpgrade
              if (isCurrentPlan(plan.id)) {
                console.log('🔄 Redirecting to renew');
                handleRenew();
                return;
              }
              if (currentSubscription) {
                console.log('⬆️ Calling handleUpgrade');
                handleUpgrade(plan.id);
              } else {
                console.log('📝 No subscription, calling handleSelectPlan');
                handleSelectPlan(plan.id);
              }
            }}
            onRenew={handleRenew}
            upgrading={upgrading === plan.id}
          />
        ))}
      </ScrollView>
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
    padding: 16,
    paddingBottom: 32,
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
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButton: {
    marginTop: 16,
    width: '100%',
  },
});
