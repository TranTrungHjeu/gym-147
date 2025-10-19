declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL: string;
    EXPO_PUBLIC_APP_NAME: string;
    EXPO_PUBLIC_APP_VERSION: string;
    EXPO_PUBLIC_ENVIRONMENT: 'development' | 'staging' | 'production';
    EXPO_PUBLIC_GOOGLE_CLIENT_ID?: string;
    EXPO_PUBLIC_FACEBOOK_APP_ID?: string;
  }
}
