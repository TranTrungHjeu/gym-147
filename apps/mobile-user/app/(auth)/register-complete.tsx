import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
  const { setTokens } = useAuth();

  const userId = params.userId as string;
  const accessToken = params.accessToken as string;
  const refreshToken = params.refreshToken as string;

  useEffect(() => {
    // Set authentication tokens
    const initializeAuth = async () => {
      if (accessToken && refreshToken) {
        await setTokens(accessToken, refreshToken);
      }
    };

    initializeAuth();
  }, [accessToken, refreshToken]);

  const handleGetStarted = () => {
    // Navigate to main app (index is the home screen)
    router.replace('/(tabs)');
  };

  const benefits = [
    {
      icon: 'fitness-outline',
      title: t('registration.benefitAccess'),
      description: t('registration.benefitAccessDescription'),
    },
    {
      icon: 'calendar-outline',
      title: t('registration.benefitClasses'),
      description: t('registration.benefitClassesDescription'),
    },
    {
      icon: 'stats-chart-outline',
      title: t('registration.benefitProgress'),
      description: t('registration.benefitProgressDescription'),
    },
    {
      icon: 'trophy-outline',
      title: t('registration.benefitAchievements'),
      description: t('registration.benefitAchievementsDescription'),
    },
  ];

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      paddingBottom: 100,
    },
    successAnimation: {
      width: 200,
      height: 200,
      alignSelf: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
    },
    successIcon: {
      width: 120,
      height: 120,
      borderRadius: theme.radius.full,
      backgroundColor: `${theme.colors.success}20`,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 18,
      lineHeight: 28,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    card: {
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.xl,
    },
    cardTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    benefitsList: {
      gap: theme.spacing.md,
    },
    benefitItem: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    benefitIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    benefitContent: {
      flex: 1,
    },
    benefitTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
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
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.info}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.info}30`,
      marginBottom: theme.spacing.lg,
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
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    getStartedButton: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    getStartedButtonText: {
      fontFamily: 'Inter-Bold',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textInverse,
    },
  });

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.successIcon}>
          <Ionicons
            name="checkmark-circle"
            size={80}
            color={theme.colors.success}
          />
        </View>

        <Text style={themedStyles.title}>
          {t('registration.welcomeToGym147')}
        </Text>
        <Text style={themedStyles.subtitle}>
          {t('registration.registrationComplete')}
        </Text>

        <View style={themedStyles.card}>
          <Text style={themedStyles.cardTitle}>
            {t('registration.whatYouGet')}
          </Text>

          <View style={themedStyles.benefitsList}>
            {benefits.map((benefit, index) => (
              <View key={index} style={themedStyles.benefitItem}>
                <View style={themedStyles.benefitIcon}>
                  <Ionicons
                    name={benefit.icon as any}
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={themedStyles.benefitContent}>
                  <Text style={themedStyles.benefitTitle}>{benefit.title}</Text>
                  <Text style={themedStyles.benefitDescription}>
                    {benefit.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={themedStyles.tipsCard}>
          <Text style={themedStyles.tipsTitle}>
            💡 {t('registration.proTip')}
          </Text>
          <Text style={themedStyles.tipsText}>
            {t('registration.proTipText')}
          </Text>
        </View>
      </ScrollView>

      <View style={themedStyles.footerContainer}>
        <TouchableOpacity
          style={themedStyles.getStartedButton}
          onPress={handleGetStarted}
        >
          <Text style={themedStyles.getStartedButtonText}>
            {t('registration.getStarted')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RegisterCompleteScreen;
