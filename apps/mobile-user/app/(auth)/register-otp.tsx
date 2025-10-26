import { OTPInput } from '@/components/OTPInput';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const email = params.email as string;
  const phone = params.phone as string;
  const password = params.password as string;
  const firstName = params.firstName as string;
  const lastName = params.lastName as string;
  const primaryMethod = params.primaryMethod as 'EMAIL' | 'PHONE';

  const identifier = primaryMethod === 'EMAIL' ? email : phone;

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

      Alert.alert(t('common.success'), t('registration.accountCreated'), [
        {
          text: t('common.ok'),
          onPress: () => {
            // Navigate to plan selection with user data
            router.push({
              pathname: '/(auth)/register-plan',
              params: {
                userId: response.data.user.id,
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setError(
        error.response?.data?.message || t('registration.otpVerificationFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      // Import from services/identity/api.service.ts
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );

      await identityApiService.post('/auth/send-otp', {
        identifier,
        type: primaryMethod,
      });

      Alert.alert(t('common.success'), t('registration.otpResent'));
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('registration.otpResendFailed')
      );
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
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.text}
          />
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
          resendDelay={60}
        />
      </View>

      <View style={themedStyles.infoBox}>
        <Text style={themedStyles.infoText}>
          {t('registration.otpExpiresIn', { minutes: 5 })}
        </Text>
      </View>
    </ScrollView>
  );
};

export default RegisterOTPScreen;
