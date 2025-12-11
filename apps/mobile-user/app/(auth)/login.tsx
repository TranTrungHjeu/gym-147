import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/identity/auth.service';
import { LoginCredentials } from '@/types/authTypes';
import { getFieldError } from '@/utils/auth/validation';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { User } from 'lucide-react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SalaryRequestModal } from '@/components/SalaryRequestModal';
import { salaryService } from '@/services';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Complete OAuth session for WebBrowser
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, verify2FALogin, isLoading, hasMember, user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [secureEntry, setSecureEntry] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorUserId, setTwoFactorUserId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);

  // Salary request state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [trainerId, setTrainerId] = useState<string | null>(null);

  const modalScale = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showErrorModal) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(modalFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalScale.setValue(0);
      modalFade.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showErrorModal]);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleSignup = () => {
    router.push('/(auth)/register');
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setTwoFactorError(
        t('security.twoFactor.enterCode', {
          defaultValue: 'Vui lòng nhập mã 6 số',
        })
      );
      return;
    }

    if (!twoFactorUserId) {
      setTwoFactorError(
        t('common.error', { defaultValue: 'Lỗi: Không tìm thấy user ID' })
      );
      return;
    }

    setIsVerifying2FA(true);
    setTwoFactorError(null);

    try {
      const result = await verify2FALogin(
        twoFactorUserId,
        twoFactorCode,
        rememberMe
      );

      // Close 2FA modal
      setShow2FAModal(false);
      setTwoFactorCode('');
      setTwoFactorUserId(null);

      // Check registration completion status
      const registrationStatus = result.registrationStatus || {};

      // Priority: Subscription > Member > Profile
      if (!registrationStatus.hasSubscription) {
        const hasExpiredSubscription = result.hasMember;
        router.replace({
          pathname: '/(auth)/register-plan',
          params: {
            userId: result.user.id,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || '',
            expired: hasExpiredSubscription ? 'true' : 'false',
          },
        });
      } else if (!result.hasMember || !registrationStatus.hasCompletedProfile) {
        router.replace({
          pathname: '/(auth)/register-profile',
          params: {
            userId: result.user.id,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || '',
            paymentVerified: 'true',
          },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setTwoFactorError(
        error.message ||
          t('security.twoFactor.invalidCode', {
            defaultValue: 'Mã xác thực không hợp lệ',
          })
      );
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleClose2FAModal = () => {
    setShow2FAModal(false);
    setTwoFactorCode('');
    setTwoFactorUserId(null);
    setTwoFactorError(null);
    // Clear password for security
    setPassword('');
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);

      // For mobile, we'll use a web-based OAuth flow
      // In production, you might want to use @react-native-google-signin/google-signin for native experience
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'gym147',
        path: 'auth/callback',
      });

      // Get OAuth URL from backend
      const response = await fetch(
        `${
          process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'
        }/auth/oauth/google`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get OAuth URL');
      }

      const data = await response.json();
      if (!data.success || !data.data?.authUrl) {
        throw new Error('Invalid OAuth response');
      }

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.data.authUrl,
        redirectUri
      );

      if (result.type === 'success' && result.url) {
        // Parse tokens from callback URL
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const refreshToken = url.searchParams.get('refreshToken');
        const isNewUser = url.searchParams.get('isNewUser') === 'true';

        if (token && refreshToken) {
          // Store tokens and login
          const { storeTokens } = await import('@/utils/auth/storage');
          await storeTokens({
            token,
            refreshToken,
          });

          // Get user profile
          const profileResponse = await fetch(
            `${
              process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'
            }/auth/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.success) {
              // If new user, navigate to profile completion
              // If existing user, navigate to tabs
              if (isNewUser) {
                // Navigate to profile completion for new users
                router.replace('/(auth)/register-profile');
              } else {
                // Existing user, go to main app
                router.replace('/(tabs)');
              }
            } else {
              Alert.alert(t('common.error'), t('auth.oauthFailed'));
            }
          } else {
            Alert.alert(t('common.error'), t('auth.oauthFailed'));
          }
        } else {
          const error = url.searchParams.get('error');
          Alert.alert(
            t('common.error'),
            error || 'OAuth authentication failed'
          );
        }
      } else if (result.type === 'cancel') {
        // User cancelled
      } else {
        Alert.alert(t('common.error'), 'OAuth authentication failed');
      }
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to login with Google'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    const validationErrors: any[] = [];

    // Validate email
    if (!email.trim()) {
      validationErrors.push({
        field: 'email',
        message: t('validation.emailRequired'),
      });
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.push({
        field: 'email',
        message: t('validation.emailInvalid'),
      });
    }

    // Validate password
    if (!password) {
      validationErrors.push({
        field: 'password',
        message: t('validation.passwordRequired'),
      });
    } else if (password.length < 8) {
      validationErrors.push({
        field: 'password',
        message: t('validation.passwordMinLength'),
      });
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      validationErrors.push({
        field: 'password',
        message: t('validation.passwordWeak'),
      });
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const credentials: LoginCredentials & { rememberMe?: boolean } = {
      identifier: email,
      password,
      rememberMe: rememberMe,
    };

    try {
      const result = await login(credentials);

      // Check if 2FA is required
      if ('requires2FA' in result && result.requires2FA) {
        setTwoFactorUserId(result.userId);
        setShow2FAModal(true);
        setTwoFactorCode('');
        setTwoFactorError(null);
        return;
      }

      // Normal login success flow
      // Check registration completion status
      const registrationStatus = result.registrationStatus || {};

      console.log('[DATA] Registration status:', {
        hasMember: result.hasMember,
        hasSubscription: registrationStatus.hasSubscription,
        hasCompletedProfile: registrationStatus.hasCompletedProfile,
      });

      // Priority: Subscription > Member > Profile
      if (!registrationStatus.hasSubscription) {
        console.log('[WARN] No subscription - redirecting to plan selection');
        // Check if user has member record (indicates subscription might be expired)
        const hasExpiredSubscription = result.hasMember;
        router.replace({
          pathname: '/(auth)/register-plan',
          params: {
            userId: result.user.id,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || '',
            expired: hasExpiredSubscription ? 'true' : 'false',
          },
        });
      } else if (!result.hasMember || !registrationStatus.hasCompletedProfile) {
        console.log(
          '[WARNING] Subscription OK but profile incomplete - redirecting to profile'
        );
        router.replace({
          pathname: '/(auth)/register-profile',
          params: {
            userId: result.user.id,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || '',
            paymentVerified: 'true',
          },
        });
      } else {
        console.log('[SUCCESS] Complete registration - redirecting to home');

        // Check if user is TRAINER and doesn't have salary
        if (result.user.role === 'TRAINER' && result.user.trainerId) {
          const hasSalary = (result.user as any).hasSalary !== false; // Default to true if not provided

          if (!hasSalary) {
            console.log(
              '[INFO] Trainer does not have salary, showing salary request modal'
            );
            setTrainerId(result.user.trainerId);
            setShowSalaryModal(true);
            // Don't navigate yet, wait for user to handle salary modal
            return;
          }
        }

        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // Display error message to user
      // Always use translation instead of backend message for consistency
      const errorMsg = t('auth.loginFailed');

      // Show error modal
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <TouchableOpacity style={styles.backButtonWrapper} onPress={handleGoBack}>
        <Ionicons
          name={'arrow-back-outline'}
          color={theme.colors.text}
          size={25}
        />
      </TouchableOpacity>

      <View style={styles.textContainer}>
        <Text style={[styles.headingText, { color: theme.colors.text }]}>
          {t('auth.welcome')},
        </Text>
        <Text style={[styles.headingText, { color: theme.colors.text }]}>
          {t('auth.welcomeBack')}
        </Text>
      </View>

      {/* form */}
      <View style={styles.formContainer}>
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: !!getFieldError(errors, 'email')
                ? theme.colors.error
                : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            !!getFieldError(errors, 'email') && styles.inputContainerError,
          ]}
        >
          <Ionicons
            name={'mail-outline'}
            size={24}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              // Clear errors when user starts typing
              if (errors.length > 0) {
                setErrors([]);
              }
            }}
            autoCapitalize="none"
          />
        </View>
        {getFieldError(errors, 'email') && (
          <Text style={styles.errorText}>{getFieldError(errors, 'email')}</Text>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: !!getFieldError(errors, 'password')
                ? theme.colors.error
                : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            !!getFieldError(errors, 'password') && styles.inputContainerError,
          ]}
        >
          <SimpleLineIcons
            name={'lock'}
            size={24}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder={t('auth.password')}
            placeholderTextColor={theme.colors.textTertiary}
            secureTextEntry={secureEntry}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              // Clear errors when user starts typing
              if (errors.length > 0) {
                setErrors([]);
              }
            }}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => {
              setSecureEntry((prev) => !prev);
            }}
          >
            <SimpleLineIcons
              name={secureEntry ? 'eye' : 'eye'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {getFieldError(errors, 'password') && (
          <Text style={styles.errorText}>
            {getFieldError(errors, 'password')}
          </Text>
        )}

        {/* Remember Me Checkbox */}
        <View style={styles.rememberMeContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: rememberMe
                    ? theme.colors.primary
                    : 'transparent',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text style={[styles.rememberMeText, { color: theme.colors.text }]}>
              {t('auth.rememberMe')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text
            style={[styles.forgotPasswordText, { color: theme.colors.primary }]}
          >
            {t('auth.forgotPassword')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.loginButtonWrapper,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginText}>
            {isLoading ? t('common.loading') : t('auth.login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.faceLoginButtonContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={() => router.push('/(auth)/face-login')}
          disabled={isLoading}
        >
          <User size={20} color={theme.colors.primary} />
          <Text style={[styles.faceLoginText, { color: theme.colors.text }]}>
            {t('faceLogin.loginWithFace', {
              defaultValue: 'Đăng nhập bằng khuôn mặt',
            })}
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.continueText, { color: theme.colors.textSecondary }]}
        >
          {t('auth.orContinueWith')}
        </Text>

        <TouchableOpacity
          style={[
            styles.googleButtonContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            isGoogleLoading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleLogin}
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
                style={styles.googleImage}
              />
              <Text style={[styles.googleText, { color: theme.colors.text }]}>
                Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text
            style={[styles.accountText, { color: theme.colors.textSecondary }]}
          >
            {t('auth.dontHaveAccount')}
          </Text>
          <TouchableOpacity onPress={handleSignup}>
            <Text style={[styles.signupText, { color: theme.colors.primary }]}>
              {t('auth.register')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Modal */}
      <Modal visible={showErrorModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                transform: [{ scale: modalScale }],
                opacity: modalFade,
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.modalIcon,
                { backgroundColor: `${theme.colors.error}15` },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={48}
                color={theme.colors.error}
              />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('auth.loginErrorTitle')}
            </Text>

            {/* Message */}
            <Text
              style={[
                styles.modalMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {errorMessage}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* 2FA Verification Modal */}
      <Modal
        visible={show2FAModal}
        transparent
        animationType="slide"
        onRequestClose={handleClose2FAModal}
      >
        <View
          style={[
            styles.modalOverlay,
            { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
          ]}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                maxWidth: 400,
                padding: 32,
              },
            ]}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleClose2FAModal}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Icon */}
            <View
              style={[
                styles.modalIcon,
                { backgroundColor: `${theme.colors.primary}15` },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={theme.colors.primary}
              />
            </View>

            {/* Title */}
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t('security.twoFactor.title', {
                defaultValue: 'Xác thực 2 lớp',
              })}
            </Text>

            {/* Message */}
            <Text
              style={[
                styles.modalMessage,
                { color: theme.colors.textSecondary, marginBottom: 24 },
              ]}
            >
              {t('security.twoFactor.loginPrompt', {
                defaultValue:
                  'Vui lòng nhập mã 6 số từ ứng dụng xác thực của bạn',
              })}
            </Text>

            {/* 2FA Code Input */}
            <View style={styles.twoFactorInputContainer}>
              <TextInput
                style={[
                  styles.twoFactorInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: twoFactorError
                      ? theme.colors.error
                      : theme.colors.border,
                  },
                ]}
                value={twoFactorCode}
                onChangeText={(text) => {
                  // Only allow numeric input, max 6 digits
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setTwoFactorCode(numericText);
                  setTwoFactorError(null);
                  // Auto-submit when 6 digits are entered
                  if (numericText.length === 6) {
                    handleVerify2FA();
                  }
                }}
                placeholder="000000"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!isVerifying2FA}
              />
            </View>

            {/* Error message */}
            {twoFactorError && (
              <Text
                style={[
                  styles.twoFactorErrorText,
                  { color: theme.colors.error },
                ]}
              >
                {twoFactorError}
              </Text>
            )}

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: theme.colors.primary,
                  marginTop: 24,
                  opacity:
                    twoFactorCode.length === 6 && !isVerifying2FA ? 1 : 0.5,
                },
              ]}
              onPress={handleVerify2FA}
              disabled={twoFactorCode.length !== 6 || isVerifying2FA}
              activeOpacity={0.8}
            >
              {isVerifying2FA ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonText}>
                  {t('security.twoFactor.verify', {
                    defaultValue: 'Xác thực',
                  })}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.modalCancelButton, { marginTop: 12 }]}
              onPress={handleClose2FAModal}
              disabled={isVerifying2FA}
            >
              <Text
                style={[
                  styles.modalCancelText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('common.cancel', { defaultValue: 'Hủy' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Salary Request Modal */}
      <SalaryRequestModal
        visible={showSalaryModal}
        trainerId={trainerId || undefined}
        onClose={() => {
          setShowSalaryModal(false);
          // Navigate to home after closing modal
          router.replace('/(tabs)');
        }}
        onRequest={async () => {
          if (!trainerId) {
            throw new Error('Trainer ID is required');
          }
          const result = await salaryService.requestSalary(trainerId);
          if (!result.success) {
            throw new Error(result.message || 'Failed to send salary request');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  backButtonWrapper: {
    height: 40,
    width: 40,
    backgroundColor: 'transparent',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginVertical: 20,
  },
  headingText: {
    ...Typography.h1,
  },
  formContainer: {
    marginTop: 40,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerError: {
    borderWidth: 2,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 24, // Match lineHeight to prevent shift
    ...Typography.bodyMedium,
    lineHeight: undefined, // Remove lineHeight for TextInput
    includeFontPadding: false, // Android: prevent extra padding
    textAlignVertical: 'center', // Android: vertical alignment
  },
  errorText: {
    ...Typography.bodySmall,
    marginLeft: 20,
    marginTop: -2,
    marginBottom: 8,
    color: '#EF4444', // theme.colors.error - hardcoded vì không access được theme trong StyleSheet
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  generalErrorText: {
    ...Typography.bodyMedium,
    flex: 1,
  },
  forgotPasswordText: {
    ...Typography.label,
    textAlign: 'right',
    marginVertical: 10,
  },
  rememberMeContainer: {
    marginVertical: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  loginButtonWrapper: {
    borderRadius: 16,
    marginTop: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginText: {
    ...Typography.buttonLarge,
    textAlign: 'center',
    color: '#FFFFFF', // theme.colors.textInverse - hardcoded vì không access được theme trong StyleSheet
  },
  continueText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginVertical: 20,
  },
  googleButtonContainer: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  faceLoginButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 12,
  },
  faceLoginText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  googleImage: {
    height: 20,
    width: 20,
  },
  googleText: {
    ...Typography.buttonMedium,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    gap: 8,
  },
  accountText: {
    ...Typography.footerText,
  },
  signupText: {
    ...Typography.footerTextBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    ...Typography.buttonLarge,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  twoFactorInputContainer: {
    width: '100%',
    marginVertical: 16,
  },
  twoFactorInput: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    textAlign: 'center',
    letterSpacing: 8,
  },
  twoFactorErrorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: 8,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...Typography.buttonMedium,
  },
});
