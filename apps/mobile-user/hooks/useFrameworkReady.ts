import { useEffect } from 'react';
import { Platform } from 'react-native';

// Only declare Window interface for web
if (Platform.OS === 'web') {
  // @ts-ignore - window is only available on web
  if (typeof window !== 'undefined' && window.frameworkReady) {
    // @ts-ignore
    window.frameworkReady();
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Hook is empty for React Native, only runs on web during module load
  });
}
