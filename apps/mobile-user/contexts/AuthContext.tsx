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
        console.log('✅ Auth session restored');
      } else if (!rememberMe) {
        // Only clear auth data if user didn't choose to remember login
        console.log('❌ No auth session found and remember me is false');
        setUser(null);
        setToken(null);
      } else {
        // If rememberMe is true but no token/userData, keep current session
        console.log(
          '❌ No auth session found but remember me is true - keeping current session'
        );
        // Don't clear user and token - keep them as they are
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

      // Debug: Test API connection first
      console.log('🔍 Testing API connection before login...');
      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        throw new Error(
          'Cannot connect to API server. Please check your network connection and server status.'
        );
      }

      console.log('🔐 Attempting login with credentials:', {
        email: credentials.email,
      });
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

        // Check subscription status first (more important than member record)
        console.log('🔍 Checking subscription status after login...');
        let registrationStatus = {
          hasSubscription: false,
          hasCompletedProfile: false,
        };

        try {
          console.log('🔍 Fetching subscriptions for user:', user.id);
          const subscriptions = await billingService.getMemberSubscriptions(
            user.id
          );
          console.log('📋 Subscriptions response:', subscriptions);
          console.log('📋 Subscriptions count:', subscriptions?.length || 0);

          const activeSubscription = subscriptions.find((sub: any) => {
            const latestPayment = sub.payments?.[0]; // Get latest payment
            console.log('  🔎 Checking subscription:', {
              id: sub.id,
              status: sub.status,
              payment_status: latestPayment?.status,
              payment_count: sub.payments?.length || 0,
            });
            return (
              sub.status === 'ACTIVE' && latestPayment?.status === 'COMPLETED'
            );
          });

          registrationStatus.hasSubscription = !!activeSubscription;
          console.log(
            `📋 Has subscription: ${registrationStatus.hasSubscription}`,
            activeSubscription ? `(ID: ${activeSubscription.id})` : ''
          );
        } catch (err) {
          console.log('⚠️ Error checking subscription:', err);
        }

        // Check if user has member record
        console.log('🔍 Checking member status after login...');
        const memberExists = await memberService.checkMemberExists();
        setHasMember(memberExists);

        if (memberExists) {
          console.log('✅ Member record found, checking profile completion...');

          // Check profile completion
          try {
            const profileResponse = await memberService.getMemberProfile();
            const profile = profileResponse?.data; // ✅ Extract data from response

            console.log('🔍 Full profile response:', profileResponse);
            console.log('🔍 Profile data:', {
              date_of_birth: profile?.date_of_birth,
              height: profile?.height,
              weight: profile?.weight,
              phone: profile?.phone,
            });

            // Profile is complete if has essential fields:
            // 1. Has date_of_birth
            // 2. Has basic info (height & weight)
            // Note: Phone is optional, can be added later
            const hasDateOfBirth = !!profile?.date_of_birth;
            const hasBasicInfo = !!(profile?.height && profile?.weight);

            registrationStatus.hasCompletedProfile =
              hasDateOfBirth && hasBasicInfo;

            console.log(`👤 Profile completion check:`, {
              hasDateOfBirth: hasDateOfBirth ? '✅' : '❌',
              hasBasicInfo: hasBasicInfo
                ? `✅ (h:${profile?.height}, w:${profile?.weight})`
                : `❌ (h:${profile?.height}, w:${profile?.weight})`,
              result: registrationStatus.hasCompletedProfile
                ? '✅ Complete'
                : '❌ Incomplete',
            });
          } catch (err) {
            console.log('⚠️ Error checking profile:', err);
          }
        } else {
          console.log('⚠️ User logged in but no member record found');
        }

        return {
          hasMember: memberExists,
          user,
          accessToken,
          refreshToken,
          registrationStatus,
        };
      } else {
        console.log('❌ Login failed:', response.message);
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      console.log('❌ Login error:', errorMessage);
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
    } catch (err) {
      console.error('Logout error:', err);
      // Even if API call fails, clear local data
      await clearAuthData();
      setUser(null);
      setToken(null);
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

  const setTokens = async (accessToken: string, refreshToken: string) => {
    setToken(accessToken);
    // Store tokens
    await storeTokens(accessToken, refreshToken);
    console.log('✅ Tokens set in AuthContext');

    // Check if member exists after setting tokens
    try {
      const memberExists = await memberService.checkMemberExists();
      setHasMember(memberExists);
      console.log('✅ Member status updated:', memberExists);
    } catch (err) {
      console.log('⚠️ Error checking member after setTokens:', err);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    hasMember,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    setTokens,
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
