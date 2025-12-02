import { analytics } from '@/utils/analytics';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track screen views automatically
 */
export const useAnalytics = (screenName: string, properties?: Record<string, any>) => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      analytics.setUserId(user.id);
    }
    analytics.trackScreenView(screenName, properties);
  }, [screenName, user?.id]);
};

/**
 * Hook to get analytics functions
 */
export const useAnalyticsActions = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      analytics.setUserId(user.id);
    }
  }, [user?.id]);

  return {
    trackScreenView: analytics.trackScreenView.bind(analytics),
    trackButtonClick: analytics.trackButtonClick.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
  };
};

