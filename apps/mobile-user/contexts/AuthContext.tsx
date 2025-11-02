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

  // Check for existing auth session on mount
  useEffect(() => {
    checkAuthStatus();
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

      const response = await authService.login(credentials);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;

        // Store auth data
        await Promise.all([storeToken(accessToken), storeUser(user)]);

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
                const subscriptions = await billingService.getMemberSubscriptions(
                  profile.id
                );

                const activeSubscription = subscriptions.find((sub: any) => {
                  const latestPayment = sub.payments?.[0]; // Get latest payment
                  return (
                    sub.status === 'ACTIVE' && latestPayment?.status === 'COMPLETED'
                  );
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
      setMember(null);
      return;
    }

    try {
      const profileResponse = await memberService.getMemberProfile();
      if (profileResponse.success && profileResponse.data?.id) {
        // Store member.id (actual member_id from member service, not user_id from identity service)
        setMember({ id: profileResponse.data.id });
      } else {
        setMember(null);
      }
    } catch (error: any) {
      console.error('Error loading member profile:', error);
      setMember(null);
    }
  };

  const setTokens = async (accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    // Store tokens
    await storeTokens(accessToken, refreshToken);
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

            const activeSubscription = subscriptions.find((sub: any) => {
              const latestPayment = sub.payments?.[0]; // Get latest payment
              return (
                sub.status === 'ACTIVE' && latestPayment?.status === 'COMPLETED'
              );
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
