// Authentication utility functions

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TRAINER' | 'MEMBER';
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    return false;
  }

  return isTokenValid(token);
};

/**
 * Get current user data
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Get current authentication state
 */
export const getAuthState = (): AuthState => {
  const token = localStorage.getItem('accessToken');
  const user = getCurrentUser();

  return {
    isAuthenticated: isAuthenticated(),
    user,
    token,
  };
};

/**
 * Check if token is valid (not expired)
 */
export const isTokenValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token is expired
    return payload.exp * 1000 > Date.now();
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Check if user has required role
 */
export const hasRole = (requiredRole: string | string[]): boolean => {
  const user = getCurrentUser();
  if (!user) return false;

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return allowedRoles.includes(user.role);
};

/**
 * Get dashboard path based on user role
 */
export const getDashboardPath = (role?: string): string => {
  const userRole = role || getCurrentUser()?.role;

  switch (userRole) {
    case 'SUPER_ADMIN':
      return '/super-admin-dashboard';
    case 'ADMIN':
      return '/admin-dashboard';
    case 'TRAINER':
      return '/trainerdashboard/homepage';
    case 'MEMBER':
      return '/member-dashboard';
    default:
      return '/auth';
  }
};

/**
 * Clear authentication data
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isLoggedIn');
};

/**
 * Set authentication data
 */
export const setAuthData = (accessToken: string, refreshToken: string, user: User): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('isLoggedIn', 'true');
};
