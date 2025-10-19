import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SignupScreen = () => {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [secureEntry, setSecureEntry] = useState(true);

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    phone: '',
  });

  const handleGoBack = () => {
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      phone: '',
    };

    let isValid = true;

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    // Validate phone
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
      isValid = false;
    } else if (!/^\d{10,}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Phone number is invalid';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Use email as name since this template doesn't have name field
      await register({
        name: email,
        email: email,
        password: password,
        confirmPassword: password, // Same as password
      });

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  const handleGoogleSignup = () => {
    Alert.alert('Google Signup', 'Google signup will be implemented');
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
          {t('auth.welcome')}
        </Text>
        <Text style={[styles.headingText, { color: theme.colors.text }]}>
          {t('auth.signUp')}
        </Text>
      </View>
      {/* form  */}
      <View style={styles.formContainer}>
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: errors.email
                ? theme.colors.error
                : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            errors.email ? styles.inputContainerError : null,
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
              if (errors.email) {
                setErrors({ ...errors, email: '' });
              }
            }}
            autoCapitalize="none"
          />
        </View>
        {errors.email ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.email}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: errors.password
                ? theme.colors.error
                : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            errors.password ? styles.inputContainerError : null,
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
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={secureEntry}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors({ ...errors, password: '' });
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
        {errors.password ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.password}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputContainer,
            {
              borderColor: errors.phone
                ? theme.colors.error
                : theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
            errors.phone ? styles.inputContainerError : null,
          ]}
        >
          <SimpleLineIcons
            name={'screen-smartphone'}
            size={24}
            color={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            placeholder={t('auth.phone')}
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) {
                setErrors({ ...errors, phone: '' });
              }
            }}
          />
        </View>
        {errors.phone ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.phone}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.loginButtonWrapper,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text
              style={[styles.loginText, { color: theme.colors.textInverse }]}
            >
              {t('auth.register')}
            </Text>
          )}
        </TouchableOpacity>

        <Text
          style={[styles.continueText, { color: theme.colors.textSecondary }]}
        >
          or continue with
        </Text>
        <TouchableOpacity
          style={[
            styles.googleButtonContainer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
          onPress={handleGoogleSignup}
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
            {t('auth.alreadyHaveAccount')}
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

export default SignupScreen;

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
