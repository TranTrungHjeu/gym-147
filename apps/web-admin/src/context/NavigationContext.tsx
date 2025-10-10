import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    // Show loading when route changes
    setIsNavigating(true);

    // Hide loading after a short delay for smooth transition
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 1000); // 1s for professional feel - matches PageLoading duration

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <NavigationContext.Provider value={{ isNavigating, setIsNavigating }}>
      {isNavigating && <PageLoading />}
      {children}
    </NavigationContext.Provider>
  );
};
