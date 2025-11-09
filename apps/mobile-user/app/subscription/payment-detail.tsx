import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/services/billing/payment.service';
import type { Payment } from '@/types/billingTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
// Note: expo-file-system and expo-sharing need to be installed
// For now, using a simpler approach with Linking
import * as Linking from 'expo-linking';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentId) {
      loadPayment();
    }
  }, [paymentId]);

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      const paymentData = await paymentService.getPaymentById(paymentId);
      setPayment(paymentData);
    } catch (err: any) {
      console.error('Error loading payment:', err);
      setError(err.message || 'Failed to load payment details');
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!payment) return;

    try {
      setDownloading(true);

      // Get receipt URL from backend
      const receiptData = await paymentService.downloadReceipt(paymentId);

      if (receiptData.receiptUrl) {
        // Open receipt URL in browser/download
        const canOpen = await Linking.canOpenURL(receiptData.receiptUrl);
        if (canOpen) {
          await Linking.openURL(receiptData.receiptUrl);
          Alert.alert('Success', 'Receipt opened in browser');
        } else {
          Alert.alert('Error', 'Cannot open receipt URL');
        }
      } else {
        Alert.alert('Error', 'Receipt URL not available');
      }
    } catch (err: any) {
      console.error('Error downloading receipt:', err);
      Alert.alert('Error', err.message || 'Failed to download receipt. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'PENDING':
        return <Clock size={20} color={theme.colors.warning} />;
      case 'FAILED':
        return <XCircle size={20} color={theme.colors.error} />;
      default:
        return <AlertCircle size={20} color={theme.colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return theme.colors.success;
      case 'PENDING':
        return theme.colors.warning;
      case 'FAILED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.textSecondary, marginTop: 16 },
            ]}
          >
            Loading payment details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !payment) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: theme.colors.text }]}>
            Payment Details
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[Typography.bodyLarge, { color: theme.colors.error }]}>
            {error || 'Payment not found'}
          </Text>
          <Button
            title="Retry"
            onPress={loadPayment}
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h2, { color: theme.colors.text }]}>
          Payment Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Status Card */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.statusHeader}>
            {getStatusIcon(payment.status)}
            <Text
              style={[
                Typography.h3,
                { color: getStatusColor(payment.status), marginLeft: 8 },
              ]}
            >
              {payment.status}
            </Text>
          </View>
          <Text
            style={[
              Typography.h1,
              { color: theme.colors.text, marginTop: 16 },
            ]}
          >
            {formatCurrency(payment.amount, payment.currency)}
          </Text>
        </View>

        {/* Payment Information */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              Typography.h4,
              { color: theme.colors.text, marginBottom: 16 },
            ]}
          >
            Payment Information
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              Payment ID
            </Text>
            <Text
              style={[Typography.bodyMedium, { color: theme.colors.text }]}
            >
              {payment.id.substring(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              Payment Method
            </Text>
            <View style={styles.methodRow}>
              <CreditCard size={16} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.text, marginLeft: 8 },
                ]}
              >
                {payment.payment_method || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              Date & Time
            </Text>
            <View style={styles.dateRow}>
              <Calendar size={16} color={theme.colors.textSecondary} />
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.text, marginLeft: 8 },
                ]}
              >
                {formatDate(payment.processed_at || payment.createdAt)}
              </Text>
            </View>
          </View>

          {payment.transaction_id && (
            <View style={styles.infoRow}>
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Transaction ID
              </Text>
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
              >
                {payment.transaction_id}
              </Text>
            </View>
          )}

          {payment.gateway && (
            <View style={styles.infoRow}>
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Gateway
              </Text>
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
              >
                {payment.gateway}
              </Text>
            </View>
          )}

          {payment.payment_type && (
            <View style={styles.infoRow}>
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Payment Type
              </Text>
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
              >
                {payment.payment_type}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {payment.status === 'COMPLETED' && (
            <Button
              title={downloading ? 'Downloading...' : 'Download Receipt'}
              onPress={handleDownloadReceipt}
              disabled={downloading}
              icon={downloading ? undefined : <Download size={20} />}
              style={styles.downloadButton}
            />
          )}

          {payment.status === 'FAILED' && (
            <Button
              title="Retry Payment"
              onPress={() => {
                // Navigate to payment retry
                Alert.alert('Info', 'Retry payment feature coming soon');
              }}
              style={styles.retryButton}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  downloadButton: {
    marginTop: 8,
  },
  retryButton: {
    marginTop: 8,
  },
});

