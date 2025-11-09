import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { socketService } from '../services/socket.service';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';
import TrainerSidebar from './TrainerSidebar';

interface LayoutContentProps {
  children: React.ReactNode;
}

const LayoutContent: React.FC<LayoutContentProps> = ({ children }) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className='min-h-screen xl:flex overflow-x-hidden w-full'>
      <div>
        <TrainerSidebar />
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

interface TrainerLayoutProps {
  children: React.ReactNode;
}

const TrainerLayout: React.FC<TrainerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (!isLoggedIn) {
      navigate('/auth');
      return;
    }

    // Get user ID and connect socket for real-time notifications
    const userDataStr = localStorage.getItem('userData') || localStorage.getItem('user');
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        const userId = userData.id || userData.userId;

        if (userId) {
          // Connect socket and subscribe to user notifications
          const socket = socketService.connect(userId);

          // Setup booking notification listeners
          // Note: Toast notifications are disabled - notifications will be shown in dropdown only
          socket.on('booking:new', (data: any) => {
            // Refresh schedule if on schedule page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('booking:updated', { detail: data }));
            }
          });

          socket.on('booking:pending_payment', (data: any) => {
            // Just refresh notifications, no toast
          });

          socket.on('booking:confirmed', (data: any) => {
            // Refresh schedule if on schedule page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('booking:updated', { detail: data }));
            }
          });

          // Setup certification status notification listener for trainer
          socket.on('certification:status', (data: any) => {
            console.log('📢 certification:status event received in TrainerLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          // Cleanup on unmount - only remove listeners, don't disconnect socket
          // Socket should stay connected as long as user is logged in
          return () => {
            socket.off('booking:new');
            socket.off('booking:pending_payment');
            socket.off('booking:confirmed');
            socket.off('certification:status');
            // Don't disconnect here - socket is shared across components
          };
        }
      } catch (err) {
        console.error('Error parsing user data for socket:', err);
      }
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
};

export default TrainerLayout;
