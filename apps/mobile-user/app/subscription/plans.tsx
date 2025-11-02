import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/billing/subscription.service';
import type { MembershipPlan, Subscription } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { Check, Crown, Star, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function PlansScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionService.getMembershipPlans(),
        subscriptionService.getMemberSubscription(user.id),
      ]);

      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading plans data:', error);
      Alert.alert(t('common.error'), t('subscription.plans.failedToLoad'));
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
    if (!selectedPlan || !user?.id) {
      Alert.alert(t('common.error'), t('subscription.plans.pleaseSelectPlan'));
      return;
    }

    try {
      await subscriptionService.createSubscription(user.id, {
        planId: selectedPlan,
        autoRenew: true,
      });
      Alert.alert(
        t('common.success'),
        t('subscription.plans.subscriptionCreated'),
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating subscription:', error);
      Alert.alert(t('common.error'), t('subscription.plans.failedToCreate'));
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!currentSubscription) return;

    try {
      await subscriptionService.updateSubscription(currentSubscription.id, {
        planId: planId,
      });
      Alert.alert(
        t('common.success'),
        t('subscription.plans.subscriptionUpgraded'),
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      Alert.alert(t('common.error'), t('subscription.plans.failedToUpgrade'));
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

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  const canUpgrade = (plan: MembershipPlan) => {
    if (!currentSubscription) return true;
    const planOrder = ['BASIC', 'PREMIUM', 'VIP'];
    const currentIndex = planOrder.indexOf(currentSubscription.plan.type);
    const planIndex = planOrder.indexOf(plan.type);
    return planIndex > currentIndex;
  };

  useEffect(() => {
    loadData();
    setLoading(false);
  }, [user?.id]);

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
            Loading plans...
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
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Membership Plans
        </Text>
        <Text style={[Typography.body, { color: theme.colors.textSecondary }]}>
          Choose the plan that's right for you
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {plans.map((plan) => (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor:
                  selectedPlan === plan.id
                    ? theme.colors.primary
                    : theme.colors.border,
                borderWidth: selectedPlan === plan.id ? 2 : 1,
              },
            ]}
          >
            {isCurrentPlan(plan.id) && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.colors.success },
                ]}
              >
                <Text
                  style={[Typography.caption, { color: theme.colors.surface }]}
                >
                  Current Plan
                </Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View style={styles.planIcon}>{getPlanIcon(plan.type)}</View>
              <View style={styles.planInfo}>
                <Text style={[Typography.h3, { color: theme.colors.text }]}>
                  {plan.name}
                </Text>
                <Text
                  style={[
                    Typography.body,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {plan.description}
                </Text>
              </View>
              <View style={styles.planPrice}>
                <Text
                  style={[Typography.h2, { color: getPlanColor(plan.type) }]}
                >
                  ${plan.price}
                </Text>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  /{plan.billingConfig.interval.toLowerCase()}
                </Text>
              </View>
            </View>

            <View style={styles.planBenefits}>
              <Text style={[Typography.h4, { color: theme.colors.text }]}>
                What's included:
              </Text>
              {plan.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <Check size={16} color={theme.colors.success} />
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.planFeatures}>
              <View style={styles.featureItem}>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Class Credits
                </Text>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  {plan.classCredits}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Guest Passes
                </Text>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  {plan.guestPasses}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Text
                  style={[
                    Typography.caption,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Access Hours
                </Text>
                <Text style={[Typography.body, { color: theme.colors.text }]}>
                  {plan.accessHours}
                </Text>
              </View>
            </View>

            <View style={styles.planActions}>
              {isCurrentPlan(plan.id) ? (
                <Button
                  title="Current Plan"
                  disabled
                  style={styles.currentButton}
                />
              ) : canUpgrade(plan) ? (
                <Button
                  title={currentSubscription ? 'Upgrade' : 'Subscribe'}
                  onPress={() => {
                    if (currentSubscription) {
                      handleUpgrade(plan.id);
                    } else {
                      handleSelectPlan(plan.id);
                    }
                  }}
                  style={[
                    styles.actionButton,
                    { backgroundColor: getPlanColor(plan.type) },
                  ]}
                />
              ) : (
                <Button
                  title="Downgrade"
                  variant="outline"
                  onPress={() => handleSelectPlan(plan.id)}
                  style={styles.actionButton}
                />
              )}
            </View>
          </View>
        ))}

        {selectedPlan && !currentSubscription && (
          <View
            style={[
              styles.subscribeContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              Ready to Subscribe?
            </Text>
            <Text
              style={[Typography.body, { color: theme.colors.textSecondary }]}
            >
              You've selected a plan. Click below to complete your subscription.
            </Text>
            <Button
              title="Complete Subscription"
              onPress={handleSubscribe}
              style={styles.subscribeButton}
            />
          </View>
        )}
      </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  scrollView: {
    flex: 1,
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
