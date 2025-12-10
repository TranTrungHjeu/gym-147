import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterCompleteScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { setTokens, loadMemberProfile } = useAuth();

  const userId = params.userId as string;
  const accessToken = params.accessToken as string;
  const refreshToken = params.refreshToken as string;

  // Animation refs
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  // Benefits data
  const benefits = [
    {
      icon: 'fitness',
      title: t('registration.benefitAccess'),
      description: t('registration.benefitAccessDescription'),
      gradient: ['#FF6B6B', '#FF8E8E'],
    },
    {
      icon: 'calendar',
      title: t('registration.benefitClasses'),
      description: t('registration.benefitClassesDescription'),
      gradient: ['#4ECDC4', '#6EDDD6'],
    },
    {
      icon: 'stats-chart',
      title: t('registration.benefitProgress'),
      description: t('registration.benefitProgressDescription'),
      gradient: ['#95E1D3', '#AAE8DD'],
    },
    {
      icon: 'trophy',
      title: t('registration.benefitAchievements'),
      description: t('registration.benefitAchievementsDescription'),
      gradient: ['#F38181', '#F8A5A5'],
    },
  ];

  // Benefit item animations
  const benefitAnimations = useRef(
    benefits.map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(-20),
    }))
  ).current;

  useEffect(() => {
    // Set authentication tokens and load member profile
    const initializeAuth = async () => {
      if (accessToken && refreshToken) {
        await setTokens(accessToken, refreshToken);

        // Load member profile after setting tokens
        setTimeout(async () => {
          try {
            await loadMemberProfile();
          } catch (loadError) {
            // Don't block, member profile can be loaded later
          }
        }, 500);
      }
    };

    initializeAuth();

    // Start entrance animations
    Animated.sequence([
      // Title animation
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Subtitle animation
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Card animation
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Benefits stagger animation
      Animated.stagger(
        100,
        benefitAnimations.map((anim) =>
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.spring(anim.translateX, {
              toValue: 0,
              tension: 50,
              friction: 8,
              useNativeDriver: true,
            }),
          ])
        )
      ),
      // Button animation
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [accessToken, refreshToken, setTokens, loadMemberProfile]);

  const handleGetStarted = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.replace('/(tabs)');
    });
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradientBackground: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: '50%',
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.xl * 2,
      paddingBottom: 120,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 36,
      lineHeight: 44,
      letterSpacing: -1,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 18,
      lineHeight: 28,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl * 1.5,
      paddingHorizontal: theme.spacing.md,
    },
    card: {
      padding: theme.spacing.xl,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    cardTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 22,
      lineHeight: 30,
      letterSpacing: -0.3,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    benefitsList: {
      gap: theme.spacing.lg,
    },
    benefitItem: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
    },
    benefitIconContainer: {
      width: 56,
      height: 56,
      borderRadius: theme.radius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    benefitContent: {
      flex: 1,
      paddingTop: theme.spacing.xs,
    },
    benefitTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 17,
      lineHeight: 24,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    benefitDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    tipsCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: `${theme.colors.info}08`,
      borderWidth: 1.5,
      borderColor: `${theme.colors.info}25`,
      marginBottom: theme.spacing.lg,
      shadowColor: theme.colors.info,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    tipsTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.info,
      marginBottom: theme.spacing.xs,
    },
    tipsText: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 12,
    },
    buttonGradient: {
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    getStartedButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 18,
      lineHeight: 24,
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

  return (
    <View style={themedStyles.container}>
      <LinearGradient
        colors={[`${theme.colors.primary}08`, 'transparent']}
        style={themedStyles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={themedStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title with Animation */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          }}
        >
          <Text style={themedStyles.title}>
            {t('registration.welcomeToGym147')}
          </Text>
        </Animated.View>

        {/* Subtitle with Animation */}
        <Animated.View style={{ opacity: subtitleOpacity }}>
          <Text style={themedStyles.subtitle}>
            {t('registration.registrationComplete')}
          </Text>
        </Animated.View>

        {/* Benefits Card with Animation */}
        <Animated.View
          style={[
            themedStyles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Text style={themedStyles.cardTitle}>
            {t('registration.whatYouGet')}
          </Text>

          <View style={themedStyles.benefitsList}>
            {benefits.map((benefit, index) => {
              const anim = benefitAnimations[index];
              return (
                <Animated.View
                  key={index}
                  style={[
                    themedStyles.benefitItem,
                    {
                      opacity: anim.opacity,
                      transform: [{ translateX: anim.translateX }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={benefit.gradient as [string, string]}
                    style={themedStyles.benefitIconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name={benefit.icon as any}
                      size={28}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                  <View style={themedStyles.benefitContent}>
                    <Text style={themedStyles.benefitTitle}>
                      {benefit.title}
                    </Text>
                    <Text style={themedStyles.benefitDescription}>
                      {benefit.description}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Tips Card */}
        <View style={themedStyles.tipsCard}>
          <Text style={themedStyles.tipsTitle}>
            [TIP] {t('registration.proTip')}
          </Text>
          <Text style={themedStyles.tipsText}>
            {t('registration.proTipText')}
          </Text>
        </View>
      </ScrollView>

      {/* Footer Button with Animation */}
      <Animated.View
        style={[
          themedStyles.footerContainer,
          {
            opacity: buttonOpacity,
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.9}>
          <LinearGradient
            colors={[theme.colors.primary, `${theme.colors.primary}DD`]}
            style={themedStyles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={themedStyles.getStartedButtonText}>
              {t('registration.getStarted')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default RegisterCompleteScreen;

