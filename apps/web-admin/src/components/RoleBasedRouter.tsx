import React from 'react';
import { Navigate } from 'react-router-dom';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import MemberQRPage from '../pages/Dashboard/MemberQRPage';
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
      return <Navigate to='/trainerdashboard/homepage' replace />;
    case 'MEMBER':
      return <MemberQRPage />;
    default:
      return <Navigate to='/auth' replace />;
  }
};

export default RoleBasedRouter;
