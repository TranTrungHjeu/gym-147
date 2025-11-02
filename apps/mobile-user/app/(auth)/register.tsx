import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

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
      } else if (!/^(\+84|84|0)[1-9][0-9]{8}$/.test(phone.replace(/\s/g, ''))) {
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

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Import from services/identity/api.service.ts
      const { identityApiService } = await import(
        '@/services/identity/api.service'
      );

      const identifier = primaryMethod === 'EMAIL' ? email : phone;

      await identityApiService.post('/auth/send-otp', {
        identifier,
        type: primaryMethod,
      });

      Alert.alert(t('common.success'), t('registration.otpSent'), [
        {
          text: t('common.ok'),
          onPress: () => {
            // Navigate to OTP screen with registration data
            router.push({
              pathname: '/(auth)/register-otp',
              params: {
                email,
                phone,
                password,
                firstName,
                lastName,
                primaryMethod,
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Send OTP error:', error);
      Alert.alert(
        t('common.error'),
        error.response?.data?.message || t('registration.otpSendFailed')
      );
    } finally {
      setIsLoading(false);
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
      ...Typography.bodyBold,
      color: theme.colors.text,
    },
    methodButtonTextActive: {
      color: theme.colors.primary,
    },
    form: {
      gap: theme.spacing.md,
    },
    inputContainer: {
      gap: theme.spacing.xs,
    },
    label: {
      ...Typography.bodyMedium,
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
      marginTop: theme.spacing.xl,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      ...Typography.bodyBold,
      color: theme.colors.textInverse,
    },
    footer: {
      marginTop: theme.spacing.xl,
      alignItems: 'center',
    },
    footerText: {
      ...Typography.bodyRegular,
      color: theme.colors.textSecondary,
    },
    loginButton: {
      ...Typography.bodyBold,
      color: theme.colors.primary,
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
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text}
            />
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
            isLoading && themedStyles.submitButtonDisabled,
          ]}
          onPress={handleSendOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.textInverse} />
          ) : (
            <Text style={themedStyles.submitButtonText}>
              {t('registration.continue')}
            </Text>
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
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
