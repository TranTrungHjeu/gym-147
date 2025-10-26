import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WelcomeScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [loginScale] = React.useState(new Animated.Value(1));
  const [signupScale] = React.useState(new Animated.Value(1));

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSignup = () => {
    router.push('/(auth)/register');
  };

  const animatePress = (scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
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
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleLogin}
          onPressIn={() => animatePress(loginScale, 0.96)}
          onPressOut={() => animatePress(loginScale, 1)}
          style={({ pressed }) => [
            styles.pressableWrapper,
            {
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loginButtonWrapper,
              {
                backgroundColor: theme.colors.primary,
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: 16,
                transform: [{ scale: loginScale }],
              },
            ]}
          >
            <Text
              style={[
                styles.loginButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t('auth.login')}
            </Text>
          </Animated.View>
        </Pressable>

        {/* Divider between buttons */}
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />

        <Pressable
          onPress={handleSignup}
          onPressIn={() => animatePress(signupScale, 0.96)}
          onPressOut={() => animatePress(signupScale, 1)}
          style={({ pressed }) => [
            styles.pressableWrapper,
            {
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loginButtonWrapper,
              {
                backgroundColor: theme.colors.surface,
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                transform: [{ scale: signupScale }],
              },
            ]}
          >
            <Text
              style={[styles.signupButtonText, { color: theme.colors.primary }]}
            >
              {t('auth.register')}
            </Text>
          </Animated.View>
        </Pressable>
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
    alignItems: 'center',
  },
  pressableWrapper: {
    flex: 1,
    height: '100%',
  },
  loginButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  divider: {
    width: 1.5,
    height: '100%',
  },
  loginButtonText: {
    ...Typography.buttonLarge,
  },
  signupButtonText: {
    ...Typography.buttonLarge,
  },
});
