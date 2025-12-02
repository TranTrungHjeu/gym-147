import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountDeletedModal from '../components/auth/AccountDeletedModal';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { authService } from '../services/auth.service';
import { eventManager } from '../services/event-manager.service';
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
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  // Listen for user:deleted event
  useEffect(() => {
    const handleUserDeleted = (data: any) => {
      console.log('🚨 User account deleted event received in AppLayout:', data);
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
          const {
            schedule: scheduleSocket,
            member: memberSocket,
            identity: identitySocket,
          } = socketService.connect(userId);

          // Setup schedule notification listeners for admin/super admin
          scheduleSocket.on('schedule:new', (data: any) => {
            console.log('[NOTIFY] schedule:new event received in AppLayout:', data);
            eventManager.dispatch('schedule:new', data);
            eventManager.dispatch('schedule:updated', data);
          });

          scheduleSocket.on('schedule:updated', (data: any) => {
            console.log('[NOTIFY] schedule:updated event received in AppLayout:', data);
            eventManager.dispatch('schedule:updated', data);
          });

          scheduleSocket.on('schedule:deleted', (data: any) => {
            console.log('[NOTIFY] schedule:deleted event received in AppLayout:', data);
            eventManager.dispatch('schedule:deleted', data);
          });

          // Setup certification notification listeners for admin/super admin
          scheduleSocket.on('certification:upload', (data: any) => {
            console.log('[NOTIFY] certification:upload event received in AppLayout:', data);
            console.log(
              '[NOTIFY] [APPLAYOUT] verification_status:',
              data?.verification_status || data?.data?.verification_status || 'NOT FOUND'
            );

            // Also dispatch as certification:created for compatibility with TrainerManagement
            // Ensure verification_status is included in the event detail
            const eventData = {
              ...data,
              verification_status:
                data?.verification_status || data?.data?.verification_status || 'PENDING',
              status: data?.verification_status || data?.data?.verification_status || 'PENDING',
            };

            const customEvent = new CustomEvent('certification:created', {
              detail: eventData,
              bubbles: true,
              cancelable: true,
            });

            const dispatchedWindow = window.dispatchEvent(customEvent);
            const dispatchedDocument = document.dispatchEvent(
              new CustomEvent('certification:created', {
                detail: eventData,
                bubbles: true,
                cancelable: true,
              })
            );

            console.log('[SUCCESS] [APPLAYOUT] [STAR] Dispatched certification:created event:', {
              verification_status: eventData.verification_status,
              trainer_id: eventData.trainer_id || eventData.data?.trainer_id,
              certification_id: eventData.certification_id || eventData.data?.certification_id,
              dispatched_window: dispatchedWindow,
              dispatched_document: dispatchedDocument,
            });

            eventManager.dispatch('certification:upload', data);
            eventManager.dispatch('certification:created', eventData);
            eventManager.dispatch('certification:updated', data);
          });

          scheduleSocket.on('certification:pending', (data: any) => {
            console.log('[NOTIFY] certification:pending event received in AppLayout:', data);
            console.log(
              '[NOTIFY] [APPLAYOUT] verification_status:',
              data?.verification_status || data?.data?.verification_status || 'PENDING'
            );

            // Dispatch as certification:created for compatibility with TrainerManagement
            // This event is specifically for PENDING certifications that need admin approval
            const eventData = {
              ...data,
              verification_status: 'PENDING',
              status: 'PENDING',
            };

            const customEvent = new CustomEvent('certification:created', {
              detail: eventData,
              bubbles: true,
              cancelable: true,
            });

            const dispatchedWindow = window.dispatchEvent(customEvent);
            const dispatchedDocument = document.dispatchEvent(
              new CustomEvent('certification:created', {
                detail: eventData,
                bubbles: true,
                cancelable: true,
              })
            );

            console.log(
              '[SUCCESS] [APPLAYOUT] [STAR] Dispatched certification:created from certification:pending:',
              {
                verification_status: eventData.verification_status,
                trainer_id: eventData.trainer_id || eventData.data?.trainer_id,
                certification_id: eventData.certification_id || eventData.data?.certification_id,
                dispatched_window: dispatchedWindow,
                dispatched_document: dispatchedDocument,
              }
            );

            eventManager.dispatch('certification:pending', data);
            eventManager.dispatch('certification:created', eventData);
            eventManager.dispatch('certification:updated', data);
          });

          scheduleSocket.on('certification:created', (data: any) => {
            console.log('[NOTIFY] [STAR] certification:created event received in AppLayout:', data);
            // Dispatch as both window event and eventManager event for compatibility
            const customEvent = new CustomEvent('certification:created', {
              detail: data,
              bubbles: true,
              cancelable: true,
            });
            window.dispatchEvent(customEvent);
            document.dispatchEvent(customEvent);
            eventManager.dispatch('certification:created', data);
            eventManager.dispatch('certification:upload', data);
            eventManager.dispatch('certification:updated', data);
            if (data?.notification_id) {
              eventManager.dispatch('notification:new', data);
            }
          });

          scheduleSocket.on('certification:verified', (data: any) => {
            console.log('[NOTIFY] certification:verified event received in AppLayout:', data);
            eventManager.dispatch('certification:verified', data);
            eventManager.dispatch('certification:updated', data);
          });

          scheduleSocket.on('certification:rejected', (data: any) => {
            console.log('[NOTIFY] certification:rejected event received in AppLayout:', data);
            eventManager.dispatch('certification:rejected', data);
            eventManager.dispatch('certification:updated', data);
          });

          scheduleSocket.on('certification:deleted', (data: any) => {
            console.log('[NOTIFY] certification:deleted event received in AppLayout:', data);
            eventManager.dispatch('certification:deleted', data);
            eventManager.dispatch('notification:new', data);
          });

          // Setup subscription notification listeners for admin/super admin
          scheduleSocket.on('subscription:payment:success', (data: any) => {
            console.log('[NOTIFY] subscription:payment:success event received in AppLayout:', data);
            eventManager.dispatch('subscription:payment:success', data);
            eventManager.dispatch('notification:new', data);
          });

          scheduleSocket.on('subscription:renewal', (data: any) => {
            console.log('[NOTIFY] subscription:renewal event received in AppLayout:', data);
            eventManager.dispatch('subscription:renewal', data);
            eventManager.dispatch('notification:new', data);
          });

          scheduleSocket.on('subscription:upgrade', (data: any) => {
            console.log('[NOTIFY] subscription:upgrade event received in AppLayout:', data);
            eventManager.dispatch('subscription:upgrade', data);
            eventManager.dispatch('notification:new', data);
          });

          scheduleSocket.on('certification:status', (data: any) => {
            console.log('[NOTIFY] certification:status event received in AppLayout:', data);
            eventManager.dispatch('certification:status', data);
            eventManager.dispatch('certification:updated', data);
          });

          // Listen for notification:new event (primary event for notifications)
          scheduleSocket.on('notification:new', (data: any) => {
            console.log('[NOTIFY] notification:new event received in AppLayout:', data);
            eventManager.dispatch('notification:new', data);
          });

          // Setup trainer event listeners
          scheduleSocket.on('trainer:created', (data: any) => {
            console.log('[NOTIFY] trainer:created event received in AppLayout:', data);
            eventManager.dispatch('trainer:created', data);
          });

          scheduleSocket.on('trainer:updated', (data: any) => {
            console.log('[NOTIFY] trainer:updated event received in AppLayout:', data);
            eventManager.dispatch('trainer:updated', data);
          });

          scheduleSocket.on('trainer:deleted', (data: any) => {
            console.log('[NOTIFY] trainer:deleted event received in AppLayout:', data);
            eventManager.dispatch('trainer:deleted', data);
          });

          // Setup member event listeners if member socket is available
          if (memberSocket) {
            memberSocket.on('member:created', (data: any) => {
              console.log('[NOTIFY] member:created event received in AppLayout:', data);
              eventManager.dispatch('member:created', data);
            });

            memberSocket.on('member:updated', (data: any) => {
              console.log('[NOTIFY] member:updated event received in AppLayout:', data);
              eventManager.dispatch('member:updated', data);
            });

            memberSocket.on('member:deleted', (data: any) => {
              console.log('[NOTIFY] member:deleted event received in AppLayout:', data);
              eventManager.dispatch('member:deleted', data);
            });

            memberSocket.on('member:status_changed', (data: any) => {
              console.log('[NOTIFY] member:status_changed event received in AppLayout:', data);
              eventManager.dispatch('member:status_changed', data);
            });

            memberSocket.on('member:registration_completed', (data: any) => {
              console.log('[NOTIFY] member:registration_completed event received in AppLayout:', data);
              eventManager.dispatch('member:registration_completed', data);
            });

            // Listen for reward redemption events
            memberSocket.on('reward:redemption:new', (data: any) => {
              console.log('[GIFT] reward:redemption:new event received in AppLayout:', data);
              eventManager.dispatch('reward:redemption:new', data);
              eventManager.dispatch('notification:new', {
                type: 'REWARD_REDEMPTION',
                title: 'New Reward Redemption',
                message: `${data.member_name} redeemed ${data.reward_title} for ${data.points_spent} points`,
                data,
              });
            });

            // Listen for user:deleted event (account deletion) from member service
            memberSocket.on('user:deleted', (data: any) => {
              console.log('🚨 user:deleted event received from member service in AppLayout:', data);
              // Check if this is the current user
              if (data.user_id === userId || data.id === userId) {
                // Show modal and logout
                eventManager.dispatch('user:deleted', data);
              }
            });
          }

          // Listen for user:deleted event from identity service
          if (identitySocket) {
            identitySocket.on('user:deleted', (data: any) => {
              console.log(
                '🚨 user:deleted event received from identity service in AppLayout:',
                data
              );
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
            scheduleSocket.off('schedule:new');
            scheduleSocket.off('schedule:updated');
            scheduleSocket.off('schedule:deleted');
            scheduleSocket.off('certification:upload');
            scheduleSocket.off('certification:pending');
            scheduleSocket.off('certification:created');
            scheduleSocket.off('certification:verified');
            scheduleSocket.off('certification:rejected');
            scheduleSocket.off('certification:deleted');
            scheduleSocket.off('certification:status');
            scheduleSocket.off('subscription:payment:success');
            scheduleSocket.off('subscription:renewal');
            scheduleSocket.off('subscription:upgrade');
            scheduleSocket.off('notification:new');

            if (memberSocket) {
              memberSocket.off('member:created');
              memberSocket.off('member:updated');
              memberSocket.off('member:deleted');
              memberSocket.off('member:status_changed');
              memberSocket.off('member:registration_completed');
              memberSocket.off('reward:redemption:new');
              memberSocket.off('user:deleted');
            }
            if (identitySocket) {
              identitySocket.off('user:deleted');
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

export default AppLayout;
