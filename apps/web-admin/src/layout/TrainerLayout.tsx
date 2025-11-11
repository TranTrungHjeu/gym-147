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
          // Listen for certification:pending (when trainer uploads certification, status is PENDING)
          socket.on('certification:pending', (data: any) => {
            console.log('📢 certification:pending event received in TrainerLayout:', data);
            // Dispatch certification:updated for page refreshes
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
            // If data contains notification_id, also dispatch notification:new for NotificationDropdown
            if (data?.notification_id && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          // Listen for certification:upload (when trainer uploads certification)
          socket.on('certification:upload', (data: any) => {
            console.log('📢 certification:upload event received in TrainerLayout:', data);
            // Dispatch certification:updated for page refreshes
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
            // If data contains notification_id, also dispatch notification:new for NotificationDropdown
            if (data?.notification_id && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          // Listen for notification:new (general notification event)
          // This is the PRIMARY event - backend emits this for all notifications
          socket.on('notification:new', (data: any) => {
            console.log(
              '📢 notification:new event received in TrainerLayout:',
              JSON.stringify(data, null, 2)
            );
            // Dispatch notification:new custom event for NotificationDropdown to handle
            if (window.dispatchEvent && data) {
              console.log(
                '📢 [TrainerLayout] Dispatching notification:new custom event (from socket notification:new event)'
              );
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
            // Also dispatch certification:updated for backward compatibility (if it's a certification notification)
            if (
              window.dispatchEvent &&
              data &&
              (data.type?.includes('CERTIFICATION') || data.data?.certification_id)
            ) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
          });

          socket.on('certification:status', (data: any) => {
            console.log('📢 certification:status event received in TrainerLayout:', data);
            // Dispatch certification:updated for page refreshes
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
            // If data contains notification_id, also dispatch notification:new for NotificationDropdown
            if (data?.notification_id && window.dispatchEvent) {
              console.log(
                '📢 [TrainerLayout] Dispatching notification:new custom event for certification:status'
              );
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          socket.on('certification:verified', (data: any) => {
            console.log(
              '📢 certification:verified event received in TrainerLayout:',
              JSON.stringify(data, null, 2)
            );
            // Dispatch certification:updated for page refreshes
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
            // ALWAYS dispatch notification:new if data exists (notification_id might be in data.data or data.certification)
            // Backend emits notification:new event separately, but we also dispatch custom event as fallback
            if (data && window.dispatchEvent) {
              console.log(
                '📢 [TrainerLayout] Dispatching notification:new custom event for certification:verified'
              );
              console.log(
                '📢 [TrainerLayout] Data contains notification_id:',
                !!data?.notification_id,
                'notification_id:',
                data?.notification_id
              );
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          socket.on('certification:rejected', (data: any) => {
            console.log(
              '📢 certification:rejected event received in TrainerLayout:',
              JSON.stringify(data, null, 2)
            );
            // Dispatch certification:updated for page refreshes
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('certification:updated', { detail: data }));
            }
            // ALWAYS dispatch notification:new if data exists (notification_id might be in data.data or data.certification)
            // Backend emits notification:new event separately, but we also dispatch custom event as fallback
            if (data && window.dispatchEvent) {
              console.log(
                '📢 [TrainerLayout] Dispatching notification:new custom event for certification:rejected'
              );
              console.log(
                '📢 [TrainerLayout] Data contains notification_id:',
                !!data?.notification_id,
                'notification_id:',
                data?.notification_id
              );
              window.dispatchEvent(new CustomEvent('notification:new', { detail: data }));
            }
          });

          // Cleanup on unmount - only remove listeners, don't disconnect socket
          // Socket should stay connected as long as user is logged in
          return () => {
            socket.off('booking:new');
            socket.off('booking:pending_payment');
            socket.off('booking:confirmed');
            socket.off('certification:pending');
            socket.off('certification:upload');
            socket.off('notification:new');
            socket.off('certification:status');
            socket.off('certification:verified');
            socket.off('certification:rejected');
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
