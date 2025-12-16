import { authService, userService } from '@/services';
import { billingService } from '@/services/billing/billing.service';
import { memberService } from '@/services/member/member.service';
import {
  AuthContextType,
  ForgotPasswordData,
  LoginCredentials,
  RegisterCredentials,
  ResetPasswordData,
  User,
} from '@/types/authTypes';
import {
  clearAuthData,
  getRememberMe,
  getToken,
  getUser,
  storeRememberMe,
  storeToken,
  storeTokens,
  storeUser,
} from '@/utils/auth/storage';
import { debugApi } from '@/utils/debug';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMember, setHasMember] = useState<boolean | null>(null);
  const [member, setMember] = useState<{ id: string } | null>(null); // Store member.id (member_id from member service)
  const isAuthenticated = !!user && !!token;

  /**
   * Helper function to check if a subscription is valid for app access
   * Business logic:
   * 1. Subscription status must be ACTIVE or TRIAL
   * 2. Subscription must not be expired (end_date or current_period_end > now)
   * 3. For ACTIVE subscription: must have at least one COMPLETED payment
   * 4. For TRIAL subscription: payment is optional (trial can be free)
   * 5. Handle upgrade case: user can have PENDING payment from upgrade but still access app
   *    if they have previous COMPLETED payment
   */
  const isSubscriptionActive = (sub: any): boolean => {
    // Step 1: Check subscription status
    // Only ACTIVE and TRIAL subscriptions are valid
    if (!['ACTIVE', 'TRIAL'].includes(sub.status)) {
      console.log('[SUBSCRIPTION] Invalid status:', {
        subscriptionId: sub.id,
        status: sub.status,
        validStatuses: ['ACTIVE', 'TRIAL'],
      });
      return false;
    }

    // Step 2: Check expiration date
    // Subscription is expired if end_date or current_period_end is in the past
    const expirationDate = sub.current_period_end || sub.end_date;
    if (expirationDate) {
      const expiration = new Date(expirationDate);
      const now = new Date();

      // Add 1 day buffer to handle timezone issues and end-of-day scenarios
      // Subscription expires at end of day, so we check if expiration < now (not <=)
      if (expiration < now) {
        console.log('[SUBSCRIPTION] Subscription expired:', {
          subscriptionId: sub.id,
          status: sub.status,
          expirationDate: expiration.toISOString(),
          now: now.toISOString(),
          expired: true,
        });
        return false;
      }
    } else {
      // If no expiration date, consider it invalid (should always have end_date)
      console.log('[SUBSCRIPTION] No expiration date found:', {
        subscriptionId: sub.id,
        status: sub.status,
      });
      return false;
    }

    // Step 3: Check payment status based on subscription type
    const payments = sub.payments || [];
    const completedPayments = payments.filter(
      (payment: any) => payment.status === 'COMPLETED'
    );
    const pendingPayments = payments.filter(
      (payment: any) =>
        payment.status === 'PENDING' || payment.status === 'PROCESSING'
    );

    // For TRIAL subscription: payment is optional
    if (sub.status === 'TRIAL') {
      // Check trial period if exists
      if (sub.trial_end) {
        const trialEnd = new Date(sub.trial_end);
        const now = new Date();
        if (trialEnd < now) {
          console.log('[SUBSCRIPTION] Trial period expired:', {
            subscriptionId: sub.id,
            trialEnd: trialEnd.toISOString(),
            now: now.toISOString(),
          });
          return false;
        }
      }

      // TRIAL subscription is valid if not expired
      // Payment is optional for trial
      console.log('[SUBSCRIPTION] Valid TRIAL subscription:', {
        subscriptionId: sub.id,
        hasCompletedPayment: completedPayments.length > 0,
        hasPendingPayment: pendingPayments.length > 0,
      });
      return true;
    }

    // For ACTIVE subscription: must have at least one COMPLETED payment
    if (sub.status === 'ACTIVE') {
      if (completedPayments.length === 0) {
        console.log(
          '[SUBSCRIPTION] ACTIVE subscription without COMPLETED payment:',
          {
            subscriptionId: sub.id,
            totalPayments: payments.length,
            paymentStatuses: payments.map((p: any) => p.status),
            hasPendingPayment: pendingPayments.length > 0,
          }
        );
        // If no completed payment, subscription is not valid
        // This could be a subscription that was manually activated but never paid
        // or a subscription that was created but payment failed
        return false;
      }

      // ACTIVE subscription with COMPLETED payment is valid
      // Even if there are PENDING payments (from upgrade), user can still access app
      console.log('[SUBSCRIPTION] Valid ACTIVE subscription:', {
        subscriptionId: sub.id,
        completedPayments: completedPayments.length,
        pendingPayments: pendingPayments.length,
        latestPaymentStatus: payments[0]?.status,
      });
      return true;
    }

    // Should not reach here, but return false as safety
    return false;
  };

  /**
   * Helper function to select the best active subscription from a list
   * Returns the subscription with highest plan tier (VIP > PREMIUM > BASIC > STUDENT)
   */
  const selectBestActiveSubscription = (subscriptions: any[]): any | null => {
    // Find all active subscriptions (còn hạn)
    const activeSubscriptions = subscriptions.filter((sub: any) => {
      return isSubscriptionActive(sub);
    });

    if (activeSubscriptions.length === 0) {
      return null;
    }

    // If only one active subscription, return it
    if (activeSubscriptions.length === 1) {
      return activeSubscriptions[0];
    }

    // If multiple active subscriptions, choose the one with highest plan tier
    // Plan tier order: VIP > PREMIUM > BASIC > STUDENT
    const planTierOrder: { [key: string]: number } = {
      VIP: 4,
      PREMIUM: 3,
      BASIC: 2,
      STUDENT: 1,
    };

    const bestSubscription = activeSubscriptions.reduce(
      (highest: any, current: any) => {
        const currentTier = planTierOrder[current.plan?.type || 'BASIC'] || 0;
        const highestTier = planTierOrder[highest.plan?.type || 'BASIC'] || 0;
        return currentTier > highestTier ? current : highest;
      }
    );

    console.log('[SUBSCRIPTION] Selected highest tier subscription:', {
      totalActive: activeSubscriptions.length,
      selectedPlanType: bestSubscription.plan?.type,
      selectedSubscriptionId: bestSubscription.id,
      allActivePlans: activeSubscriptions.map((s: any) => s.plan?.type),
    });

    return bestSubscription;
  };

  // Check for existing auth session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Listen for user:deleted event (account deletion)
  // Note: The actual modal display and logout will be handled by AppContent in _layout.tsx
  // This is just to ensure the event is available
  useEffect(() => {
    // Event listener is handled in AppContent component
    // This effect is kept for potential future use
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const [token, userData, rememberMe] = await Promise.all([
        getToken(),
        getUser(),
        getRememberMe(),
      ]);

      if (token && userData) {
        setUser(userData);
        setToken(token);

        // Load member profile if user exists (async, don't block)
        if (userData.id) {
          (async () => {
            try {
              const memberExists = await memberService.checkMemberExists();
              setHasMember(memberExists);
              if (memberExists) {
                // Load member profile to get member_id
                const profileResponse = await memberService.getMemberProfile();
                if (profileResponse.success && profileResponse.data?.id) {
                  setMember({ id: profileResponse.data.id });
                }
              }
            } catch (err) {
              // Silent fail - member profile can be loaded later
            }
          })();
        }
      } else if (!rememberMe) {
        // Only clear auth data if user didn't choose to remember login
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    credentials: LoginCredentials & { rememberMe?: boolean }
  ): Promise<
    | {
        hasMember: boolean;
        user: any;
        accessToken: string;
        refreshToken?: string;
        registrationStatus?: {
          hasSubscription: boolean;
          hasCompletedProfile: boolean;
        };
      }
    | {
        requires2FA: true;
        userId: string;
      }
  > => {
    try {
      setIsLoading(true);
      setError(null);

      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        throw new Error(
          'Cannot connect to API server. Please check your network connection and server status.'
        );
      }

      const response = await authService.login(credentials);

      // Check if 2FA is required (check in both success and failure cases)
      // API service may wrap HTTP 200 responses as success: true even if the JSON has success: false
      if (response.data && (response.data as any).requires2FA) {
        return {
          requires2FA: true,
          userId: (response.data as any).userId,
        };
      }

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Only store auth data if we have valid tokens and user
        if (accessToken) {
          const storePromises = [storeToken(accessToken)];
          if (user) {
            storePromises.push(storeUser(user));
          }
          await Promise.all(storePromises);
        }

        // Store remember me preference
        if (credentials.rememberMe) {
          await storeRememberMe(true);
        }

        setUser(user);
        setToken(accessToken);

        // Register push notification token
        try {
          const { pushNotificationService } = await import(
            '@/services/notification/push.service'
          );
          await pushNotificationService.registerPushToken(user.id);
        } catch (pushError) {
          // Don't fail login if push registration fails
        }

        // Check if user has member record
        const memberExists = await memberService.checkMemberExists();
        setHasMember(memberExists);

        // Check subscription status (requires member_id from member service)
        let registrationStatus = {
          hasSubscription: false,
          hasCompletedProfile: false,
        };

        if (memberExists) {
          // Load member profile and store member.id
          await loadMemberProfile();

          // Get member profile once to check both subscription and profile completion
          try {
            const profileResponse = await memberService.getMemberProfile();
            const profile = profileResponse?.data;

            if (profile?.id) {
              // Check subscription using member.id
              try {
                const subscriptions =
                  await billingService.getMemberSubscriptions(profile.id);

                const activeSubscription = subscriptions.find((sub: any) => {
                  return isSubscriptionActive(sub);
                });

                registrationStatus.hasSubscription = !!activeSubscription;
              } catch (err) {
                // Silent fail
              }
            }

            // Check profile completion
            if (profile) {
              const hasDateOfBirth = !!profile?.date_of_birth;
              const hasBasicInfo = !!(profile?.height && profile?.weight);

              registrationStatus.hasCompletedProfile =
                hasDateOfBirth && hasBasicInfo;
            }
          } catch (err) {
            // Silent fail
          }
        } else {
          setMember(null);
        }

        return {
          hasMember: memberExists,
          user,
          accessToken,
          refreshToken,
          registrationStatus,
        };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify 2FA code for login
   */
  const verify2FALogin = async (
    userId: string,
    twoFactorToken: string,
    rememberMe?: boolean
  ): Promise<{
    hasMember: boolean;
    user: any;
    accessToken: string;
    refreshToken?: string;
    registrationStatus?: {
      hasSubscription: boolean;
      hasCompletedProfile: boolean;
    };
  }> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.verify2FALogin(userId, twoFactorToken);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Store auth data
        if (accessToken) {
          const storePromises = [storeToken(accessToken)];
          if (user) {
            storePromises.push(storeUser(user));
          }
          await Promise.all(storePromises);
        }

        // Store remember me preference
        if (rememberMe) {
          await storeRememberMe(true);
        }

        setUser(user);
        setToken(accessToken);

        // Register push notification token
        try {
          const { pushNotificationService } = await import(
            '@/services/notification/push.service'
          );
          await pushNotificationService.registerPushToken(user.id);
        } catch (pushError) {
          // Don't fail login if push registration fails
        }

        // Check if user has member record
        const memberExists = await memberService.checkMemberExists();
        setHasMember(memberExists);

        // Check subscription status
        let registrationStatus = {
          hasSubscription: false,
          hasCompletedProfile: false,
        };

        if (memberExists) {
          await loadMemberProfile();

          try {
            const profileResponse = await memberService.getMemberProfile();
            const profile = profileResponse?.data;

            if (profile?.id) {
              try {
                const subscriptions =
                  await billingService.getMemberSubscriptions(profile.id);

                // Find pending subscriptions (có thể là upgrade đang chờ thanh toán) - chỉ để log
                const pendingSubscriptions = subscriptions.filter(
                  (sub: any) => {
                    return (
                      sub.status === 'PENDING' &&
                      (sub.current_period_end || sub.end_date) &&
                      new Date(sub.current_period_end || sub.end_date) >
                        new Date()
                    );
                  }
                );

                // Select best active subscription (highest tier)
                const activeSubscription =
                  selectBestActiveSubscription(subscriptions);

                // Log pending subscriptions for debugging
                if (pendingSubscriptions.length > 0 && activeSubscription) {
                  console.log('[SUBSCRIPTION] Found pending subscriptions:', {
                    totalPending: pendingSubscriptions.length,
                    pendingPlans: pendingSubscriptions.map(
                      (s: any) => s.plan?.type
                    ),
                    activePlan: activeSubscription.plan?.type,
                  });
                }

                // Note: PENDING subscriptions are not used for access
                // User must use active subscription. PENDING subscription will be activated
                // when payment is completed.

                registrationStatus.hasSubscription = !!activeSubscription;
              } catch (err) {
                // Silent fail
              }
            }

            if (profile) {
              const hasDateOfBirth = !!profile?.date_of_birth;
              const hasBasicInfo = !!(profile?.height && profile?.weight);
              registrationStatus.hasCompletedProfile =
                hasDateOfBirth && hasBasicInfo;
            }
          } catch (err) {
            // Silent fail
          }
        } else {
          setMember(null);
        }

        return {
          hasMember: memberExists,
          user,
          accessToken,
          refreshToken,
          registrationStatus,
        };
      } else {
        throw new Error(response.message || '2FA verification failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '2FA verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFace = async (
    image: string
  ): Promise<{
    hasMember: boolean;
    user: any;
    accessToken: string;
    refreshToken?: string;
    registrationStatus?: {
      hasSubscription: boolean;
      hasCompletedProfile: boolean;
    };
  }> => {
    try {
      setIsLoading(true);
      setError(null);

      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        throw new Error(
          'Cannot connect to API server. Please check your network connection and server status.'
        );
      }

      const response = await authService.loginWithFace(image);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Only store auth data if we have valid tokens and user
        if (accessToken) {
          const storePromises = [storeToken(accessToken)];
          if (user) {
            storePromises.push(storeUser(user));
          }
          await Promise.all(storePromises);
        }

        setUser(user);
        setToken(accessToken);

        // Register push notification token
        try {
          const { pushNotificationService } = await import(
            '@/services/notification/push.service'
          );
          await pushNotificationService.registerPushToken(user.id);
        } catch (pushError) {
          // Don't fail login if push registration fails
        }

        // Check if user has member record
        const memberExists = await memberService.checkMemberExists();
        setHasMember(memberExists);

        // Check subscription status (requires member_id from member service)
        let registrationStatus = {
          hasSubscription: false,
          hasCompletedProfile: false,
        };

        if (memberExists) {
          // Load member profile and store member.id
          await loadMemberProfile();

          // Get member profile once to check both subscription and profile completion
          try {
            const profileResponse = await memberService.getMemberProfile();
            const profile = profileResponse?.data;

            if (profile?.id) {
              // Check subscription using member.id
              try {
                const subscriptions =
                  await billingService.getMemberSubscriptions(profile.id);

                const activeSubscription = subscriptions.find((sub: any) => {
                  return isSubscriptionActive(sub);
                });

                registrationStatus.hasSubscription = !!activeSubscription;
              } catch (err) {
                // Silent fail
              }
            }

            // Check profile completion
            if (profile) {
              const hasDateOfBirth = !!profile?.date_of_birth;
              const hasBasicInfo = !!(profile?.height && profile?.weight);

              registrationStatus.hasCompletedProfile =
                hasDateOfBirth && hasBasicInfo;
            }
          } catch (err) {
            // Silent fail
          }
        } else {
          setMember(null);
        }

        return {
          hasMember: memberExists,
          user,
          accessToken,
          refreshToken,
          registrationStatus,
        };
      } else {
        // IMPROVEMENT: Check for biometric fallback
        const biometricFallback = (response as any).biometricFallback;
        const errorCode = (response as any).errorCode;

        if (biometricFallback || errorCode === 'FACE_NOT_RECOGNIZED') {
          // Throw special error with fallback flag
          const error = new Error(response.message || 'Face not recognized');
          (error as any).biometricFallback = true;
          (error as any).errorCode = errorCode;
          throw error;
        }

        throw new Error(response.message || 'Face login failed');
      }
    } catch (err) {
      // IMPROVEMENT: Preserve biometric fallback flag
      if ((err as any).biometricFallback) {
        throw err; // Re-throw with fallback flag
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Face login failed';
      // Don't set error state to avoid showing error toast
      // Error will be handled by the calling component (face-login.tsx)
      // setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.register(credentials);

      if (response.success && response.user && response.token) {
        // Store auth data
        await Promise.all([
          storeToken(response.token),
          storeUser(response.user),
        ]);
        setUser(response.user);
        setToken(response.token); // Set token state immediately
        console.log('[REGISTER] Token and user set, will load member profile');

        // Load member profile after registration with delay
        // This ensures token is fully set in storage before making API calls
        setTimeout(async () => {
          try {
            console.log(
              '[REGISTER] Loading member profile after registration...'
            );
            await loadMemberProfile();
            console.log('[REGISTER] Member profile loaded successfully');
          } catch (memberError) {
            // Silent fail - member profile can be loaded later
            console.log(
              '[REGISTER] Member profile not available yet, will load later:',
              memberError
            );
          }
        }, 1000); // 1 second delay to ensure token is set
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Call API logout endpoint
      await authService.logout();

      // Clear local auth data
      await clearAuthData();
      setUser(null);
      setToken(null);
      setMember(null); // Clear member data on logout
      setHasMember(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Even if API call fails, clear local data
      await clearAuthData();
      setUser(null);
      setToken(null);
      setMember(null); // Clear member data on logout
      setHasMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (data: ForgotPasswordData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.forgotPassword(data);

      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send reset email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: ResetPasswordData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.resetPassword(data);

      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user) throw new Error('No user logged in');

      const response = await userService.updateProfile(data);

      if (response.success && response.data) {
        const updatedUser = response.data;
        await storeUser(updatedUser);
        setUser(updatedUser);
      } else {
        throw new Error(response.message || 'Profile update failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Profile update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  /**
   * Load member profile and store member.id for easy access
   * This is the centralized way to get member_id (Member.id) from member service
   * Schema: Member.id is the actual member_id, not user_id
   */
  const loadMemberProfile = async () => {
    if (!user?.id) {
      console.log('[AUTH] loadMemberProfile: No user ID, clearing member');
      setMember(null);
      return;
    }

    if (!token) {
      console.log('[AUTH] loadMemberProfile: No token available, waiting...');
      // Wait a bit for token to be set
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Check again after delay
      const currentToken = await getToken();
      if (!currentToken) {
        console.log('[AUTH] loadMemberProfile: Still no token after delay');
        return;
      }
    }

    try {
      console.log('[AUTH] loadMemberProfile: Loading member profile...');
      const profileResponse = await memberService.getMemberProfile();
      console.log('[AUTH] loadMemberProfile: Response received', {
        success: profileResponse.success,
        hasData: !!profileResponse.data,
        memberId: profileResponse.data?.id,
      });

      if (profileResponse.success && profileResponse.data?.id) {
        // Store member.id (actual member_id from member service, not user_id from identity service)
        const memberId = profileResponse.data.id;
        console.log('[AUTH] loadMemberProfile: Setting member ID', memberId);
        setMember({ id: memberId });
      } else {
        console.log(
          '[AUTH] loadMemberProfile: No member ID in response, clearing member'
        );
        setMember(null);
      }
    } catch (error: any) {
      console.error(
        '[AUTH] loadMemberProfile: Error loading member profile:',
        error
      );
      setMember(null);
    }
  };

  const setTokens = async (accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    // Store tokens
    await storeTokens(accessToken, refreshToken);

    // Load user profile after setting tokens to update AuthContext state
    try {
      const userProfileResponse = await userService.getProfile();
      console.log('[AUTH] User profile response in setTokens:', {
        success: userProfileResponse?.success,
        hasData: !!userProfileResponse?.data,
        dataKeys: userProfileResponse?.data
          ? Object.keys(userProfileResponse.data)
          : [],
      });

      // Handle different response formats
      let userProfile = null;
      if (userProfileResponse?.success && userProfileResponse?.data) {
        // Response format: {success: true, data: {user: {...}}} or {success: true, data: User}
        userProfile = userProfileResponse.data.user || userProfileResponse.data;
      } else if (userProfileResponse?.data) {
        // Response format: {data: {user: {...}}}
        userProfile = userProfileResponse.data.user || userProfileResponse.data;
      } else if (userProfileResponse) {
        // Direct user object
        userProfile = userProfileResponse;
      }

      if (userProfile && userProfile.id) {
        console.log('[AUTH] Setting user from setTokens:', userProfile.id);
        setUser(userProfile);
        await storeUser(userProfile);

        // Wait a bit for state to update, then load member profile
        // Use a small delay to ensure user state is set before loadMemberProfile checks it
        setTimeout(async () => {
          try {
            // Double-check user is set before loading member profile
            const currentUser = await getUser();
            if (currentUser?.id) {
              console.log(
                '[AUTH] User confirmed set, loading member profile...'
              );
              await loadMemberProfile();
            } else {
              console.log('[AUTH] User not yet set in storage, will retry...');
              // Retry after another delay
              setTimeout(async () => {
                try {
                  await loadMemberProfile();
                } catch (memberError) {
                  console.log(
                    '[AUTH] Member profile not available after retry:',
                    memberError
                  );
                }
              }, 500);
            }
          } catch (memberError) {
            // Silent fail - member profile can be loaded later
            console.log(
              '[AUTH] Member profile not available yet after setTokens:',
              memberError
            );
          }
        }, 300);
      } else {
        console.log(
          '[AUTH] No valid user profile in response after setTokens:',
          {
            hasResponse: !!userProfileResponse,
            hasData: !!userProfileResponse?.data,
            userProfile,
          }
        );
      }
    } catch (error) {
      // Silent fail - user profile can be loaded later
      console.log('[AUTH] Failed to load user profile after setTokens:', error);
    }
  };

  /**
   * Check registration status - used by welcome screen and other places
   * Returns registration status to determine if user needs to complete registration
   */
  const checkRegistrationStatus = async (): Promise<{
    hasMember: boolean;
    registrationStatus: {
      hasSubscription: boolean;
      hasCompletedProfile: boolean;
    };
  }> => {
    if (!user?.id) {
      return {
        hasMember: false,
        registrationStatus: {
          hasSubscription: false,
          hasCompletedProfile: false,
        },
      };
    }

    // Check if user has member record
    const memberExists = await memberService.checkMemberExists();
    setHasMember(memberExists);

    let registrationStatus = {
      hasSubscription: false,
      hasCompletedProfile: false,
    };

    if (memberExists) {
      // Load member profile and store member.id
      await loadMemberProfile();

      // Get member profile once to check both subscription and profile completion
      try {
        const profileResponse = await memberService.getMemberProfile();
        const profile = profileResponse?.data;

        if (profile?.id) {
          // Check subscription using member.id
          try {
            const subscriptions = await billingService.getMemberSubscriptions(
              profile.id
            );

            // Select best active subscription (highest tier)
            let activeSubscription =
              selectBestActiveSubscription(subscriptions);

            if (!activeSubscription) {
              // Fallback: Check old logic for backward compatibility
              activeSubscription = subscriptions.find((sub: any) => {
                const latestPayment = sub.payments?.[0]; // Get latest payment

                // Check if subscription is ACTIVE and payment is COMPLETED
                const isActive =
                  sub.status === 'ACTIVE' &&
                  latestPayment?.status === 'COMPLETED';

                if (!isActive) return false;

                // Also check if subscription hasn't expired based on current_period_end or end_date
                const expirationDate = sub.current_period_end || sub.end_date;
                if (expirationDate) {
                  const expiration = new Date(expirationDate);
                  const now = new Date();
                  // Subscription is considered expired if expiration date is in the past
                  if (expiration < now) {
                    console.log('[SUBSCRIPTION] Subscription expired:', {
                      subscriptionId: sub.id,
                      expirationDate: expiration,
                      now: now,
                    });
                    return false; // Subscription has expired
                  }
                }

                return true;
              });
            }

            registrationStatus.hasSubscription = !!activeSubscription;
          } catch (err) {
            // Silent fail
          }
        }

        // Check profile completion
        if (profile) {
          const hasDateOfBirth = !!profile?.date_of_birth;
          const hasBasicInfo = !!(profile?.height && profile?.weight);

          registrationStatus.hasCompletedProfile =
            hasDateOfBirth && hasBasicInfo;
        }
      } catch (err) {
        // Silent fail
      }
    } else {
      setMember(null);
    }

    return {
      hasMember: memberExists,
      registrationStatus,
    };
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    hasMember,
    member, // Expose member.id (member_id) for easy access throughout app
    login,
    verify2FALogin,
    loginWithFace,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    setTokens,
    loadMemberProfile, // Expose function to reload member profile if needed
    checkRegistrationStatus, // Expose function to check registration status
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
