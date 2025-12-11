import { paymentService } from '@/services/billing/payment.service';
import { bookingService } from '@/services/schedule/booking.service';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const BookingPaymentScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Payment data from params
  const bookingId = params.bookingId as string;
  const paymentId = params.paymentId as string;
  const bankTransferId = params.bankTransferId as string;
  const scheduleId = params.scheduleId as string;
  const amount = parseFloat(params.amount as string);
  const qrCodeDataURL = params.qrCodeDataURL as string; // Base64 QR code

  // Bank transfer state
  const [bankTransfer, setBankTransfer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(30 * 60); // 30 minutes in seconds

  useEffect(() => {
    loadBankTransferInfo();
  }, []);

  useEffect(() => {
    // Countdown timer
    if (countdown <= 0 || isVerified) {
      if (countdown <= 0) {
        Alert.alert(t('payment.expired'), t('payment.transferExpired'), [
          { text: t('common.ok'), onPress: () => router.back() },
        ]);
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isVerified]);

  useEffect(() => {
    // Auto-verify every 10 seconds (stop when verified)
    // Only start auto-verify if we have bankTransferId or bankTransfer loaded
    if (isVerified || (!bankTransferId && !bankTransfer)) return;

    const verifyInterval = setInterval(() => {
      if (!isVerifying && !isVerified) {
        handleVerify(true); // Silent verification
      }
    }, 10000);

    return () => clearInterval(verifyInterval);
  }, [isVerifying, isVerified, bankTransferId, bankTransfer]);

  const loadBankTransferInfo = async () => {
    try {
      setIsLoading(true);
      const response = await paymentService.getBankTransfer(paymentId);
      console.log('[BANK] Bank transfer response:', response);
      
      // Handle response structure: { success: true, data: bankTransfer }
      if (response.success && response.data) {
        setBankTransfer(response.data);
      } else if (response.data) {
        // Fallback: if response.data exists directly
        setBankTransfer(response.data);
      } else {
        // Last fallback: use response itself if it's already the data
        setBankTransfer(response);
      }
    } catch (error: any) {
      console.error('Error loading bank transfer:', error);
      Alert.alert(t('common.error'), t('payment.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (silent = false) => {
    try {
      if (!silent) setIsVerifying(true);

      // Get bankTransferId from params, bankTransfer object, or paymentId
      let finalBankTransferId = bankTransferId;
      
      // If not in params, try to get from bankTransfer object
      if (!finalBankTransferId || finalBankTransferId.trim() === '') {
        if (bankTransfer?.id) {
          finalBankTransferId = bankTransfer.id;
          console.log('[INFO] Using bankTransferId from bankTransfer object:', finalBankTransferId);
        } else if (paymentId) {
          // Last resort: try to get bank transfer from paymentId
          try {
            const btResponse = await paymentService.getBankTransfer(paymentId);
            if (btResponse?.id) {
              finalBankTransferId = btResponse.id;
              console.log('[INFO] Fetched bankTransferId from paymentId:', finalBankTransferId);
            }
          } catch (btError) {
            console.warn('[WARNING] Could not fetch bank transfer from paymentId:', btError);
          }
        }
      }

      // Validate bankTransferId before verifying
      if (!finalBankTransferId || finalBankTransferId.trim() === '') {
        throw new Error('Bank transfer ID is required');
      }

      const response = await paymentService.verifyBankTransfer(finalBankTransferId);

      console.log('[VERIFY] Response from backend:', {
        success: response.success,
        data_status: response.data?.status,
        data_payment_status: response.data?.payment?.status,
        message: response.message,
      });

      // Check if transfer is verified (status = VERIFIED or COMPLETED)
      // Response structure: { success: true, data: { status: 'VERIFIED', payment: {...} } }
      const bankTransferData = response.data || response;
      const isVerifiedStatus =
        bankTransferData.status === 'VERIFIED' || bankTransferData.status === 'COMPLETED';
      
      // Also check payment status: COMPLETED, PAID, or SUCCESS
      const paymentData = bankTransferData.payment || response.payment;
      const isPaymentCompleted =
        paymentData?.status === 'COMPLETED' ||
        paymentData?.status === 'PAID' ||
        paymentData?.status === 'SUCCESS';

      // Also check if response indicates success (for "already verified" case)
      const isSuccessResponse = response.success === true && 
        (response.message?.includes('verified') || response.message?.includes('đã xác minh'));

      console.log('[VERIFY] Verification check:', {
        isVerifiedStatus,
        isPaymentCompleted,
        isSuccessResponse,
        bankTransferStatus: bankTransferData.status,
        paymentStatus: paymentData?.status,
      });

      if (isVerifiedStatus || isPaymentCompleted || isSuccessResponse) {
        setIsVerified(true);
        
        // Refresh booking data to get updated status
        if (bookingId) {
          try {
            const bookingResponse = await bookingService.getBookingById(bookingId);
            if (bookingResponse.success && bookingResponse.data) {
              console.log('[SUCCESS] Booking status updated:', bookingResponse.data.status);
            }
          } catch (error) {
            console.warn('[WARNING] Failed to refresh booking status:', error);
          }
        }
        
        if (!silent) {
          Alert.alert(
            t('payment.success'),
            t('payment.verifiedSuccess'),
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  // Navigate to my-bookings page to show updated booking status
                  router.replace({
                    pathname: '/classes/my-bookings',
                    params: { paymentVerified: 'true', refresh: 'true' },
                  });
                },
              },
            ]
          );
        } else {
          // Silent verification - navigate to my-bookings after short delay
          setTimeout(() => {
            router.replace({
              pathname: '/classes/my-bookings',
              params: { paymentVerified: 'true', refresh: 'true' },
            });
          }, 1500); // 1.5 seconds delay to ensure backend processing is complete
        }
      } else if (!silent) {
        Alert.alert(
          t('payment.checking'),
          t('payment.notFoundYet'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error: any) {
      console.error('Verify error:', error);
      if (!silent) {
        Alert.alert(t('common.error'), t('payment.verifyError'));
      }
    } finally {
      if (!silent) setIsVerifying(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(t('common.success'), `${label} ${t('payment.copied')}`);
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            {t('payment.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bankTransfer && !qrCodeDataURL) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {t('payment.loadError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadBankTransferInfo}
          >
            <Text style={[styles.retryButtonText, { color: '#fff' }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayBankTransfer = bankTransfer || {
    amount: amount,
    bank_name: 'VietcomBank',
    account_number: '',
    account_name: 'GYMFIT',
    transfer_content: '',
    qr_code_url: qrCodeDataURL,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (scheduleId) {
              router.replace(`/classes/${scheduleId}`);
            } else {
              router.back();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          {t('payment.bankTransfer')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* QR Code */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('payment.scanQR')}
          </Text>
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: qrCodeDataURL || displayBankTransfer.qr_code_url }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <Text style={[styles.qrHint, { color: theme.colors.textSecondary }]}>
              {t('payment.scanWithBankingApp')}
            </Text>
          </View>
        </View>

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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('payment.transferAmount')}
          </Text>
          <Text style={[styles.amountHighlight, { color: theme.colors.primary }]}>
            {formatAmount(parseFloat(displayBankTransfer.amount))}
          </Text>
          <View
            style={[
              styles.warningBox,
              { backgroundColor: theme.colors.warning + '20' },
            ]}
          >
            <Text style={[styles.warningText, { color: theme.colors.warning }]}>
              [WARNING] {t('payment.exactAmountWarning')}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('payment.bankInformation')}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              {t('payment.bankName')}
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {displayBankTransfer.bank_name || 'VietcomBank'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              {t('payment.accountNumber')}
            </Text>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(
                  displayBankTransfer.account_number || '',
                  t('payment.accountNumber')
                )
              }
              style={styles.copyButton}
            >
              <Text style={[styles.infoValue, { color: theme.colors.primary }]}>
                {displayBankTransfer.account_number || 'N/A'}
              </Text>
              <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
              {t('payment.accountName')}
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {displayBankTransfer.account_name || 'GYMFIT'}
            </Text>
          </View>
        </View>

        {/* Transfer Content */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('payment.transferContent')}
          </Text>
          <TouchableOpacity
            onPress={() =>
              copyToClipboard(
                displayBankTransfer.transfer_content || '',
                t('payment.content')
              )
            }
            style={[
              styles.contentBox,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.contentText, { color: theme.colors.text }]}>
              {displayBankTransfer.transfer_content || 'N/A'}
            </Text>
            <Ionicons name="copy-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <View
            style={[
              styles.warningBox,
              { backgroundColor: theme.colors.error + '20' },
            ]}
          >
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              [WARNING] {t('payment.contentWarning')}
            </Text>
          </View>
        </View>

        {/* Time Remaining */}
        {!isVerified && (
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('payment.timeRemaining')}
            </Text>
            <Text style={[styles.timeRemaining, { color: theme.colors.primary }]}>
              {formatTime(countdown)}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {!isVerified ? (
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: isVerifying ? 0.6 : 1,
              },
            ]}
            onPress={() => handleVerify(false)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.verifyButtonText}>{t('payment.verifyTransfer')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.successBox,
              { backgroundColor: theme.colors.success + '20' },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={[styles.successText, { color: theme.colors.success }]}>
              {t('payment.verifiedSuccess')}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  amountHighlight: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  contentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  timeRemaining: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingPaymentScreen;

