import { ConfirmLogoutModal } from '@/components/ConfirmLogoutModal';
import PlanCard from '@/components/PlanCard';
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
  Animated,
  BackHandler,
  Modal,
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
  const [accessToken, setAccessToken] = useState<string>(
    params.accessToken as string
  );
  const [refreshToken, setRefreshToken] = useState<string>(
    params.refreshToken as string
  );
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const expiredModalScale = React.useRef(new Animated.Value(0)).current;
  const expiredModalFade = React.useRef(new Animated.Value(0)).current;

  const userId = params.userId as string;
  const isExpired = params.expired === 'true';

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

  // Show expired modal if user has expired subscription
  useEffect(() => {
    if (isExpired && !isLoading) {
      setShowExpiredModal(true);
    }
  }, [isExpired, isLoading]);

  useEffect(() => {
    if (showExpiredModal) {
      Animated.parallel([
        Animated.spring(expiredModalScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(expiredModalFade, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      expiredModalScale.setValue(0);
      expiredModalFade.setValue(0);
    }
  }, [showExpiredModal]);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (showLogoutModal) {
            // Nếu modal đang mở, đóng modal thay vì logout
            handleCloseLogoutModal();
            return true;
          }
          // Nếu modal đóng, hiển thị modal xác nhận
          handleBack();
          return true; // Prevent default back behavior
        }
      );

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
              isCurrentPlan={false}
              canUpgrade={true}
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

      {/* Subscription Expired Modal */}
      <Modal visible={showExpiredModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.colors.surface,
                transform: [{ scale: expiredModalScale }],
                opacity: expiredModalFade,
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
              {t('subscription.expiredTitle') || 'Gói đã hết hạn'}
            </Text>

            {/* Message */}
            <Text
              style={[
                styles.modalMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t('subscription.expiredMessage') ||
                'Gói thành viên của bạn đã hết hạn. Vui lòng chọn gói mới để tiếp tục sử dụng dịch vụ.'}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setShowExpiredModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>
                {t('common.ok') || 'Đã hiểu'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});

export default RegisterPlanScreen;
