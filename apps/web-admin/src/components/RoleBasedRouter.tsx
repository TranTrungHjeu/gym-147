import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import MemberIntroPage from '../pages/Dashboard/MemberIntroPage';
import SuperAdminDashboard from '../pages/Dashboard/SuperAdminDashboard';

interface RoleBasedRouterProps {
  userRole: string;
}

const RoleBasedRouter: React.FC<RoleBasedRouterProps> = ({ userRole }) => {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'TRAINER':
      return <Navigate to='/trainer-dashboard' replace />;
    case 'MEMBER':
      return <MemberIntroPage />;
    default:
      return <Navigate to='/auth' replace />;
  }
};

export default RoleBasedRouter;
