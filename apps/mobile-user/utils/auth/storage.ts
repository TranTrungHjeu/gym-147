import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types/authTypes';

const TOKEN_KEY = '@fittrack_auth_token';
const USER_KEY = '@fittrack_user';

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
 * Clear all auth data
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await Promise.all([
      removeToken(),
      removeUser(),
    ]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};
