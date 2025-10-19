import { APP_CONFIG } from '@/config/environment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface UseCacheOptions {
  key: string;
  expiry?: number; // in milliseconds
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: (data: T) => Promise<void>;
  clear: () => Promise<void>;
  isExpired: boolean;
}

/**
 * Custom hook for caching data with expiration
 */
export function useCache<T>(
  options: UseCacheOptions,
  fetchFunction?: () => Promise<T>
): UseCacheReturn<T> {
  const {
    key,
    expiry = APP_CONFIG.CACHE_DURATION.WORKOUTS,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000,
  } = options;

  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
    isExpired: boolean;
  }>({
    data: null,
    loading: false,
    error: null,
    isExpired: false,
  });

  const getCacheKey = useCallback(() => {
    return `@gym147_cache_${key}`;
  }, [key]);

  const isExpired = useCallback(
    (timestamp: number): boolean => {
      return Date.now() - timestamp > expiry;
    },
    [expiry]
  );

  const loadFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const cacheKey = getCacheKey();
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const cacheItem: CacheItem<T> = JSON.parse(cachedData);

        if (!isExpired(cacheItem.timestamp)) {
          return cacheItem.data;
        } else {
          // Cache expired, remove it
          await AsyncStorage.removeItem(cacheKey);
        }
      }

      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  }, [getCacheKey, isExpired]);

  const saveToCache = useCallback(
    async (data: T): Promise<void> => {
      try {
        const cacheKey = getCacheKey();
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          expiry,
        };

        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (error) {
        console.error('Error saving to cache:', error);
      }
    },
    [getCacheKey, expiry]
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!fetchFunction) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFunction();
      await saveToCache(data);

      setState({
        data,
        loading: false,
        error: null,
        isExpired: false,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to refresh data',
      }));
    }
  }, [fetchFunction, saveToCache]);

  const setData = useCallback(
    async (data: T): Promise<void> => {
      await saveToCache(data);
      setState((prev) => ({
        ...prev,
        data,
        isExpired: false,
      }));
    },
    [saveToCache]
  );

  const clear = useCallback(async (): Promise<void> => {
    try {
      const cacheKey = getCacheKey();
      await AsyncStorage.removeItem(cacheKey);

      setState({
        data: null,
        loading: false,
        error: null,
        isExpired: false,
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [getCacheKey]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setState((prev) => ({ ...prev, loading: true }));

      try {
        // Try to load from cache first
        const cachedData = await loadFromCache();

        if (cachedData) {
          setState({
            data: cachedData,
            loading: false,
            error: null,
            isExpired: false,
          });
        } else if (fetchFunction) {
          // If no cache and fetch function provided, fetch data
          await refresh();
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error: any) {
        setState({
          data: null,
          loading: false,
          error: error.message || 'Failed to load data',
          isExpired: false,
        });
      }
    };

    loadData();
  }, [loadFromCache, fetchFunction, refresh]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      if (fetchFunction) {
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchFunction, refresh]);

  return {
    ...state,
    refresh,
    setData,
    clear,
  };
}

/**
 * Hook for managing multiple cache items
 */
export function useMultipleCache<T>(
  keys: string[],
  fetchFunctions?: Array<() => Promise<T>>,
  expiry?: number
) {
  const [state, setState] = useState<{
    data: (T | null)[];
    loading: boolean;
    errors: string[];
    isExpired: boolean[];
  }>({
    data: [],
    loading: false,
    errors: [],
    isExpired: [],
  });

  const loadAll = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, errors: [] }));

    try {
      const promises = keys.map(async (key, index) => {
        const cacheKey = `@gym147_cache_${key}`;

        try {
          const cachedData = await AsyncStorage.getItem(cacheKey);

          if (cachedData) {
            const cacheItem: CacheItem<T> = JSON.parse(cachedData);
            const isExpired =
              Date.now() - cacheItem.timestamp >
              (expiry || APP_CONFIG.CACHE_DURATION.WORKOUTS);

            if (!isExpired) {
              return { data: cacheItem.data, error: null, isExpired: false };
            } else {
              await AsyncStorage.removeItem(cacheKey);
            }
          }

          // If no cache or expired, try to fetch
          if (fetchFunctions && fetchFunctions[index]) {
            const data = await fetchFunctions[index]();
            const cacheItem: CacheItem<T> = {
              data,
              timestamp: Date.now(),
              expiry: expiry || APP_CONFIG.CACHE_DURATION.WORKOUTS,
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            return { data, error: null, isExpired: false };
          }

          return { data: null, error: null, isExpired: true };
        } catch (error: any) {
          return { data: null, error: error.message, isExpired: false };
        }
      });

      const results = await Promise.all(promises);

      setState({
        data: results.map((r) => r.data),
        loading: false,
        errors: results.map((r) => r.error).filter(Boolean),
        isExpired: results.map((r) => r.isExpired),
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        errors: [error.message || 'Failed to load data'],
      }));
    }
  }, [keys, fetchFunctions, expiry]);

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      const promises = keys.map((key) => {
        const cacheKey = `@gym147_cache_${key}`;
        return AsyncStorage.removeItem(cacheKey);
      });

      await Promise.all(promises);

      setState({
        data: [],
        loading: false,
        errors: [],
        isExpired: [],
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }, [keys]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    ...state,
    refresh: loadAll,
    clear: clearAll,
  };
}

/**
 * Hook for managing cache with optimistic updates
 */
export function useOptimisticCache<T>(
  options: UseCacheOptions,
  fetchFunction?: () => Promise<T>,
  updateFunction?: (data: T) => Promise<T>
) {
  const cache = useCache(options, fetchFunction);
  const [optimisticData, setOptimisticData] = useState<T | null>(null);

  const optimisticUpdate = useCallback(
    async (newData: T): Promise<void> => {
      if (!updateFunction) return;

      // Set optimistic data immediately
      setOptimisticData(newData);
      cache.setData(newData);

      try {
        // Update on server
        const updatedData = await updateFunction(newData);

        // Update cache with server response
        await cache.setData(updatedData);
        setOptimisticData(null);
      } catch (error) {
        // Revert optimistic update on error
        setOptimisticData(null);
        await cache.refresh();
        throw error;
      }
    },
    [updateFunction, cache]
  );

  return {
    ...cache,
    data: optimisticData || cache.data,
    optimisticUpdate,
  };
}



