import { paymentService } from '@/services/billing/payment.service';
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterBankTransferScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Payment data from params
  const paymentId = params.paymentId as string;
  const bankTransferId = params.bankTransferId as string;
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
    if (isVerified) return;

    const verifyInterval = setInterval(() => {
      if (!isVerifying && !isVerified) {
        handleVerify(true); // Silent verification
      }
    }, 10000);

    return () => clearInterval(verifyInterval);
  }, [isVerifying, isVerified]);

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

      console.log('[SEARCH] Verifying bank transfer...', {
        bankTransferId,
        silent,
      });
      const response = await paymentService.verifyBankTransfer(bankTransferId);
      console.log('[RESPONSE] Verify response:', response);

      // Handle response structure: { success: true, data: { status, payment: {...} } }
      const responseData = response.data || response;
      const status =
        responseData?.status || (responseData as any)?.data?.status;
      const paymentStatus =
        responseData?.payment?.status ||
        (responseData as any)?.data?.payment?.status;
      const checking = (responseData as any)?.checking || false;

      // Check if transfer is verified (status = VERIFIED or COMPLETED)
      const isVerifiedStatus = status === 'VERIFIED' || status === 'COMPLETED';
      const isPaymentCompleted = paymentStatus === 'COMPLETED';

      console.log('[CHECK] Verification status:', {
        status,
        paymentStatus,
        isVerifiedStatus,
        isPaymentCompleted,
        responseSuccess: response.success,
        checking,
      });

      if (
        isVerifiedStatus ||
        isPaymentCompleted ||
        (response.success && status === 'VERIFIED')
      ) {
        // Payment verified!
        console.log('[SUCCESS] Payment verified successfully! Redirecting...');
        setIsVerified(true);

        // Small delay to ensure state updates
        setTimeout(() => {
          console.log('[NAV] Navigating to profile screen...');
          console.log('[NAV] Current params:', params);
          console.log('[NAV] Navigation params:', {
            ...params,
            paymentVerified: 'true',
          });

          // Use router.push instead of router.replace for better reliability
          router.push({
            pathname: '/(auth)/register-profile',
            params: {
              ...params,
              paymentVerified: 'true',
            },
          });
          console.log('[NAV] Navigation command sent');
        }, 100);
      } else if (!silent && (response.success === false || checking)) {
        console.log('[WAIT] Transfer not found yet');
        Alert.alert(t('payment.checking'), t('payment.notFoundYet'));
      } else {
        console.log('[ERROR] Verification failed:', response);
      }
    } catch (error: any) {
      console.error('[ERROR] Error verifying transfer:', error);
      if (!silent) {
        Alert.alert(t('common.error'), t('payment.verifyError'));
      }
    } finally {
      if (!silent) setIsVerifying(false);
    }
  };

  const handleCopyText = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(t('common.success'), `${label} ${t('payment.copied')}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' ₫';
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      paddingTop: 45,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    content: {
      flex: 1,
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    qrContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    qrImage: {
      width: 250,
      height: 250,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    },
    qrHint: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
      textAlign: 'center',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 2,
      marginRight: 8,
    },
    copyButton: {
      padding: 8,
    },
    amountHighlight: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
      textAlign: 'center',
    },
    warningBox: {
      backgroundColor: theme.colors.warning + '20',
      padding: 12,
      borderRadius: 8,
      marginTop: 12,
    },
    warningText: {
      fontSize: 12,
      color: theme.colors.warning,
      lineHeight: 18,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    timerText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
      marginLeft: 8,
    },
    buttonContainer: {
      padding: 16,
      gap: 12,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 12,
      gap: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textInverse,
    },
    buttonTextSecondary: {
      color: theme.colors.text,
    },
  });

  if (isLoading) {
    return (
      <View
        style={[
          themedStyles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>
          {t('payment.loading')}
        </Text>
      </View>
    );
  }

  if (!bankTransfer) {
    return (
      <View
        style={[
          themedStyles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={theme.colors.error}
        />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>
          {t('payment.loadError')}
        </Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      {/* Header */}
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themedStyles.headerTitle}>
          {t('payment.bankTransfer')}
        </Text>
      </View>

      {/* Timer */}
      <View style={themedStyles.timerContainer}>
        <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
        <Text style={themedStyles.timerText}>
          {t('payment.timeRemaining')}: {formatTime(countdown)}
        </Text>
      </View>

      <ScrollView style={themedStyles.content}>
        {/* QR Code */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>{t('payment.scanQR')}</Text>
          <View style={themedStyles.qrContainer}>
            <Image
              source={{ uri: qrCodeDataURL || bankTransfer.qr_code_url }}
              style={themedStyles.qrImage}
              resizeMode="contain"
            />
            <Text style={themedStyles.qrHint}>
              {t('payment.scanWithBankingApp')}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>
            {t('payment.transferAmount')}
          </Text>
          <Text style={themedStyles.amountHighlight}>
            {formatAmount(parseFloat(bankTransfer.amount))}
          </Text>
          <View style={themedStyles.warningBox}>
            <Text style={themedStyles.warningText}>
              [WARNING] {t('payment.exactAmountWarning')}
            </Text>
          </View>
        </View>

        {/* Bank Info */}
        <View style={themedStyles.section}>
          <Text style={themedStyles.sectionTitle}>
            {t('payment.bankInformation')}
          </Text>

          <View style={themedStyles.infoRow}>
            <Text style={themedStyles.infoLabel}>{t('payment.bank')}</Text>
            <Text style={themedStyles.infoValue}>{bankTransfer.bank_name}</Text>
            <TouchableOpacity
              style={themedStyles.copyButton}
              onPress={() =>
                handleCopyText(bankTransfer.bank_name, t('payment.bankName'))
              }
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.infoRow}>
            <Text style={themedStyles.infoLabel}>
              {t('payment.accountNumber')}
            </Text>
            <Text style={themedStyles.infoValue}>
              {bankTransfer.account_number}
            </Text>
            <TouchableOpacity
              style={themedStyles.copyButton}
              onPress={() =>
                handleCopyText(
                  bankTransfer.account_number,
                  t('payment.accountNumber')
                )
              }
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.infoRow}>
            <Text style={themedStyles.infoLabel}>
              {t('payment.accountName')}
            </Text>
            <Text style={themedStyles.infoValue}>
              {bankTransfer.account_name}
            </Text>
            <TouchableOpacity
              style={themedStyles.copyButton}
              onPress={() =>
                handleCopyText(
                  bankTransfer.account_name,
                  t('payment.accountName')
                )
              }
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.infoRow}>
            <Text style={themedStyles.infoLabel}>
              {t('payment.transferContent')}
            </Text>
            <Text style={themedStyles.infoValue}>
              {bankTransfer.transfer_content}
            </Text>
            <TouchableOpacity
              style={themedStyles.copyButton}
              onPress={() =>
                handleCopyText(
                  bankTransfer.transfer_content,
                  t('payment.content')
                )
              }
            >
              <Ionicons
                name="copy-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.warningBox}>
            <Text style={themedStyles.warningText}>
              [WARNING] {t('payment.contentWarning')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={themedStyles.buttonContainer}>
        <TouchableOpacity
          style={themedStyles.button}
          onPress={() => handleVerify(false)}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color={theme.colors.textInverse}
              />
              <Text style={themedStyles.buttonText}>
                {t('payment.verifyTransfer')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[themedStyles.button, themedStyles.buttonSecondary]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="close-circle-outline"
            size={24}
            color={theme.colors.text}
          />
          <Text
            style={[themedStyles.buttonText, themedStyles.buttonTextSecondary]}
          >
            {t('common.cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterBankTransferScreen;
