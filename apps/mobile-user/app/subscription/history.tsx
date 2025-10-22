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
import { CreditCard, Download, Eye } from 'lucide-react-native';
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

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
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
    { label: 'All Status', value: 'ALL' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Refunded', value: 'REFUNDED' },
  ];

  const methodOptions = [
    { label: 'All Methods', value: 'ALL' },
    { label: 'Credit Card', value: 'CREDIT_CARD' },
    { label: 'Debit Card', value: 'DEBIT_CARD' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'PayPal', value: 'PAYPAL' },
    { label: 'Apple Pay', value: 'APPLE_PAY' },
    { label: 'Google Pay', value: 'GOOGLE_PAY' },
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
    // TODO: Navigate to payment detail
    Alert.alert('Payment Detail', 'Payment detail screen not implemented yet');
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    try {
      // TODO: Implement receipt download
      Alert.alert('Download', 'Receipt download not implemented yet');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      Alert.alert('Error', 'Failed to download receipt');
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
        return '⏳';
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
