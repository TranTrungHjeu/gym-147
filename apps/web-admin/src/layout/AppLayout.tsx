import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { socketService } from '../services/socket.service';
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

          // Setup schedule notification listeners for admin/super admin
          socket.on('schedule:new', (data: any) => {
            console.log('📢 schedule:new event received in AppLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('schedule:updated', { detail: data }));
            }
          });

          // Setup certification notification listeners for admin/super admin
          // Listen for certification:upload (new certification uploaded, needs review)
          socket.on('certification:upload', (data: any) => {
            console.log('📢 certification:upload event received in AppLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          // Also listen for certification:pending for backward compatibility
          socket.on('certification:pending', (data: any) => {
            console.log('📢 certification:pending event received in AppLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          socket.on('certification:verified', (data: any) => {
            console.log('📢 certification:verified event received in AppLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          socket.on('certification:rejected', (data: any) => {
            console.log('📢 certification:rejected event received in AppLayout:', data);
            // Refresh notifications if on notification page
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          socket.on('certification:deleted', (data: any) => {
            console.log('📢 certification:deleted event received in AppLayout:', data);
            // Dispatch certification:deleted for optimistic updates
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:deleted', { detail: data }));
            }
            // Also dispatch notification:new for NotificationDropdown
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          // Listen for notification:new event (primary event for notifications)
          socket.on('notification:new', (data: any) => {
            console.log('📢 notification:new event received in AppLayout:', data);
            // Dispatch custom event for NotificationDropdown to handle
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          // Cleanup on unmount - only remove listeners, don't disconnect socket
          // Socket should stay connected as long as user is logged in
          return () => {
            socket.off('schedule:new');
            socket.off('certification:upload');
            socket.off('certification:pending');
            socket.off('certification:verified');
            socket.off('certification:rejected');
            socket.off('certification:deleted');
            socket.off('notification:new');
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

export default AppLayout;
