import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import Backdrop from './Backdrop';

interface LayoutContentProps {
  children?: React.ReactNode;
}

const LayoutContent: React.FC<LayoutContentProps> = ({ children }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className='min-h-screen xl:flex overflow-x-hidden w-full'>
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out overflow-x-hidden ${
          isExpanded || isHovered ? 'lg:ml-[280px]' : 'lg:ml-[80px]'
        } ${isMobileOpen ? 'ml-0' : ''} w-full`}
      >
        <AppHeader />
        <div className='p-4 mx-auto max-w-full md:p-6 w-full'>{children}</div>
      </div>
    </div>
  );
};

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn) {
      navigate('/auth');
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

export default AppLayout;
