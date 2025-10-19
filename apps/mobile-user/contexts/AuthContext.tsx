import { authService } from '@/services/auth.service';
import { userService } from '@/services/user.service';
import { debugApi } from '@/utils/debug';
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
  getToken,
  getUser,
  storeToken,
  storeUser,
} from '@/utils/auth/storage';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user;

  // Check for existing auth session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const [token, userData] = await Promise.all([getToken(), getUser()]);

      if (token && userData) {
        setUser(userData);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // Debug: Test API connection first
      console.log('🔍 Testing API connection before login...');
      const isConnected = await debugApi.testConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to API server. Please check your network connection and server status.');
      }

      console.log('🔐 Attempting login with credentials:', { email: credentials.email });
      const response = await authService.login(credentials);

      if (response.success && response.user && response.token) {
        // Store auth data
        await Promise.all([
          storeToken(response.token),
          storeUser(response.user),
        ]);
        setUser(response.user);
        console.log('✅ Login successful');
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
    } catch (err) {
      console.error('Logout error:', err);
      // Even if API call fails, clear local data
      await clearAuthData();
      setUser(null);
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

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
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
