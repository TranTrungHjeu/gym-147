import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthState, getDashboardPath } from '../../utils/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const authState = getAuthState();

  // If not authenticated, show auth page
  if (!authState.isAuthenticated) {
    return <>{children}</>;
  }

  // User is authenticated, redirect to appropriate dashboard
  const dashboardPath = getDashboardPath(authState.user?.role);

  return <Navigate to={dashboardPath} replace />;
};

export default AuthGuard;
