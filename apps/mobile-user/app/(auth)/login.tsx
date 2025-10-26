import { useAuth } from '@/contexts/AuthContext';
import { LoginCredentials } from '@/types/authTypes';
import {
  getFieldError,
  validateLoginCredentials,
} from '@/utils/auth/validation';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, hasMember, user } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [secureEntry, setSecureEntry] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleSignup = () => {
    router.push('/(auth)/register');
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleLogin = async () => {
    const credentials: LoginCredentials & { rememberMe?: boolean } = {
      identifier: email,
      password,
      rememberMe: rememberMe,
    };
    const validationErrors = validateLoginCredentials(credentials);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const result = await login(credentials);

      // Check registration completion status
      const registrationStatus = result.registrationStatus || {};

      console.log('📊 Registration status:', {
        hasMember: result.hasMember,
        hasSubscription: registrationStatus.hasSubscription,
        hasCompletedProfile: registrationStatus.hasCompletedProfile,
      });

      // Priority: Subscription > Member > Profile
      if (!registrationStatus.hasSubscription) {
        console.log('⚠️ No subscription - redirecting to plan selection');
        router.replace({
          pathname: '/(auth)/register-plan',
          params: {
            userId: result.user.id,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken || '',
          },
        });
      } else if (!result.hasMember || !registrationStatus.hasCompletedProfile) {
        console.log(
          '⚠️ Subscription OK but profile incomplete - redirecting to profile'
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
        console.log('✅ Complete registration - redirecting to home');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Login error:', error);
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
            onChangeText={setEmail}
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
            onChangeText={setPassword}
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
          ]}
        >
          <Image
            source={{ uri: 'https://img.icons8.com/color/48/google-logo.png' }}
            style={styles.googleImage}
          />
          <Text style={[styles.googleText, { color: theme.colors.text }]}>
            Google
          </Text>
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
    ...Typography.bodyMedium,
    minHeight: 24,
  },
  errorText: {
    ...Typography.bodySmall,
    marginLeft: 20,
    marginTop: -2,
    marginBottom: 8,
    color: '#EF4444', // theme.colors.error - hardcoded vì không access được theme trong StyleSheet
  },
  forgotPasswordText: {
    ...Typography.bodySmallMedium,
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
    ...Typography.bodyMedium,
  },
  signupText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
});
