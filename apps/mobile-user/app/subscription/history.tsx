import { Picker } from '@/components/ui/Picker';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Download, Eye } from 'lucide-react-native';
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

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | 'ALL'>(
    'ALL'
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'ALL'>(
    'ALL'
  );

  const statusOptions = [
    { label: t('subscription.billing.statusOptions.all'), value: 'ALL' },
    {
      label: t('subscription.billing.statusOptions.completed'),
      value: 'COMPLETED',
    },
    {
      label: t('subscription.billing.statusOptions.pending'),
      value: 'PENDING',
    },
    { label: t('subscription.billing.statusOptions.failed'), value: 'FAILED' },
    {
      label: t('subscription.billing.statusOptions.cancelled'),
      value: 'CANCELLED',
    },
    {
      label: t('subscription.billing.statusOptions.refunded'),
      value: 'REFUNDED',
    },
  ];

  const methodOptions = [
    { label: t('subscription.paymentMethods.all'), value: 'ALL' },
    {
      label: t('subscription.paymentMethods.creditCard'),
      value: 'CREDIT_CARD',
    },
    { label: t('subscription.paymentMethods.debitCard'), value: 'DEBIT_CARD' },
    {
      label: t('subscription.paymentMethods.bankTransfer'),
      value: 'BANK_TRANSFER',
    },
    { label: t('subscription.paymentMethods.paypal'), value: 'PAYPAL' },
    { label: t('subscription.paymentMethods.applePay'), value: 'APPLE_PAY' },
    { label: t('subscription.paymentMethods.googlePay'), value: 'GOOGLE_PAY' },
  ];

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const paymentsData = await paymentService.getMemberPayments(user.id, {
        limit: 50,
      });
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
    } catch (error) {
      console.error('Error loading payment history:', error);
      Alert.alert('Error', 'Failed to load payment history');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStatusFilter = (status: PaymentStatus | 'ALL') => {
    setSelectedStatus(status);
    filterPayments(status, selectedMethod);
  };

  const handleMethodFilter = (method: PaymentMethod | 'ALL') => {
    setSelectedMethod(method);
    filterPayments(selectedStatus, method);
  };

  const filterPayments = (
    status: PaymentStatus | 'ALL',
    method: PaymentMethod | 'ALL'
  ) => {
    let filtered = payments;

    if (status !== 'ALL') {
      filtered = filtered.filter((payment) => payment.status === status);
    }

    if (method !== 'ALL') {
      filtered = filtered.filter((payment) => payment.method === method);
    }

    setFilteredPayments(filtered);
  };

  const handleViewPayment = (payment: Payment) => {
    router.push({
      pathname: '/subscription/payment-detail',
      params: { paymentId: payment.id },
    });
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      const receiptData = await paymentService.downloadReceipt(payment.id);
      if (receiptData.receiptUrl) {
        const { Linking } = require('expo-linking');
        const canOpen = await Linking.canOpenURL(receiptData.receiptUrl);
        if (canOpen) {
          await Linking.openURL(receiptData.receiptUrl);
          Alert.alert('Success', 'Receipt opened in browser');
        } else {
          Alert.alert('Error', 'Cannot open receipt URL');
        }
      }
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      Alert.alert('Error', error.message || 'Failed to download receipt');
    }
  };

  const handleRetryPayment = async (payment: Payment) => {
    if (payment.status !== 'FAILED') return;

    try {
      await paymentService.retryPayment(payment.id);
      Alert.alert('Success', 'Payment retry initiated');
      loadData();
    } catch (error) {
      console.error('Error retrying payment:', error);
      Alert.alert('Error', 'Failed to retry payment');
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'PENDING':
        return theme.colors.warning;
      case 'FAILED':
        return theme.colors.error;
      case 'CANCELLED':
        return theme.colors.textSecondary;
      case 'REFUNDED':
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return '✓';
      case 'PENDING':
        return '[WAIT]';
      case 'FAILED':
        return '✗';
      case 'CANCELLED':
        return '⊘';
      case 'REFUNDED':
        return '↩';
      default:
        return '?';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            Loading payment history...
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
          Payment History
        </Text>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={[Typography.label, { color: theme.colors.text }]}>
            Status
          </Text>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={handleStatusFilter}
            items={statusOptions}
          />
        </View>
        <View style={styles.filterGroup}>
          <Text style={[Typography.label, { color: theme.colors.text }]}>
            Method
          </Text>
          <Picker
            selectedValue={selectedMethod}
            onValueChange={handleMethodFilter}
            items={methodOptions}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <View
              key={payment.id}
              style={[
                styles.paymentCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  <Text style={[Typography.h4, { color: theme.colors.text }]}>
                    {payment.description || 'Subscription Payment'}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {formatDate(payment.createdAt)}
                  </Text>
                </View>
                <View style={styles.paymentStatus}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: getStatusColor(payment.status) },
                    ]}
                  >
                    {getStatusIcon(payment.status)} {payment.status}
                  </Text>
                </View>
              </View>

              <View style={styles.paymentDetails}>
                <View style={styles.paymentAmount}>
                  <Text style={[Typography.h3, { color: theme.colors.text }]}>
                    {formatAmount(payment.amount, payment.currency)}
                  </Text>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {payment.method.replace('_', ' ')}
                  </Text>
                </View>

                {payment.transactionId && (
                  <View style={styles.transactionInfo}>
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Transaction ID: {payment.transactionId}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.paymentActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => handleViewPayment(payment)}
                >
                  <Eye size={16} color={theme.colors.primary} />
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.primary },
                    ]}
                  >
                    View Details
                  </Text>
                </TouchableOpacity>

                {payment.status === 'COMPLETED' && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => handleDownloadReceipt(payment)}
                  >
                    <Download size={16} color={theme.colors.primary} />
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.primary },
                      ]}
                    >
                      Receipt
                    </Text>
                  </TouchableOpacity>
                )}

                {payment.status === 'FAILED' && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { borderColor: theme.colors.error },
                    ]}
                    onPress={() => handleRetryPayment(payment)}
                  >
                    <CreditCard size={16} color={theme.colors.error} />
                    <Text
                      style={[
                        Typography.caption,
                        { color: theme.colors.error },
                      ]}
                    >
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {payment.processing.failedAt && (
                <View style={styles.errorInfo}>
                  <Text
                    style={[Typography.caption, { color: theme.colors.error }]}
                  >
                    Failed: {payment.processing.failureReason}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <CreditCard size={48} color={theme.colors.textSecondary} />
            <Text style={[Typography.h3, { color: theme.colors.text }]}>
              No Payments Found
            </Text>
            <Text
              style={[Typography.body, { color: theme.colors.textSecondary }]}
            >
              {payments.length === 0
                ? "You haven't made any payments yet"
                : 'No payments match your current filters'}
            </Text>
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
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  filterGroup: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  paymentCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentStatus: {
    alignItems: 'flex-end',
  },
  paymentDetails: {
    marginBottom: 16,
  },
  paymentAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionInfo: {
    marginTop: 4,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  errorInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
});
