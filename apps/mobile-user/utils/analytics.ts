/**
 * Analytics utility for tracking user behavior and events
 * Privacy-compliant implementation
 */

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
};

class Analytics {
  private enabled: boolean = true;
  private userId: string | null = null;

  /**
   * Initialize analytics
   */
  init(userId?: string) {
    this.userId = userId || null;
    this.enabled = __DEV__ ? false : true; // Disable in development by default
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;
    
    this.trackEvent({
      name: 'screen_view',
      properties: {
        screen_name: screenName,
        ...properties,
      },
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, screenName?: string, properties?: Record<string, any>) {
    if (!this.enabled) return;
    
    this.trackEvent({
      name: 'button_click',
      properties: {
        button_name: buttonName,
        screen_name: screenName,
        ...properties,
      },
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, properties?: Record<string, any>) {
    if (!this.enabled) return;
    
    this.trackEvent({
      name: 'feature_usage',
      properties: {
        feature_name: featureName,
        ...properties,
      },
    });
  }

  /**
   * Track error
   */
  trackError(errorName: string, errorMessage: string, properties?: Record<string, any>) {
    if (!this.enabled) return;
    
    this.trackEvent({
      name: 'error',
      properties: {
        error_name: errorName,
        error_message: errorMessage,
        ...properties,
      },
    });
  }

  /**
   * Track custom event
   */
  trackEvent(event: AnalyticsEvent) {
    if (!this.enabled) return;

    const eventData = {
      ...event,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      platform: 'mobile',
    };

    // In production, send to analytics service
    // For now, log in development
    if (__DEV__) {
      console.log('[ANALYTICS]', eventData);
    }

    // TODO: Integrate with analytics service (Firebase Analytics, Mixpanel, etc.)
    // Example:
    // if (this.analyticsService) {
    //   this.analyticsService.track(eventData.name, eventData.properties);
    // }
  }

  /**
   * Set user ID
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Clear user ID
   */
  clearUserId() {
    this.userId = null;
  }

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const analytics = new Analytics();

