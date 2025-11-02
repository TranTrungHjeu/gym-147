import { User } from '@/types/authTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@fittrack_auth_token';
const USER_KEY = '@fittrack_user';
const REMEMBER_ME_KEY = '@fittrack_remember_me';

/**
 * Store auth token
 */
export const storeToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
};

/**
 * Get auth token
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Remove auth token
 */
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
    throw error;
  }
};

/**
 * Store user data
 */
export const storeUser = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user:', error);
    throw error;
  }
};

/**
 * Get user data
 */
export const getUser = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Remove user data
 */
export const removeUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing user:', error);
    throw error;
  }
};

/**
 * Store both access and refresh tokens
 */
export const storeTokens = async (
  accessToken: string,
  refreshToken: string
): Promise<void> => {
  try {
    await Promise.all([
      storeToken(accessToken),
      AsyncStorage.setItem('@fittrack_refresh_token', refreshToken),
    ]);
  } catch (error) {
    console.error('Error storing tokens:', error);
    throw error;
  }
};

/**
 * Get refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('@fittrack_refresh_token');
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

/**
 * Get both access and refresh tokens
 */
export const getTokens = async (): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      getToken(),
      getRefreshToken(),
    ]);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error getting tokens:', error);
    return { accessToken: null, refreshToken: null };
  }
};

/**
 * Remove refresh token
 */
export const removeRefreshToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('@fittrack_refresh_token');
  } catch (error) {
    console.error('Error removing refresh token:', error);
    throw error;
  }
};

/**
 * Clear all auth data
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await Promise.all([removeToken(), removeRefreshToken(), removeUser()]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

/**
 * Store remember me preference
 */
export const storeRememberMe = async (rememberMe: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(rememberMe));
  } catch (error) {
    console.error('Error storing remember me preference:', error);
    throw error;
  }
};

/**
 * Get remember me preference
 */
export const getRememberMe = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    return value ? JSON.parse(value) : false;
  } catch (error) {
    console.error('Error getting remember me preference:', error);
    return false;
  }
};
