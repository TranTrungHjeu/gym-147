import { ApiResponse } from '@/services/api';
import { useCallback, useState } from 'react';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Custom hook for handling API calls with loading and error states
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
      }));

      try {
        const response = await apiFunction(...args);

        if (response.success) {
          setState({
            data: response.data || null,
            loading: false,
            error: null,
            success: true,
          });
          return response.data || null;
        } else {
          const errorMessage = response.message || 'API call failed';
          setState({
            data: null,
            loading: false,
            error: errorMessage,
            success: false,
          });
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'An unexpected error occurred';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
          success: false,
        });
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    setLoading,
  };
}

/**
 * Hook for handling multiple API calls
 */
export function useMultipleApi<T = any>(
  apiFunctions: Array<(...args: any[]) => Promise<ApiResponse<T>>>
) {
  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    errors: string[];
    success: boolean;
  }>({
    data: [],
    loading: false,
    errors: [],
    success: false,
  });

  const executeAll = useCallback(
    async (...args: any[]): Promise<T[]> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        errors: [],
        success: false,
      }));

      try {
        const promises = apiFunctions.map((apiFunction) =>
          apiFunction(...args)
        );
        const responses = await Promise.allSettled(promises);

        const results: T[] = [];
        const errors: string[] = [];

        responses.forEach((response, index) => {
          if (response.status === 'fulfilled') {
            if (response.value.success && response.value.data) {
              results.push(response.value.data);
            } else {
              errors.push(
                response.value.message || `API call ${index + 1} failed`
              );
            }
          } else {
            errors.push(
              response.reason?.message || `API call ${index + 1} failed`
            );
          }
        });

        setState({
          data: results,
          loading: false,
          errors,
          success: errors.length === 0,
        });

        return results;
      } catch (error: any) {
        const errorMessage = error?.message || 'An unexpected error occurred';
        setState({
          data: [],
          loading: false,
          errors: [errorMessage],
          success: false,
        });
        throw error;
      }
    },
    [apiFunctions]
  );

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      errors: [],
      success: false,
    });
  }, []);

  return {
    ...state,
    executeAll,
    reset,
  };
}

/**
 * Hook for handling paginated API calls
 */
export function usePaginatedApi<T = any>(
  apiFunction: (
    params: any
  ) => Promise<
    ApiResponse<{ data: T[]; total: number; page: number; limit: number }>
  >
) {
  const [state, setState] = useState<{
    data: T[];
    loading: boolean;
    error: string | null;
    success: boolean;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>({
    data: [],
    loading: false,
    error: null,
    success: false,
    total: 0,
    page: 1,
    limit: 20,
    hasMore: false,
  });

  const loadPage = useCallback(
    async (params: any = {}, reset = false): Promise<T[]> => {
      const currentPage = reset ? 1 : state.page;
      const requestParams = {
        ...params,
        page: currentPage,
        limit: state.limit,
      };

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
      }));

      try {
        const response = await apiFunction(requestParams);

        if (response.success && response.data) {
          const { data, total, page, limit } = response.data;
          const newData = reset ? data : [...state.data, ...data];
          const hasMore = page * limit < total;

          setState({
            data: newData,
            loading: false,
            error: null,
            success: true,
            total,
            page: page + 1,
            limit,
            hasMore,
          });

          return data;
        } else {
          const errorMessage = response.message || 'API call failed';
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMessage,
            success: false,
          }));
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'An unexpected error occurred';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          success: false,
        }));
        throw error;
      }
    },
    [apiFunction, state.data, state.page, state.limit]
  );

  const loadMore = useCallback(
    (params: any = {}) => loadPage(params, false),
    [loadPage]
  );

  const refresh = useCallback(
    (params: any = {}) => loadPage(params, true),
    [loadPage]
  );

  const reset = useCallback(() => {
    setState({
      data: [],
      loading: false,
      error: null,
      success: false,
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    });
  }, []);

  return {
    ...state,
    loadPage,
    loadMore,
    refresh,
    reset,
  };
}



