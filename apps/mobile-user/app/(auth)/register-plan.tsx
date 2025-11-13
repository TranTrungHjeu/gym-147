import { ConfirmLogoutModal } from '@/components/ConfirmLogoutModal';
import { PlanCard } from '@/components/PlanCard';
import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billing/billing.service';
import { MembershipPlan } from '@/types/billingTypes';
import { getTokens } from '@/utils/auth/storage';
import { useTheme } from '@/utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RegisterPlanScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { logout } = useAuth();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>(params.accessToken as string);
  const [refreshToken, setRefreshToken] = useState<string>(params.refreshToken as string);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userId = params.userId as string;

  // Load tokens from storage if params are empty
  useEffect(() => {
    const loadTokens = async () => {
      if (!accessToken || !refreshToken) {
        const tokens = await getTokens();
        if (tokens.accessToken && tokens.refreshToken) {
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);
        }
      }
    };
    loadTokens();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showLogoutModal) {
          // Nếu modal đang mở, đóng modal thay vì logout
          handleCloseLogoutModal();
          return true;
        }
        // Nếu modal đóng, hiển thị modal xác nhận
        handleBack();
        return true; // Prevent default back behavior
      });

      return () => backHandler.remove();
    }
  }, [showLogoutModal]);

  const fetchPlans = async () => {
    try {
      const fetchedPlans = await billingService.getActivePlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      Alert.alert(t('common.error'), t('registration.plansFetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      Alert.alert(t('common.warning'), t('registration.selectPlanWarning'));
      return;
    }

    router.push({
      pathname: '/(auth)/register-coupon',
      params: {
        userId,
        accessToken,
        refreshToken,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planType: selectedPlan.type,
        planPrice: selectedPlan.price.toString(),
        setupFee: (selectedPlan.setup_fee || 0).toString(),
        durationMonths: selectedPlan.duration_months.toString(),
      },
    });
  };

  const handleBack = () => {
    // Hiển thị modal xác nhận trước khi logout
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Logout và clear auth data
      await logout();
      // Redirect về màn hình đăng nhập
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Vẫn redirect về login ngay cả khi logout API fail
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleCloseLogoutModal = () => {
    if (!isLoggingOut) {
      setShowLogoutModal(false);
    }
  };

  const themedStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      paddingBottom: 120,
    },
    header: {
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.5,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textSecondary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 400,
    },
    loadingText: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    },
    plansContainer: {
      // gap removed to avoid issues
    },
    footerContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    continueButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    continueButtonDisabled: {
      opacity: 0.5,
      shadowOpacity: 0,
      elevation: 0,
    },
    continueButtonText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.3,
      color: theme.colors.textInverse,
    },
  });

  if (isLoading) {
    return (
      <View style={[themedStyles.container, themedStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={themedStyles.loadingText}>
          {t('registration.loadingPlans')}
        </Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={themedStyles.scrollContent}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={themedStyles.title}>
            {t('registration.chooseMembershipPlan')}
          </Text>
          <Text style={themedStyles.subtitle}>
            {t('registration.choosePlanSubtitle')}
          </Text>
        </View>

        <View style={themedStyles.plansContainer}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => setSelectedPlan(plan)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={themedStyles.footerContainer}>
        <TouchableOpacity
          style={[
            themedStyles.continueButton,
            !selectedPlan && themedStyles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Text style={themedStyles.continueButtonText}>
            {t('registration.continue')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Confirmation Modal */}
      <ConfirmLogoutModal
        visible={showLogoutModal}
        onClose={handleCloseLogoutModal}
        onConfirm={handleConfirmLogout}
        loading={isLoggingOut}
      />
    </View>
  );
};

export default RegisterPlanScreen;
