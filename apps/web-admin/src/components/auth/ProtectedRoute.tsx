import React from 'react';
import { Navigate } from 'react-router-dom';
import { getAuthState, hasRole } from '../../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallbackPath = '/auth',
}) => {
  const authState = getAuthState();

  // If not authenticated, redirect to login
  if (!authState.isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // If no role requirement, just check authentication
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check role permissions
  if (!hasRole(requiredRole)) {
    // Redirect to unauthorized page
    return <Navigate to='/unauthorized' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
