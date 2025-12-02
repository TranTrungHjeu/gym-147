import { debugApi } from './debug';

/**
 * Network utility for checking connectivity and handling retries
 */

export interface NetworkCheckOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface NetworkCheckResult {
  isConnected: boolean;
  error?: string;
}

class NetworkManager {
  private defaultTimeout = 5000; // 5 seconds
  private defaultRetries = 3;
  private defaultRetryDelay = 1000; // 1 second

  /**
   * Check network connectivity
   */
  async checkConnection(
    options?: NetworkCheckOptions
  ): Promise<NetworkCheckResult> {
    const timeout = options?.timeout || this.defaultTimeout;
    
    try {
      const isConnected = await Promise.race([
        debugApi.testConnection(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Network check timeout')), timeout)
        ),
      ]);

      return {
        isConnected: isConnected as boolean,
      };
    } catch (error: any) {
      return {
        isConnected: false,
        error: error.message || 'Network check failed',
      };
    }
  }

  /**
   * Execute a function with network check and retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: NetworkCheckOptions
  ): Promise<T> {
    const retries = options?.retries || this.defaultRetries;
    const retryDelay = options?.retryDelay || this.defaultRetryDelay;

    // First check network connectivity
    const networkCheck = await this.checkConnection(options);
    if (!networkCheck.isConnected) {
      throw new Error(
        networkCheck.error || 'No network connection available'
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors (e.g., authentication errors)
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403 ||
          error?.message?.includes('authentication')
        ) {
          throw error;
        }

        // If not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Check if error is network-related
   */
  isNetworkError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    return (
      errorMessage.includes('network') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('timeout') ||
      errorCode === 'NETWORK_ERROR' ||
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      error?.response?.status === 0 ||
      error?.response?.status >= 500
    );
  }

  /**
   * Get user-friendly error message for network errors
   */
  getNetworkErrorMessage(error: any): string {
    if (!this.isNetworkError(error)) {
      return error?.message || 'An error occurred';
    }

    if (error?.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (error?.message?.includes('ECONNREFUSED')) {
      return 'Cannot connect to server. Please check your connection.';
    }

    if (error?.response?.status === 0) {
      return 'No internet connection. Please check your network settings.';
    }

    return 'Network error. Please check your connection and try again.';
  }
}

export const networkManager = new NetworkManager();

/**
 * Hook for network-aware operations
 */
export const useNetworkCheck = () => {
  const checkConnection = async (
    options?: NetworkCheckOptions
  ): Promise<NetworkCheckResult> => {
    return networkManager.checkConnection(options);
  };

  const executeWithRetry = async <T>(
    fn: () => Promise<T>,
    options?: NetworkCheckOptions
  ): Promise<T> => {
    return networkManager.executeWithRetry(fn, options);
  };

  const isNetworkError = (error: any): boolean => {
    return networkManager.isNetworkError(error);
  };

  const getNetworkErrorMessage = (error: any): string => {
    return networkManager.getNetworkErrorMessage(error);
  };

  return {
    checkConnection,
    executeWithRetry,
    isNetworkError,
    getNetworkErrorMessage,
  };
};

