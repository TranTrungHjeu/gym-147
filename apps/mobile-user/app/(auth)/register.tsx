import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';
import {
  isValidVietnamesePhone,
  normalizePhoneNumber,
} from '@/utils/phone.utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Complete OAuth session for WebBrowser
WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0); // Cooldown timer in seconds

  const [primaryMethod, setPrimaryMethod] = useState<'EMAIL' | 'PHONE'>(
    'EMAIL'
  );
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  // Error modal state
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error' as 'email' | 'phone' | 'error' | 'warning',
  });

  // Success modal state
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  // Load cooldown from AsyncStorage on component mount
  useEffect(() => {
    const loadCooldown = async () => {
      try {
        const identifier = primaryMethod === 'EMAIL' ? email : phone;
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

    if (email || phone) {
      loadCooldown();
    }
  }, [email, phone, primaryMethod]);

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
        const identifier = primaryMethod === 'EMAIL' ? email : phone;
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

    if (email || phone) {
      saveCooldown();
    }
  }, [otpCooldown, email, phone, primaryMethod]);

  const validateForm = () => {
    const newErrors = {
      email: '',
      phone: '',
      password: '',
      firstName: '',
      lastName: '',
    };

    let isValid = true;

    // Validate first name
    if (!firstName.trim()) {
      newErrors.firstName = t('validation.firstNameRequired');
      isValid = false;
    }

    // Validate last name
    if (!lastName.trim()) {
      newErrors.lastName = t('validation.lastNameRequired');
      isValid = false;
    }

    // Validate based on primary method
    if (primaryMethod === 'EMAIL') {
      if (!email.trim()) {
        newErrors.email = t('validation.emailRequired');
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = t('validation.emailInvalid');
        isValid = false;
      }
    } else {
      if (!phone.trim()) {
        newErrors.phone = t('validation.phoneRequired');
        isValid = false;
      } else if (!isValidVietnamesePhone(phone)) {
        newErrors.phone = t('validation.phoneInvalid');
        isValid = false;
      }
    }

    // Validate password
    if (!password) {
      newErrors.password = t('validation.passwordRequired');
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = t('validation.passwordMinLength');
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = t('validation.passwordWeak');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleGoogleSignup = async () => {
    try {
      setIsGoogleLoading(true);

      // For mobile, we'll use a web-based OAuth flow
      // Force use 'gym147' scheme even in Expo development mode
      let redirectUri = AuthSession.makeRedirectUri({
        scheme: 'gym147',
        path: 'auth/callback',
      });
      
      // In Expo development, makeRedirectUri might return exp:// scheme
      // Force it to use gym147:// scheme
      if (redirectUri.startsWith('exp://')) {
        redirectUri = redirectUri.replace('exp://', 'gym147://');
        console.log('[GOOGLE_OAUTH_REGISTER] Converted exp:// to gym147://:', redirectUri);
      }
      
      console.log('[GOOGLE_OAUTH_REGISTER] Using redirect URI:', redirectUri);

      // Get OAuth URL from backend using API service (consistent with login.tsx)
      // Pass redirect_uri so backend can redirect back to mobile app
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );
      const response = await identityApiService.get<{
        authUrl: string;
        state: string;
      }>('/auth/oauth/google', {
        redirect_uri: redirectUri,
      });

      console.log(
        '[GOOGLE_OAUTH_REGISTER] Full response:',
        JSON.stringify(response, null, 2)
      );
      console.log(
        '[GOOGLE_OAUTH_REGISTER] Response success:',
        response.success
      );
      console.log('[GOOGLE_OAUTH_REGISTER] Response data:', response.data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to get OAuth URL');
      }

      if (!response.data) {
        throw new Error('Response data is null or undefined');
      }

      // Handle both nested and flat response structures
      const authUrl =
        (response.data as any).authUrl || (response.data as any).data?.authUrl;

      if (!authUrl) {
        console.error(
          '[GOOGLE_OAUTH_REGISTER] authUrl not found in response:',
          {
            responseData: response.data,
            responseDataType: typeof response.data,
            responseDataKeys: response.data ? Object.keys(response.data) : [],
          }
        );
        throw new Error('authUrl not found in response');
      }

      // Open OAuth URL in browser
      console.log('[GOOGLE_OAUTH_REGISTER] Opening auth URL:', authUrl);
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        // Parse tokens from callback URL
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const refreshToken = url.searchParams.get('refreshToken');
        const isNewUser = url.searchParams.get('isNewUser') === 'true';

        if (token && refreshToken) {
          // Store tokens
          const { storeTokens } = await import('@/utils/auth/storage');
          await storeTokens(token, refreshToken);

          // Get user profile using API service
          const { identityApiService } = await import(
            '@/services/identity/api.service'
          );
          const profileResponse = await identityApiService.get('/auth/profile');

          if (profileResponse.success && profileResponse.data) {
            // If new user, navigate to onboarding/profile completion
            // If existing user, navigate to tabs
            if (isNewUser) {
              // Navigate to profile completion or onboarding
              router.replace('/(auth)/register-profile');
            } else {
              // Existing user, go to main app
              router.replace('/(tabs)');
            }
          } else {
            Alert.alert(t('common.error'), t('auth.oauthFailed'));
          }
        } else {
          const error = url.searchParams.get('error');
          Alert.alert(t('common.error'), error || t('auth.oauthFailed'));
        }
      } else if (result.type === 'cancel') {
        // User cancelled - do nothing
      } else {
        Alert.alert(t('common.error'), t('auth.oauthFailed'));
      }
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('auth.googleSignupFailed')
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    // Check cooldown
    if (otpCooldown > 0) {
      return;
    }

    setIsLoading(true);
    try {
      // Import from services/identity/api.service.ts
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );

      // Backend will normalize the phone number, but we can send it as-is
      // Frontend normalization is optional - mainly for UX (auto-format on blur)
      const identifier = primaryMethod === 'EMAIL' ? email : phone;

      const response = await identityApiService.post<{ retryAfter?: number }>(
        '/auth/send-otp',
        {
          identifier,
          type: primaryMethod,
        }
      );

      // Set cooldown from response or default to 60 seconds
      const retryAfter =
        (response.data as any)?.retryAfter ||
        (response.data as any)?.data?.retryAfter ||
        60;
      setOtpCooldown(retryAfter);

      // Show success modal
      setSuccessModal({
        visible: true,
        title: t('common.success'),
        message: t('registration.otpSent'),
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        t('registration.otpSendFailed');

      // Handle rate limit error - extract cooldown from response
      if (
        error.response?.status === 429 &&
        error.response?.data?.data?.retryAfter
      ) {
        const retryAfter = error.response.data.data.retryAfter;
        setOtpCooldown(retryAfter);
      }

      // Kiểm tra nếu lỗi liên quan đến email/phone đã tồn tại
      const messageLower = errorMessage.toLowerCase();
      let errorType: 'email' | 'phone' | 'error' = 'error';
      let errorTitle = t('common.error');

      // Check for email already used
      if (
        (messageLower.includes('email') || primaryMethod === 'EMAIL') &&
        (messageLower.includes('đã được sử dụng') ||
          messageLower.includes('already') ||
          messageLower.includes('exists') ||
          messageLower.includes('tồn tại') ||
          messageLower.includes('đã sử dụng'))
      ) {
        errorType = 'email';
        errorTitle =
          t('registration.emailAlreadyUsed') || 'Email đã được sử dụng';
      }
      // Check for phone already used
      else if (
        (messageLower.includes('số điện thoại') ||
          messageLower.includes('phone') ||
          primaryMethod === 'PHONE') &&
        (messageLower.includes('đã được sử dụng') ||
          messageLower.includes('already') ||
          messageLower.includes('exists') ||
          messageLower.includes('tồn tại') ||
          messageLower.includes('đã sử dụng'))
      ) {
        errorType = 'phone';
        errorTitle =
          t('registration.phoneAlreadyUsed') || 'Số điện thoại đã được sử dụng';
      }

      // Hiển thị modal thay vì Alert
      setErrorModal({
        visible: true,
        title: errorTitle,
        message: errorMessage,
        type: errorType,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setSuccessModal({ ...successModal, visible: false });
    // Navigate to OTP screen with registration data
    router.push({
      pathname: '/(auth)/register-otp',
      params: {
        email,
        phone, // Backend will normalize when registering
        password,
        firstName,
        lastName,
        primaryMethod,
      },
    });
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
    title: {
      ...Typography.h1,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...Typography.bodyRegular,
      color: theme.colors.textSecondary,
    },
    methodToggle: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    methodButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    methodButtonActive: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}10`,
    },
    methodButtonText: {
      ...Typography.buttonMedium,
      color: theme.colors.text,
    },
    methodButtonTextActive: {
      ...Typography.buttonMedium,
      color: theme.colors.primary,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      ...Typography.label,
      color: theme.colors.text,
    },
    input: {
      ...Typography.bodyRegular,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      minHeight: 48,
      lineHeight: undefined, // Remove lineHeight for TextInput
      includeFontPadding: false, // Android: prevent extra padding
      textAlignVertical: 'center', // Android: vertical alignment
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    inputRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    inputHalf: {
      flex: 1,
    },
    passwordContainer: {
      position: 'relative',
    },
    passwordToggle: {
      position: 'absolute',
      right: theme.spacing.md,
      top: '50%',
      transform: [{ translateY: -12 }],
    },
    errorText: {
      ...Typography.caption,
      color: theme.colors.error,
    },
    submitButton: {
      borderRadius: 16,
      marginTop: 24,
      paddingVertical: 16,
      backgroundColor: theme.colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      ...Typography.buttonLarge,
      textAlign: 'center',
      color: theme.colors.textInverse,
    },
    footer: {
      marginTop: theme.spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      ...Typography.footerText,
      color: theme.colors.textSecondary,
    },
    loginButton: {
      ...Typography.footerTextBold,
      color: theme.colors.primary,
    },
    continueText: {
      ...Typography.bodyMedium,
      textAlign: 'center',
      marginVertical: theme.spacing.md,
    },
    googleButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: theme.spacing.sm,
      gap: 12,
    },
    googleImage: {
      width: 24,
      height: 24,
    },
    googleText: {
      ...Typography.buttonMedium,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={themedStyles.container}
    >
      <ScrollView
        contentContainerStyle={themedStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>
            {t('registration.createAccount')}
          </Text>
          <Text style={themedStyles.subtitle}>
            {t('registration.createAccountSubtitle')}
          </Text>
        </View>

        <View style={themedStyles.methodToggle}>
          <TouchableOpacity
            style={[
              themedStyles.methodButton,
              primaryMethod === 'EMAIL' && themedStyles.methodButtonActive,
            ]}
            onPress={() => setPrimaryMethod('EMAIL')}
          >
            <Text
              style={[
                themedStyles.methodButtonText,
                primaryMethod === 'EMAIL' &&
                  themedStyles.methodButtonTextActive,
              ]}
            >
              {t('registration.registerByEmail')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              themedStyles.methodButton,
              primaryMethod === 'PHONE' && themedStyles.methodButtonActive,
            ]}
            onPress={() => setPrimaryMethod('PHONE')}
          >
            <Text
              style={[
                themedStyles.methodButtonText,
                primaryMethod === 'PHONE' &&
                  themedStyles.methodButtonTextActive,
              ]}
            >
              {t('registration.registerByPhone')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={themedStyles.form}>
          <View style={themedStyles.inputRow}>
            <View style={[themedStyles.inputContainer, themedStyles.inputHalf]}>
              <Text style={themedStyles.label}>
                {t('registration.firstName')}
              </Text>
              <TextInput
                style={[
                  themedStyles.input,
                  errors.firstName && themedStyles.inputError,
                ]}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setErrors({ ...errors, firstName: '' });
                }}
                placeholder={t('registration.firstNamePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
              {errors.firstName && (
                <Text style={themedStyles.errorText}>{errors.firstName}</Text>
              )}
            </View>

            <View style={[themedStyles.inputContainer, themedStyles.inputHalf]}>
              <Text style={themedStyles.label}>
                {t('registration.lastName')}
              </Text>
              <TextInput
                style={[
                  themedStyles.input,
                  errors.lastName && themedStyles.inputError,
                ]}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setErrors({ ...errors, lastName: '' });
                }}
                placeholder={t('registration.lastNamePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
              {errors.lastName && (
                <Text style={themedStyles.errorText}>{errors.lastName}</Text>
              )}
            </View>
          </View>

          {primaryMethod === 'EMAIL' ? (
            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>{t('registration.email')}</Text>
              <TextInput
                style={[
                  themedStyles.input,
                  errors.email && themedStyles.inputError,
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }}
                placeholder={t('registration.emailPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={themedStyles.errorText}>{errors.email}</Text>
              )}
            </View>
          ) : (
            <View style={themedStyles.inputContainer}>
              <Text style={themedStyles.label}>{t('registration.phone')}</Text>
              <TextInput
                style={[
                  themedStyles.input,
                  errors.phone && themedStyles.inputError,
                ]}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setErrors({ ...errors, phone: '' });
                }}
                onBlur={() => {
                  // Auto-normalize phone number when user finishes typing
                  if (phone.trim() && isValidVietnamesePhone(phone)) {
                    const normalized = normalizePhoneNumber(phone);
                    if (normalized && normalized !== phone) {
                      setPhone(normalized);
                    }
                  }
                }}
                placeholder={t('registration.phonePlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text style={themedStyles.errorText}>{errors.phone}</Text>
              )}
            </View>
          )}

          <View style={themedStyles.inputContainer}>
            <Text style={themedStyles.label}>{t('registration.password')}</Text>
            <View style={themedStyles.passwordContainer}>
              <TextInput
                style={[
                  themedStyles.input,
                  errors.password && themedStyles.inputError,
                ]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                }}
                placeholder={t('registration.passwordPlaceholder')}
                placeholderTextColor={theme.colors.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={themedStyles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={themedStyles.errorText}>{errors.password}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            themedStyles.submitButton,
            (isLoading || otpCooldown > 0) && themedStyles.submitButtonDisabled,
          ]}
          onPress={handleSendOTP}
          disabled={isLoading || otpCooldown > 0 || isGoogleLoading}
        >
          <Text style={themedStyles.submitButtonText}>
            {isLoading
              ? t('common.loading')
              : otpCooldown > 0
              ? t('registration.resendAfter', { seconds: otpCooldown })
              : t('registration.continue')}
          </Text>
        </TouchableOpacity>

        <Text
          style={[
            themedStyles.continueText,
            { color: theme.colors.textSecondary },
          ]}
        >
          {t('auth.orContinueWith')}
        </Text>

        <TouchableOpacity
          style={[
            themedStyles.googleButtonContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            isGoogleLoading && themedStyles.buttonDisabled,
          ]}
          onPress={handleGoogleSignup}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <>
              <Image
                source={{
                  uri: 'https://img.icons8.com/color/48/google-logo.png',
                }}
                style={themedStyles.googleImage}
              />
              <Text
                style={[themedStyles.googleText, { color: theme.colors.text }]}
              >
                {t('auth.googleSignup')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={themedStyles.footer}>
          <Text style={themedStyles.footerText}>
            {t('registration.alreadyHaveAccount')}{' '}
            <Text
              style={themedStyles.loginButton}
              onPress={() => router.push('/(auth)/login')}
            >
              {t('auth.login')}
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        onClose={handleSuccessModalClose}
        title={successModal.title}
        message={successModal.message}
        countdown={2}
        onCountdownComplete={handleSuccessModalClose}
      />
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
