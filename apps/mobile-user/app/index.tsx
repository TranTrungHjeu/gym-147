import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WelcomeScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    router.push('/(auth)/register');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Logo */}
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

      {/* Banner Image - Thay bằng ảnh của bạn */}
      <Image
        source={require('@/assets/images/logo-full.png')}
        style={[styles.bannerImage, { shadowColor: theme.colors.text }]}
      />

      {/* Title */}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {t('welcome.title')}
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subTitle, { color: theme.colors.textSecondary }]}>
        {t('welcome.subtitle')}
      </Text>

      {/* Button Container */}
      <View
        style={[
          styles.buttonContainer,
          {
            borderColor: theme.colors.border,
            shadowColor: theme.colors.text,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.loginButtonWrapper,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={handleLogin}
        >
          <Text
            style={[
              styles.loginButtonText,
              { color: theme.colors.textInverse },
            ]}
          >
            {t('auth.login')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.loginButtonWrapper,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={handleSignup}
        >
          <Text
            style={[styles.signupButtonText, { color: theme.colors.primary }]}
          >
            {t('auth.register')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    height: 60,
    width: 180,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  bannerImage: {
    marginBottom: 40,
    height: 280,
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  subTitle: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '50%',
    height: '100%',
  },
  loginButtonText: {
    ...Typography.buttonLarge,
  },
  signupButtonText: {
    ...Typography.buttonLarge,
  },
});
