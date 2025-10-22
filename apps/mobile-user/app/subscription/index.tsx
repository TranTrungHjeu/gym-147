import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import { subscriptionService } from '@/services/billing/subscription.service';
import type { Invoice, Payment, Subscription } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState<Invoice[]>([]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [subscriptionData, paymentsData, invoicesData] = await Promise.all([
        subscriptionService.getMemberSubscription(user.id),
        paymentService.getMemberPayments(user.id, { limit: 5 }),
        paymentService.getMemberInvoices(user.id, { limit: 3 }),
      ]);

      setSubscription(subscriptionData);
      setRecentPayments(paymentsData);
      setUpcomingInvoices(invoicesData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
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

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cancellation
            Alert.alert(
              'Cancellation',
              'Subscription cancellation not implemented yet'
            );
          },
        },
      ]
    );
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
            Loading subscription...
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
          Subscription
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
              <View style={styles.subscriptionHeader}>
                <Text style={[Typography.h3, { color: theme.colors.text }]}>
                  {subscription.plan.name}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        subscription.status === 'ACTIVE'
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
                          subscription.status === 'ACTIVE'
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {subscription.status}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  Typography.bodyLarge,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {subscription.plan.description}
              </Text>

              <View style={styles.subscriptionDetails}>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Next Billing
                  </Text>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {new Date(
                      subscription.nextBillingDate
                    ).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Amount
                  </Text>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    ${subscription.amount} {subscription.currency}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Auto Renew
                  </Text>
                  <Text style={[Typography.body, { color: theme.colors.text }]}>
                    {subscription.autoRenew ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>

              <View style={styles.subscriptionActions}>
                <Button
                  title="Upgrade Plan"
                  onPress={handleUpgradeSubscription}
                  variant="outline"
                  style={styles.actionButton}
                />
                <Button
                  title="Cancel"
                  onPress={handleCancelSubscription}
                  variant="outline"
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.error },
                  ]}
                />
              </View>
            </View>

            {subscription.addons.length > 0 && (
              <View style={styles.addonsContainer}>
                <Text style={[Typography.h3, { color: theme.colors.text }]}>
                  Active Add-ons
                </Text>
                {subscription.addons.map((addon) => (
                  <View
                    key={addon.id}
                    style={[
                      styles.addonItem,
                      { borderColor: theme.colors.border },
                    ]}
                  >
                    <Text
                      style={[Typography.body, { color: theme.colors.text }]}
                    >
                      {addon.addon.name}
                    </Text>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      ${addon.price} {subscription.currency}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noSubscriptionContainer}>
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              No Active Subscription
            </Text>
            <Text
              style={[
                Typography.bodyLarge,
                { color: theme.colors.textSecondary },
              ]}
            >
              Choose a plan to get started with premium features
            </Text>
            <Button
              title="View Plans"
              onPress={handleViewPlans}
              style={styles.viewPlansButton}
            />
          </View>
        )}

        <View style={styles.quickActions}>
          <Text style={[Typography.h3, { color: theme.colors.text }]}>
            Quick Actions
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
                View Plans
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
});
