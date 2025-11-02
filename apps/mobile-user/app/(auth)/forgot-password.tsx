import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Modal,
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;
  const successIconScale = useRef(new Animated.Value(0)).current;
  const successIconFade = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    if (emailSent) {
      Animated.parallel([
        Animated.spring(successIconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(successIconFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      successIconScale.setValue(0);
      successIconFade.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailSent]);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError(t('validation.emailRequired'));
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('validation.emailInvalid'));
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
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : t('auth.unableToSendEmail');
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
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
          <Animated.View
            style={[
              styles.successIconContainer,
              { backgroundColor: `${theme.colors.primary}15` },
              {
                transform: [{ scale: successIconScale }],
                opacity: successIconFade,
              },
            ]}
          >
            <Ionicons
              name="mail-unread-outline"
              size={64}
              color={theme.colors.primary}
            />
          </Animated.View>
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
              styles.successButtonWrapper,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleLogin}
          >
            <Text
              style={[styles.successButtonText, { color: theme.colors.textInverse }]}
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
              {t('common.error')}
            </Text>

            {/* Message */}
            <Text
              style={[styles.modalMessage, { color: theme.colors.textSecondary }]}
            >
              {errorMessage}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>{t('common.ok')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  successButtonWrapper: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  successButtonText: {
    ...Typography.buttonLarge,
    color: '#FFFFFF',
  },
  resendButtonWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    marginTop: 12,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    ...Typography.buttonMedium,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...Typography.h3,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    ...Typography.buttonLarge,
    color: '#FFFFFF',
  },
});
