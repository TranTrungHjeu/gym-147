import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { PageLoading } from '../components/ui/AppLoading';

interface NavigationContextType {
  isNavigating: boolean;
  setIsNavigating: (loading: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const setNavigationLoading = useCallback(
    (loading: boolean) => {
      clearFallbackTimer();
      setIsNavigating(loading);

      if (loading) {
        fallbackTimerRef.current = setTimeout(() => {
          setIsNavigating(false);
          fallbackTimerRef.current = null;
        }, 2500);
      }
    },
    [clearFallbackTimer]
  );

  useEffect(() => {
    setNavigationLoading(true);

    const timer = setTimeout(() => {
      setNavigationLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search, location.hash, setNavigationLoading]);

  useEffect(() => {
    return () => {
      clearFallbackTimer();
    };
  }, [clearFallbackTimer]);

  return (
    <NavigationContext.Provider value={{ isNavigating, setIsNavigating: setNavigationLoading }}>
      {isNavigating && <PageLoading />}
      {children}
    </NavigationContext.Provider>
  );
};
