import { OTPInput } from '@/components/OTPInput';
import { SuccessModal } from '@/components/SuccessModal';
import { ErrorModal } from '@/components/ErrorModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterOTPScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { setTokens } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0); // Cooldown timer in seconds
  const [resendLoading, setResendLoading] = useState(false);

  const email = params.email as string;
  const phone = params.phone as string;
  const password = params.password as string;
  const firstName = params.firstName as string;
  const lastName = params.lastName as string;
  const primaryMethod = params.primaryMethod as 'EMAIL' | 'PHONE';

  const identifier = primaryMethod === 'EMAIL' ? email : phone;

  // Load cooldown from AsyncStorage on component mount
  useEffect(() => {
    const loadCooldown = async () => {
      try {
        if (!identifier) return;

        const cooldownKey = `otp_cooldown_${identifier}_${primaryMethod}`;
        const savedCooldown = await AsyncStorage.getItem(cooldownKey);

        if (savedCooldown) {
          try {
            const { expiresAt } = JSON.parse(savedCooldown);
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

            if (remaining > 0) {
              setOtpCooldown(remaining);
            } else {
              await AsyncStorage.removeItem(cooldownKey);
            }
          } catch (error) {
            await AsyncStorage.removeItem(cooldownKey);
          }
        }
      } catch (error) {
        // Ignore error
      }
    };

    loadCooldown();
  }, [identifier, primaryMethod]);

  // Cooldown timer effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => {
        setOtpCooldown(otpCooldown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Save cooldown to AsyncStorage
  useEffect(() => {
    const saveCooldown = async () => {
      try {
        if (!identifier) return;

        const cooldownKey = `otp_cooldown_${identifier}_${primaryMethod}`;

        if (otpCooldown > 0) {
          const expiresAt = Date.now() + otpCooldown * 1000;
          await AsyncStorage.setItem(
            cooldownKey,
            JSON.stringify({ expiresAt })
          );
        } else {
          await AsyncStorage.removeItem(cooldownKey);
        }
      } catch (error) {
        // Ignore error
      }
    };

    saveCooldown();
  }, [otpCooldown, identifier, primaryMethod]);

  // Success modal state for resend OTP
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  // Error modal state for resend OTP errors
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'email' | 'phone' | 'error' | 'warning',
  });

  const handleOTPComplete = async (otp: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Import from services/identity/api.service.ts
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );

      // Register member with OTP
      const response = await identityApiService.post('/auth/register', {
        email,
        phone,
        password,
        firstName,
        lastName,
        primaryMethod,
        otp,
      });

      // IMPORTANT: Save tokens to AuthContext immediately after registration
      // This ensures all subsequent screens have access to the token for API calls
      if (response.data?.accessToken && response.data?.refreshToken) {
        await setTokens(response.data.accessToken, response.data.refreshToken);

        // Also save user if available in response
        // setTokens will automatically load user profile, but we save it here too for immediate access
        if (response.data?.user) {
          const { storeUser } = await import('@/utils/auth/storage');
          await storeUser(response.data.user);
        }
      }

      // Navigate to plan selection with user data
      router.push({
        pathname: '/(auth)/register-plan',
        params: {
          userId: response.data.user.id,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        },
      });
    } catch (error: any) {
      setError(
        error.response?.data?.message || t('registration.otpVerificationFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // Check cooldown
    if (otpCooldown > 0) {
      return;
    }

    setResendLoading(true);
    setError('');
    try {
      // Import from services/identity/api.service.ts
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );

      const response = await identityApiService.post('/auth/send-otp', {
        identifier,
        type: primaryMethod,
      });

      // Set cooldown from response or default to 60 seconds
      const retryAfter = response.data?.data?.retryAfter || 60;
      setOtpCooldown(retryAfter);

      // Show success modal
      setSuccessModal({
        visible: true,
        title: t('common.success'),
        message: t('registration.otpResent') || t('registration.otpSent'),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        t('registration.otpResendFailed');

      // Handle rate limit error - extract cooldown from response
      if (
        error.response?.status === 429 &&
        error.response?.data?.data?.retryAfter
      ) {
        const retryAfter = error.response.data.data.retryAfter;
        setOtpCooldown(retryAfter);
      }

      // Show error modal
      setErrorModal({
        visible: true,
        title: t('common.error'),
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.lg,
    },
    header: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.full,
      backgroundColor: `${theme.colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      ...Typography.h1,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...Typography.bodyRegular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    identifier: {
      ...Typography.bodyBold,
      color: theme.colors.primary,
    },
    otpContainer: {
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    infoBox: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.info}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.info}30`,
      marginTop: theme.spacing.xl,
    },
    infoText: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={themedStyles.scrollContent}
    >
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={themedStyles.iconContainer}>
          <Ionicons
            name="mail-outline"
            size={40}
            color={theme.colors.primary}
          />
        </View>

        <Text style={themedStyles.title}>{t('registration.verifyOTP')}</Text>
        <Text style={themedStyles.subtitle}>
          {t('registration.otpSentTo')}{' '}
          <Text style={themedStyles.identifier}>{identifier}</Text>
        </Text>
      </View>

      <View style={themedStyles.otpContainer}>
        <OTPInput
          length={6}
          onComplete={handleOTPComplete}
          onResend={handleResendOTP}
          isLoading={isLoading}
          error={error}
          resendDelay={otpCooldown || 60}
        />
      </View>

      <View style={themedStyles.infoBox}>
        <Text style={themedStyles.infoText}>
          {t('registration.otpExpiresIn', { minutes: 5 })}
        </Text>
      </View>

      {/* Success Modal for Resend OTP */}
      <SuccessModal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
        countdown={2}
      />

      {/* Error Modal for Resend OTP Errors */}
      <ErrorModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
      />
    </ScrollView>
  );
};

export default RegisterOTPScreen;
