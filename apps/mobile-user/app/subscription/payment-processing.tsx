import { paymentService } from '@/services/billing/payment.service';
import { subscriptionService } from '@/services/billing/subscription.service';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, Clock, Copy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentAction = 'SUBSCRIBE' | 'UPGRADE' | 'RENEW';

export default function SubscriptionPaymentProcessingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    paymentId: string;
    bankTransferId?: string;
    subscriptionId?: string;
    amount: string;
    qrCodeDataURL?: string;
    action: PaymentAction;
  }>();

  const [bankTransfer, setBankTransfer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(30 * 60); // 30 minutes
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const paymentId = params.paymentId;
  const bankTransferId = params.bankTransferId;
  const amount = parseFloat(params.amount);
  const qrCodeDataURL = params.qrCodeDataURL;
  const action = params.action as PaymentAction;

  useEffect(() => {
    if (bankTransferId) {
      loadBankTransferInfo();
    } else {
      setIsLoading(false);
    }
  }, [bankTransferId]);

  useEffect(() => {
    // Countdown timer
    if (countdown <= 0 || isVerified) {
      if (countdown <= 0 && !isVerified) {
        Alert.alert(
          t('payment.expired') || 'Expired',
          t('payment.transferExpired') || 'Payment transfer has expired',
          [{ text: t('common.ok'), onPress: () => router.back() }]
        );
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isVerified]);

  useEffect(() => {
    // Auto-verify every 10 seconds
    if (isVerified || !bankTransferId) return;

    const verifyInterval = setInterval(async () => {
      await verifyPayment();
    }, 10000);

    return () => clearInterval(verifyInterval);
  }, [isVerified, bankTransferId]);

  const loadBankTransferInfo = async () => {
    try {
      setIsLoading(true);
      if (bankTransferId) {
        const response = await paymentService.getBankTransfer(bankTransferId);
        if (response.success && response.data) {
          setBankTransfer(response.data);
        }
      }
    } catch (error) {
      console.error('Error loading bank transfer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!bankTransferId || isVerifying || isVerified) return;

    try {
      setIsVerifying(true);
      const response = await paymentService.verifyBankTransfer(bankTransferId);

      if (response.success && response.data?.status === 'COMPLETED') {
        setIsVerified(true);
        Alert.alert(
          t('common.success') || 'Success',
          t('payment.paymentVerified') || 'Payment verified successfully!',
          [
            {
              text: t('common.ok'),
              onPress: () => {
                // Reload subscription data and navigate back
                router.replace('/subscription');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      Alert.alert(t('common.success') || 'Copied', t('payment.copiedToClipboard') || 'Copied to clipboard');
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayBankTransfer = bankTransfer || {
    amount: amount,
    transfer_content: `GYM147-${paymentId.substring(0, 8).toUpperCase()}`,
    bank_name: 'VietcomBank',
    bank_code: 'VCB',
    account_number: '1234567890',
    account_name: 'GYM147 FITNESS',
    qr_code_url: qrCodeDataURL,
  };

  if (isLoading) {
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
            {t('common.loading')}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isVerified) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/subscription')}
          >
            <ArrowLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}>
            {t('payment.paymentSuccess') || 'Payment Success'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <CheckCircle size={80} color={theme.colors.success} />
          <Text
            style={[
              Typography.h2,
              { color: theme.colors.text, marginTop: 24, marginBottom: 8 },
            ]}
          >
            {t('payment.paymentVerified') || 'Payment Verified'}
          </Text>
          <Text
            style={[
              Typography.bodyLarge,
              { color: theme.colors.textSecondary, textAlign: 'center' },
            ]}
          >
            {t('payment.paymentSuccessMessage') ||
              'Your payment has been verified successfully. Your subscription has been activated.'}
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
        <Text style={[Typography.h2, { color: theme.colors.text, flex: 1 }]}>
          {t('payment.paymentProcessing') || 'Payment Processing'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Countdown Timer */}
        <View
          style={[
            styles.timerContainer,
            {
              backgroundColor: theme.colors.warning + '20',
              borderColor: theme.colors.warning,
            },
          ]}
        >
          <Clock size={20} color={theme.colors.warning} />
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.warning, marginLeft: 8 },
            ]}
          >
            {t('payment.timeRemaining') || 'Time Remaining'}: {formatTime(countdown)}
          </Text>
        </View>

        {/* QR Code */}
        {(qrCodeDataURL || displayBankTransfer.qr_code_url) && (
          <View
            style={[
              styles.section,
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
              {t('payment.scanQR') || 'Scan QR Code'}
            </Text>
            <View style={styles.qrContainer}>
              <Image
                source={{
                  uri: qrCodeDataURL || displayBankTransfer.qr_code_url,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.textSecondary, marginTop: 16 },
                ]}
              >
                {t('payment.scanWithBankingApp') ||
                  'Scan with your banking app to transfer'}
              </Text>
            </View>
          </View>
        )}

        {/* Amount */}
        <View
          style={[
            styles.section,
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
            {t('payment.transferAmount') || 'Transfer Amount'}
          </Text>
          <Text
            style={[
              Typography.h1,
              { color: theme.colors.primary, marginBottom: 12 },
            ]}
          >
            {formatAmount(parseFloat(displayBankTransfer.amount))}
          </Text>
          <View
            style={[
              styles.warningBox,
              { backgroundColor: theme.colors.warning + '20' },
            ]}
          >
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.warning },
              ]}
            >
              [WARNING] {t('payment.exactAmountWarning') ||
                'Please transfer the exact amount shown above'}
            </Text>
          </View>
        </View>

        {/* Bank Info */}
        <View
          style={[
            styles.section,
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
            {t('payment.bankInformation') || 'Bank Information'}
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('payment.bankName') || 'Bank Name'}
            </Text>
            <Text
              style={[Typography.bodyMedium, { color: theme.colors.text }]}
            >
              {displayBankTransfer.bank_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('payment.accountNumber') || 'Account Number'}
            </Text>
            <TouchableOpacity
              style={styles.copyRow}
              onPress={() =>
                handleCopy(displayBankTransfer.account_number, 'account')
              }
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
              >
                {displayBankTransfer.account_number}
              </Text>
              {copiedField === 'account' ? (
                <CheckCircle size={16} color={theme.colors.success} />
              ) : (
                <Copy size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('payment.accountName') || 'Account Name'}
            </Text>
            <Text
              style={[Typography.bodyMedium, { color: theme.colors.text }]}
            >
              {displayBankTransfer.account_name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[
                Typography.bodyMedium,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('payment.transferContent') || 'Transfer Content'}
            </Text>
            <TouchableOpacity
              style={styles.copyRow}
              onPress={() =>
                handleCopy(displayBankTransfer.transfer_content, 'content')
              }
            >
              <Text
                style={[Typography.bodyMedium, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {displayBankTransfer.transfer_content}
              </Text>
              {copiedField === 'content' ? (
                <CheckCircle size={16} color={theme.colors.success} />
              ) : (
                <Copy size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Instructions */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              Typography.h4,
              { color: theme.colors.text, marginBottom: 12 },
            ]}
          >
            {t('payment.instructions') || 'Instructions'}
          </Text>
          <Text
            style={[
              Typography.bodyMedium,
              { color: theme.colors.textSecondary, lineHeight: 24 },
            ]}
          >
            1. {t('payment.instruction1') || 'Scan the QR code or copy bank information'}{'\n'}
            2. {t('payment.instruction2') || 'Transfer the exact amount shown above'}{'\n'}
            3. {t('payment.instruction3') || 'Include the transfer content in your transfer note'}{'\n'}
            4. {t('payment.instruction4') || 'Payment will be verified automatically within a few minutes'}
          </Text>
        </View>

        {/* Verify Button */}
        <View style={styles.verifyContainer}>
          <Button
            title={
              isVerifying
                ? t('payment.verifying') || 'Verifying...'
                : t('payment.verifyPayment') || 'Verify Payment'
            }
            onPress={verifyPayment}
            disabled={isVerifying}
            variant="outline"
            style={styles.verifyButton}
          />
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrImage: {
    width: 250,
    height: 250,
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  verifyContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  verifyButton: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

