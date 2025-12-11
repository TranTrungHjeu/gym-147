import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const WelcomeScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, checkRegistrationStatus, user } =
    useAuth();
  const [loginScale] = React.useState(new Animated.Value(1));
  const [signupScale] = React.useState(new Animated.Value(1));
  const [hasChecked, setHasChecked] = React.useState(false);

  // Auto-redirect if already logged in - check registration status first
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.id && !hasChecked) {
      setHasChecked(true);
      const handleRedirect = async () => {
        const status = await checkRegistrationStatus();

        console.log('[DATA] Registration status check:', {
          hasMember: status.hasMember,
          hasSubscription: status.registrationStatus.hasSubscription,
          hasCompletedProfile: status.registrationStatus.hasCompletedProfile,
        });

        // Priority: Subscription > Member > Profile
        if (!status.registrationStatus.hasSubscription) {
          console.log('[WARN] No subscription - redirecting to plan selection');
          // Check if user has member record (indicates subscription might be expired)
          const hasExpiredSubscription = status.hasMember;
          router.replace({
            pathname: '/(auth)/register-plan',
            params: {
              userId: user.id,
              accessToken: '', // Will be retrieved from storage if needed
              refreshToken: '',
              expired: hasExpiredSubscription ? 'true' : 'false',
            },
          });
        } else if (
          !status.hasMember ||
          !status.registrationStatus.hasCompletedProfile
        ) {
          console.log(
            '[WARN] Subscription OK but profile incomplete - redirecting to profile'
          );
          router.replace({
            pathname: '/(auth)/register-profile',
            params: {
              userId: user.id,
              accessToken: '',
              refreshToken: '',
              paymentVerified: 'true',
            },
          });
        } else {
          console.log('[SUCCESS] Complete registration - redirecting to home');
          router.replace('/(tabs)');
        }
      };

      handleRedirect();
    }
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, user?.id, hasChecked]);

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

  // Show loading while checking auth
  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
          />
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {t('common.loading')}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
          />
        </View>

        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={require('@/assets/images/logo-full.png')}
            style={[
              styles.bannerImage,
              {
                ...theme.shadows.lg,
                shadowColor: theme.colors.black,
              },
            ]}
          />
        </View>

        {/* Title and Subtitle */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {t('welcome.title')}
          </Text>
          <Text
            style={[styles.subTitle, { color: theme.colors.textSecondary }]}
          >
            {t('welcome.subtitle')}
          </Text>
        </View>

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
                styles.buttonWrapper,
                {
                  backgroundColor: theme.colors.primary,
                  borderTopLeftRadius: theme.radius.lg,
                  borderBottomLeftRadius: theme.radius.lg,
                  transform: [{ scale: loginScale }],
                  ...theme.shadows.md,
                  shadowColor: theme.colors.primary,
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
                styles.buttonWrapper,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopRightRadius: theme.radius.lg,
                  borderBottomRightRadius: theme.radius.lg,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                  transform: [{ scale: signupScale }],
                },
              ]}
            >
              <Text
                style={[
                  styles.signupButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                {t('auth.register')}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Will be overridden by theme
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logo: {
    height: 64,
    width: 200,
    resizeMode: 'contain',
  },
  bannerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
  },
  bannerImage: {
    height: 300,
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    resizeMode: 'contain',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 56,
    paddingHorizontal: 8,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: 12,
    width: '100%',
  },
  subTitle: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    width: '100%',
    lineHeight: 26,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 340,
    height: 56,
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressableWrapper: {
    flex: 1,
    height: '100%',
  },
  buttonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 8,
  },
  divider: {
    width: 1,
    height: '80%',
    opacity: 0.2,
  },
  loginButtonText: {
    ...Typography.buttonLarge,
    fontWeight: '600',
  },
  signupButtonText: {
    ...Typography.buttonLarge,
    fontWeight: '600',
  },
  loadingText: {
    ...Typography.bodyMedium,
    marginTop: 20,
  },
});
