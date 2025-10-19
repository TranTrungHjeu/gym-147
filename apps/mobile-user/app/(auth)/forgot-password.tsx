import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const { forgotPassword, isLoading } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('auth.email') + ' is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.email') + ' is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await forgotPassword({ email });
      setEmailSent(true);
      Alert.alert(
        t('common.success'),
        t('auth.passwordResetInstructionsSent'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.unableToSendEmail'));
    }
  };

  if (emailSent) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <TouchableOpacity
          style={styles.backButtonWrapper}
          onPress={handleLogin}
        >
          <Ionicons
            name={'arrow-back-outline'}
            color={theme.colors.text}
            size={25}
          />
        </TouchableOpacity>

        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={[styles.successTitle, { color: theme.colors.text }]}>
            {t('auth.emailSent')}
          </Text>
          <Text
            style={[styles.successText, { color: theme.colors.textSecondary }]}
          >
            {t('auth.emailSentDescription', { email })}
          </Text>

          <TouchableOpacity
            style={[
              styles.loginButtonWrapper,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleLogin}
          >
            <Text
              style={[styles.loginText, { color: theme.colors.textInverse }]}
            >
              {t('auth.login')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resendButtonWrapper,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                style={[styles.resendText, { color: theme.colors.primary }]}
              >
                {t('auth.resendEmail')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          {t('auth.forgotPasswordTitle')}
        </Text>
      </View>

      <Text
        style={[styles.descriptionText, { color: theme.colors.textSecondary }]}
      >
        {t('auth.forgotPasswordDescription')}
      </Text>

      {/* form */}
      <View style={styles.formContainer}>
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: error ? theme.colors.error : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            error ? styles.inputContainerError : null,
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
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) {
                setError('');
              }
            }}
            autoCapitalize="none"
          />
        </View>
        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.loginButtonWrapper,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[styles.loginText, { color: theme.colors.textInverse }]}
            >
              {t('auth.sendResetLink')}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text
            style={[styles.accountText, { color: theme.colors.textSecondary }]}
          >
            {t('auth.rememberPassword')}
          </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={[styles.signupText, { color: theme.colors.primary }]}>
              {t('auth.login')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ForgotPasswordScreen;

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
  descriptionText: {
    ...Typography.bodyMedium,
    lineHeight: 24,
    marginBottom: 20,
  },
  formContainer: {
    marginTop: 20,
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
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    ...Typography.h2,
    marginBottom: 12,
  },
  successText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  resendButtonWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 12,
    width: '100%',
    paddingVertical: 16,
  },
  resendText: {
    ...Typography.buttonMedium,
    textAlign: 'center',
  },
});
