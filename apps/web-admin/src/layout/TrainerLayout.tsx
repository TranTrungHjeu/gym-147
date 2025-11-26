import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { socketService } from '../services/socket.service';
import { eventManager } from '../services/event-manager.service';
import AppHeader from './AppHeader';
import Backdrop from './Backdrop';
import TrainerSidebar from './TrainerSidebar';
import AccountDeletedModal from '../components/auth/AccountDeletedModal';
import { authService } from '../services/auth.service';

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
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  // Listen for user:deleted event
  useEffect(() => {
    const handleUserDeleted = (data: any) => {
      console.log('🚨 User account deleted event received in TrainerLayout:', data);
      setShowDeletedModal(true);
    };

    const subscriptionId = eventManager.subscribe('user:deleted', handleUserDeleted);
    return () => {
      eventManager.unsubscribe(subscriptionId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userData');
      localStorage.removeItem('isLoggedIn');
      setShowDeletedModal(false);
      navigate('/auth');
    }
  };

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
          // Connect sockets (schedule + member + identity services)
          const { schedule: scheduleSocket, member: memberSocket, identity: identitySocket } = socketService.connect(userId);

          // Setup booking notification listeners with optimistic updates
          scheduleSocket.on('booking:new', (data: any) => {
            console.log('📢 booking:new event received in TrainerLayout:', data);
            eventManager.dispatch('booking:new', data);
            eventManager.dispatch('booking:updated', data);
            // Show subtle toast notification
            if (window.showToast && data.member_name && data.class_name) {
              window.showToast({
                type: 'info',
                message: `${data.member_name} đã đặt lớp ${data.class_name}`,
                duration: 3000,
              });
            }
          });

          scheduleSocket.on('booking:pending_payment', (data: any) => {
            // Just refresh notifications, no toast
            eventManager.dispatch('booking:updated', data);
          });

          scheduleSocket.on('booking:confirmed', (data: any) => {
            console.log('📢 booking:confirmed event received in TrainerLayout:', data);
            eventManager.dispatch('booking:confirmed', data);
            eventManager.dispatch('booking:updated', data);
            eventManager.dispatch('booking:status_changed', data);
            // Show success toast notification
            if (window.showToast && data.member_name && data.class_name) {
              window.showToast({
                type: 'success',
                message: `${data.member_name} đã thanh toán cho lớp ${data.class_name}`,
                duration: 3000,
              });
            }
          });

          scheduleSocket.on('booking:cancelled', (data: any) => {
            console.log('📢 booking:cancelled event received in TrainerLayout:', data);
            eventManager.dispatch('booking:cancelled', data);
            eventManager.dispatch('booking:updated', data);
            eventManager.dispatch('booking:status_changed', data);
            // Show info toast notification
            if (window.showToast && data.member_name && data.class_name) {
              window.showToast({
                type: 'warning',
                message: `${data.member_name} đã hủy đặt lớp ${data.class_name}`,
                duration: 3000,
              });
            }
          });

          scheduleSocket.on('member:checked_in', (data: any) => {
            console.log('📢 member:checked_in event received in TrainerLayout:', data);
            eventManager.dispatch('member:checked_in', data);
            // Show success toast notification
            if (window.showToast && data.data?.member_name && data.data?.class_name) {
              window.showToast({
                type: 'success',
                message: `${data.data.member_name} đã check-in vào lớp ${data.data.class_name}`,
                duration: 3000,
              });
            }
          });

          // Setup certification status notification listener for trainer
          scheduleSocket.on('certification:pending', (data: any) => {
            console.log('📢 certification:pending event received in TrainerLayout:', data);
            eventManager.dispatch('certification:pending', data);
            eventManager.dispatch('certification:updated', data);
            if (data?.notification_id) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:upload', (data: any) => {
            console.log('📢 certification:upload event received in TrainerLayout:', data);
            eventManager.dispatch('certification:upload', data);
            eventManager.dispatch('certification:updated', data);
            if (data?.notification_id) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:created', (data: any) => {
            console.log('📢 certification:created event received in TrainerLayout:', data);
            eventManager.dispatch('certification:created', data);
            eventManager.dispatch('certification:upload', data);
            eventManager.dispatch('certification:updated', data);
            if (data?.notification_id) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('notification:new', (data: any) => {
            console.log('📢 notification:new event received in TrainerLayout:', JSON.stringify(data, null, 2));
            eventManager.dispatch('notification:new', data);
            if (data && (data.type?.includes('CERTIFICATION') || data.data?.certification_id)) {
              eventManager.dispatch('certification:updated', data);
            }
          });

          scheduleSocket.on('certification:status', (data: any) => {
            console.log('📢 certification:status event received in TrainerLayout:', data);
            eventManager.dispatch('certification:status', data);
            eventManager.dispatch('certification:updated', data);
            if (data?.notification_id) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:verified', (data: any) => {
            console.log('📢 certification:verified event received in TrainerLayout:', JSON.stringify(data, null, 2));
            eventManager.dispatch('certification:verified', data);
            eventManager.dispatch('certification:updated', data);
            if (data) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:rejected', (data: any) => {
            console.log('📢 certification:rejected event received in TrainerLayout:', JSON.stringify(data, null, 2));
            eventManager.dispatch('certification:rejected', data);
            eventManager.dispatch('certification:updated', data);
            if (data) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:deleted', (data: any) => {
            console.log('📢 certification:deleted event received in TrainerLayout:', JSON.stringify(data, null, 2));
            eventManager.dispatch('certification:deleted', data);
            if (data) {
              eventManager.dispatch('notification:new', data);
            }
            // Show warning toast notification
            if (window.showToast && data.certification_name) {
              window.showToast({
                type: 'warning',
                message: `Chứng chỉ "${data.certification_name}" đã bị xóa. Lý do: ${data.reason || 'Không có lý do'}`,
                duration: 5000,
              });
            }
          });

          // Listen for user:deleted event (account deletion) from identity service
          if (identitySocket) {
            identitySocket.on('user:deleted', (data: any) => {
              console.log('🚨 user:deleted event received in TrainerLayout:', data);
              // Check if this is the current user
              if (data.user_id === userId || data.id === userId) {
                // Show modal and logout
                eventManager.dispatch('user:deleted', data);
              }
            });
          }

          // Also listen from member service (member service also emits user:deleted when member is deleted)
          if (memberSocket) {
            memberSocket.on('user:deleted', (data: any) => {
              console.log('🚨 user:deleted event received from member service in TrainerLayout:', data);
              // Check if this is the current user
              if (data.user_id === userId || data.id === userId) {
                // Show modal and logout
                eventManager.dispatch('user:deleted', data);
              }
            });
          }

          // Cleanup on unmount - only remove listeners, don't disconnect socket
          // Socket should stay connected as long as user is logged in
          return () => {
            scheduleSocket.off('booking:new');
            scheduleSocket.off('booking:pending_payment');
            scheduleSocket.off('booking:confirmed');
            scheduleSocket.off('booking:cancelled');
            scheduleSocket.off('member:checked_in');
            scheduleSocket.off('certification:pending');
            scheduleSocket.off('certification:upload');
            scheduleSocket.off('notification:new');
            scheduleSocket.off('certification:status');
            scheduleSocket.off('certification:verified');
            scheduleSocket.off('certification:rejected');
            scheduleSocket.off('certification:deleted');
            if (identitySocket) {
              identitySocket.off('user:deleted');
            }
            if (memberSocket) {
              memberSocket.off('user:deleted');
            }
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
      <AccountDeletedModal
        isOpen={showDeletedModal}
        onClose={handleLogout}
        onLogout={handleLogout}
      />
    </SidebarProvider>
  );
};

export default TrainerLayout;
