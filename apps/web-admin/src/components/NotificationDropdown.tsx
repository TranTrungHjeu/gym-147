import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Notification, notificationService } from '../services/notification.service';
import { socketService } from '../services/socket.service';

interface NotificationDropdownProps {
  userId: string;
}

// Note: Debounced fetch functions are no longer needed
// We use optimistic updates from socket events instead

export default function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set()); // Track notifications being marked as read
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set()); // Track newly received notifications
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false); // Track if marking all as read
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add refs to track pending fetches and processed events
  const isFetchingRef = useRef(false);
  const processedEventsRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await notificationService.getUserNotifications(userId, 1, 10);
      if (response.success) {
        const notifications = response.data?.notifications || [];
        if (Array.isArray(notifications)) {
          setNotifications(notifications);
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await notificationService.getUnreadCount(userId);
      if (response.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  // Update document title when unread count changes
  useEffect(() => {
    const baseTitle = 'GYM 147';
    if (unreadCount > 0) {
      document.title = `${baseTitle} (${unreadCount})`;
    } else {
      document.title = baseTitle;
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount]);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    fetchUnreadCount();

    // Socket should already be connected by AppLayout/TrainerLayout
    // Just get the socket and setup listeners
    const setupSocketListeners = () => {
      console.log(
        `[SOCKET] [NOTIFICATION_DROPDOWN] Setting up socket listeners for userId: ${userId}`
      );

      // Get schedule, member, and identity sockets
      let scheduleSocket = socketService.getSocket('schedule');
      let memberSocket = socketService.getSocket('member');
      let identitySocket = socketService.getSocket('identity');

      if (!scheduleSocket) {
        // Connect if not already connected
        const { schedule, member, identity } = socketService.connect(userId);
        scheduleSocket = schedule;
        memberSocket = member;
        identitySocket = identity;
      } else {
        // Get identity socket if not already retrieved
        if (!identitySocket) {
          identitySocket = socketService.getSocket('identity');
        }
      }

      if (!scheduleSocket) {
        console.warn(
          `[WARNING] [NOTIFICATION_DROPDOWN] Schedule socket not available, retrying in 1s...`
        );
        setTimeout(setupSocketListeners, 1000);
        return null;
      }

      // Wait for schedule socket to connect
      if (!scheduleSocket.connected) {
        console.log(
          `[WAIT] [NOTIFICATION_DROPDOWN] Schedule socket not connected yet, waiting for connect event...`
        );
        if (scheduleSocket.once) {
          scheduleSocket.once('connect', () => {
            console.log(
              `[SUCCESS] [NOTIFICATION_DROPDOWN] Schedule socket connected, setting up listeners...`
            );
            setupSocketListeners();
          });
        } else {
          // Fallback: retry after delay
          setTimeout(setupSocketListeners, 1000);
        }
        return null;
      }

      console.log(
        `[SUCCESS] [NOTIFICATION_DROPDOWN] Schedule socket is connected: ${scheduleSocket.id}, User ID: ${userId}`
      );

      // Ensure we're subscribed to the user room FIRST, before setting up listeners
      if (userId) {
        console.log(`[SUBSCRIBE] [NOTIFICATION_DROPDOWN] Subscribing to user room: user:${userId}`);
        scheduleSocket.emit('subscribe:user', userId);

        // Also subscribe member socket if available
        if (memberSocket && memberSocket.connected) {
          memberSocket.emit('subscribe:user', userId);
          // Subscribe to admin room for admin notifications
          memberSocket.emit('subscribe:admin');
          console.log(
            `[SUBSCRIBE] [NOTIFICATION_DROPDOWN] Subscribed member socket to user and admin rooms`
          );
        }

        // Subscribe identity socket if available (for bulk notifications)
        if (identitySocket && identitySocket.connected) {
          identitySocket.emit('subscribe:user', userId);
          console.log(
            `[SUBSCRIBE] [NOTIFICATION_DROPDOWN] Subscribed identity socket to user room`
          );
        }
      }

      // Helper function to add notification optimistically (without fetching from server)
      const addNotificationOptimistically = (notificationData: any) => {
        console.log(
          `[SEARCH] [NOTIFICATION_DROPDOWN] addNotificationOptimistically called with:`,
          JSON.stringify(notificationData, null, 2)
        );
        console.log(`[SEARCH] [NOTIFICATION_DROPDOWN] Current isOpen state: ${isOpen}`);

        // Extract notification_id from various possible locations
        const notificationId =
          notificationData?.notification_id ||
          notificationData?.id ||
          notificationData?.data?.notification_id;

        if (!notificationId) {
          console.warn(
            '[WARNING] [NOTIFICATION_DROPDOWN] Cannot add notification: missing notification_id',
            notificationData
          );
          return;
        }

        console.log(
          `[SUCCESS] [NOTIFICATION_DROPDOWN] Found notification_id: ${notificationId}, adding to state`
        );

        // Check if notification already exists and add to state
        setNotifications(prev => {
          console.log(
            `[STATS] [NOTIFICATION_DROPDOWN] Current notifications count: ${prev.length}`
          );
          const exists = prev.some(n => n.id === notificationId);
          if (exists) {
            console.log(
              `[INFO] [NOTIFICATION_DROPDOWN] Notification ${notificationId} already exists in state, skipping`
            );
            return prev; // Don't modify state if already exists
          }

          // Create new notification object from socket data
          // Handle different data structures from backend
          // Backend emits: { notification_id, type, title, message, data: {...}, created_at }
          const newNotification: Notification = {
            id: notificationId,
            user_id: userId,
            type: notificationData.type || notificationData.data?.type || 'GENERAL',
            title: notificationData.title || notificationData.data?.title || 'Thông báo mới',
            message: notificationData.message || notificationData.data?.message || '',
            data:
              notificationData.data ||
              (notificationData.data === undefined ? notificationData : {}),
            is_read: notificationData.is_read || false,
            created_at:
              notificationData.created_at ||
              notificationData.data?.created_at ||
              new Date().toISOString(),
            updated_at:
              notificationData.created_at ||
              notificationData.updated_at ||
              notificationData.data?.created_at ||
              new Date().toISOString(),
          };

          console.log(`[SEARCH] [NOTIFICATION_DROPDOWN] Created notification object:`, {
            id: newNotification.id,
            title: newNotification.title,
            message: newNotification.message,
            type: newNotification.type,
            is_read: newNotification.is_read,
            created_at: newNotification.created_at,
          });

          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Created notification object:`,
            JSON.stringify(newNotification, null, 2)
          );

          // Add to beginning of list (newest first) - NO RELOAD, just state update
          const updated = [newNotification, ...prev].slice(0, 50); // Keep only latest 50
          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Added notification ${notificationId} to state. Total notifications: ${prev.length} -> ${updated.length}`
          );
          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] New notification will appear at index 0:`,
            {
              id: newNotification.id,
              title: newNotification.title,
              type: newNotification.type,
            }
          );
          return updated;
        });

        // Update unread count immediately (no reload)
        setUnreadCount(prev => {
          const newCount = prev + 1;
          console.log(`🔢 [NOTIFICATION_DROPDOWN] Unread count updated: ${prev} → ${newCount}`);
          return newCount;
        });

        // Track for animation
        setNewNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.add(notificationId);
          console.log(`🎬 [NOTIFICATION_DROPDOWN] Added ${notificationId} to animation set`);
          return newSet;
        });

        // Auto scroll to top if dropdown is open and user is scrolled down
        // Use setTimeout to ensure DOM is updated first
        setTimeout(() => {
          if (dropdownRef.current && isOpen) {
            const scrollContainer = dropdownRef.current.querySelector(
              '[data-scroll-container]'
            ) as HTMLElement;
            if (scrollContainer) {
              // Only scroll if user is not at the top (scrolled down)
              if (scrollContainer.scrollTop > 50) {
                scrollContainer.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                });
                console.log(`📜 [NOTIFICATION_DROPDOWN] Auto-scrolled to top for new notification`);
              }
            }
          }
        }, 100);

        setTimeout(() => {
          setNewNotificationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        }, 2000); // Remove from animation set after 2s
      };

      const handleBookingNew = (eventName: string, data?: any) => {
        console.log(
          `[NOTIFY] [NOTIFICATION_DROPDOWN] Received ${eventName} event:`,
          JSON.stringify(data, null, 2)
        );

        // Extract notification_id from various possible locations
        // Backend emits different structures:
        // 1. notification:new: { notification_id, type, title, message, data: {...}, created_at, is_read }
        // 2. certification:upload: { notification_id, certification_id, trainer_id, ... } (socketData)
        // 3. certification:verified: { notification_id, certification_id, trainer_id, ... } (socketData)
        const notificationId =
          data?.notification_id ||
          data?.data?.notification_id ||
          (data?.data && typeof data.data === 'object' && data.data.notification_id);

        // Create unique event ID from event name and notification_id (if available)
        const eventId = notificationId
          ? `${eventName}:${notificationId}`
          : `${eventName}:${Date.now()}:${Math.random()}`;

        // Skip if we've already processed this event recently (within 5 seconds)
        if (processedEventsRef.current.has(eventId)) {
          console.log(
            `[SKIP] [NOTIFICATION_DROPDOWN] Skipping duplicate ${eventName} event: ${eventId}`
          );
          return;
        }

        // Mark event as processed
        processedEventsRef.current.add(eventId);
        // Clean up old event IDs after 5 seconds
        setTimeout(() => {
          processedEventsRef.current.delete(eventId);
        }, 5000);

        console.log(
          `[SUCCESS] [NOTIFICATION_DROPDOWN] Processing ${eventName} event optimistically (no reload)`
        );
        console.log(
          `[SEARCH] [NOTIFICATION_DROPDOWN] Extracted notification_id: ${notificationId}`
        );

        // For notification:new event, data structure is already correct
        if (eventName === 'notification:new' && data) {
          console.log(
            `[PROCESS] [NOTIFICATION_DROPDOWN] Processing notification:new event. notificationId: ${notificationId}, data:`,
            JSON.stringify(data, null, 2)
          );

          // If notification_id is missing, skip this notification (don't create temporary one)
          if (!notificationId) {
            console.warn(
              `[WARNING] [NOTIFICATION_DROPDOWN] notification:new event missing notification_id. Skipping notification.`
            );
            return;
          }

          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Calling addNotificationOptimistically for notification:new event (ID: ${notificationId})`
          );
          // Add notification immediately to UI (optimistic update)
          try {
            addNotificationOptimistically(data);
            console.log(
              `[SUCCESS] [NOTIFICATION_DROPDOWN] addNotificationOptimistically completed for ${notificationId}`
            );
          } catch (error) {
            console.error(
              `[ERROR] [NOTIFICATION_DROPDOWN] Error in addNotificationOptimistically:`,
              error
            );
          }

          // Sync unread count in background after delay (no UI impact)
          setTimeout(() => {
            fetchUnreadCount().catch(error => {
              console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
            });
          }, 2000);
          return;
        }

        // For certification events (certification:upload, certification:verified, etc.)
        // These events contain notification_id in the socketData
        // Structure: { notification_id, certification_id, trainer_id, title, message, ... }
        if (notificationId) {
          // Construct notification object from certification event data
          // Backend emits socketData with notification_id, title, message, etc.
          // For certification:verified/rejected, backend also emits notification:new separately
          // But we handle certification events here as backup

          // Determine notification type based on event name
          let notificationType = 'CERTIFICATION_UPLOAD';
          if (eventName === 'certification:verified') {
            notificationType = 'CERTIFICATION_VERIFIED';
          } else if (eventName === 'certification:rejected') {
            notificationType = 'CERTIFICATION_REJECTED';
          } else if (eventName === 'certification:pending') {
            notificationType = 'CERTIFICATION_UPLOAD';
          }

          const notificationData = {
            notification_id: notificationId,
            type: data?.type || data?.data?.type || notificationType,
            title: data?.title || data?.data?.title || 'Chứng chỉ mới',
            message: data?.message || data?.data?.message || '',
            data: data?.data || data || {},
            created_at: data?.created_at || data?.data?.created_at || new Date().toISOString(),
            is_read: false,
          };

          console.log(
            `[PROCESS] [NOTIFICATION_DROPDOWN] Adding notification from ${eventName} event (ID: ${notificationId}):`,
            notificationData
          );

          // Add notification optimistically
          addNotificationOptimistically(notificationData);

          // Sync unread count in background after delay (no UI impact)
          setTimeout(() => {
            fetchUnreadCount().catch(error => {
              console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
            });
          }, 2000);
          return;
        }

        // Fallback: For events without notification_id, do NOT reload notifications
        // Only sync unread count in background (no UI impact)
        console.log(
          `[INFO] [NOTIFICATION_DROPDOWN] Event ${eventName} doesn't contain notification_id. Data:`,
          data
        );
        console.log(`[INFO] [NOTIFICATION_DROPDOWN] Syncing unread count only (no reload).`);
        setTimeout(() => {
          fetchUnreadCount().catch(error => {
            console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
          });
        }, 1000);
      };

      // Remove existing listeners first to avoid duplicates (Schedule Socket)
      scheduleSocket.off('booking:new');
      scheduleSocket.off('booking:pending_payment');
      scheduleSocket.off('booking:confirmed');
      scheduleSocket.off('booking:cancelled');
      scheduleSocket.off('booking:payment:success');
      scheduleSocket.off('booking:status_changed');
      scheduleSocket.off('schedule:new');
      scheduleSocket.off('schedule:updated');
      scheduleSocket.off('schedule:deleted');
      scheduleSocket.off('schedule:cancelled');
      scheduleSocket.off('certification:upload');
      scheduleSocket.off('certification:pending');
      scheduleSocket.off('certification:status');
      scheduleSocket.off('certification:verified');
      scheduleSocket.off('certification:rejected');
      scheduleSocket.off('certification:deleted');
      scheduleSocket.off('certification:expiring_soon');
      scheduleSocket.off('certification:expired');
      scheduleSocket.off('waitlist:added');
      scheduleSocket.off('waitlist:promoted');
      scheduleSocket.off('room:changed');
      scheduleSocket.off('room:change:rejected');
      scheduleSocket.off('member:checked_in');
      scheduleSocket.off('trainer:deleted');
      scheduleSocket.off('notification:new');

      // Remove member socket listeners
      if (memberSocket) {
        memberSocket.off('member:created');
        memberSocket.off('member:updated');
        memberSocket.off('member:deleted');
        memberSocket.off('member:status_changed');
        memberSocket.off('member:registration_completed');
        memberSocket.off('reward:redemption:new');
        memberSocket.off('equipment:queue:updated');
        memberSocket.off('equipment:status:changed');
        memberSocket.off('equipment:issue:reported');
        memberSocket.off('notification:new');
        memberSocket.off('queue:joined');
        memberSocket.off('queue:position_updated');
        memberSocket.off('queue:expired');
        memberSocket.off('equipment:available');
      }

      // Register Schedule Service event listeners
      // All schedule events - notifications will come via notification:new if backend creates them
      if (scheduleSocket) {
        const scheduleEvents = [
          'booking:new',
          'booking:pending_payment',
          'booking:confirmed',
          'booking:cancelled',
          'booking:payment:success',
          'booking:status_changed',
          'schedule:new',
          'schedule:updated',
          'schedule:deleted',
          'schedule:cancelled',
          'certification:upload',
          'certification:pending',
          'certification:status',
          'certification:verified',
          'certification:rejected',
          'certification:deleted',
          'certification:expiring_soon',
          'certification:expired',
          'waitlist:added',
          'waitlist:promoted',
          'room:changed',
          'room:change:rejected',
          'member:checked_in',
          'trainer:deleted',
        ];

        scheduleEvents.forEach(eventName => {
          scheduleSocket.on(eventName, () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] ${eventName} event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });
        });
      }

      // Primary notification event from schedule service
      console.log(
        `👂 [NOTIFICATION_DROPDOWN] Registering notification:new listener on schedule socket: ${scheduleSocket.id}`
      );
      scheduleSocket.on('notification:new', data => {
        console.log(
          '[NOTIFY] [NOTIFICATION_DROPDOWN] [STAR] notification:new event received from schedule socket:',
          JSON.stringify(data, null, 2)
        );
        handleBookingNew('notification:new', data);
      });

      // Listen for notification:read events (when notifications are marked as read)
      scheduleSocket.on('notification:read', (data: any) => {
        try {
          console.log(
            '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:read event received:',
            JSON.stringify(data, null, 2)
          );

          if (data.all) {
            // Mark all as read - update all notifications and set count to 0
            setNotifications(prev =>
              prev.map(n => ({
                ...n,
                is_read: true,
                read_at: data.read_at || new Date().toISOString(),
              }))
            );
            setUnreadCount(0);
          } else if (data.bulk && data.notification_ids && Array.isArray(data.notification_ids)) {
            // Bulk mark as read
            const updatedCount = data.updated_count || data.notification_ids.length;
            setNotifications(prev =>
              prev.map(n =>
                data.notification_ids.includes(n.id)
                  ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                  : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - updatedCount));
          } else if (data.notification_id) {
            // Single notification marked as read
            setNotifications(prev =>
              prev.map(n =>
                n.id === data.notification_id
                  ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                  : n
              )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        } catch (error) {
          console.error(
            '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:read event:',
            error
          );
        }
      });

      // Listen for notification:count_updated events (real-time count sync)
      scheduleSocket.on(
        'notification:count_updated',
        (data: { count: number; user_id?: string }) => {
          try {
            // Only update if this update is for the current user
            if (!data.user_id || data.user_id === userId) {
              console.log(
                '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:count_updated event received:',
                data.count
              );
              setUnreadCount(data.count);
            }
          } catch (error) {
            console.error(
              '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:count_updated event:',
              error
            );
          }
        }
      );

      // Setup Member Service socket listeners if available
      if (memberSocket) {
        // Wait for member socket to connect
        const setupMemberListeners = () => {
          if (!memberSocket || !memberSocket.connected) {
            console.log(
              `[WAIT] [NOTIFICATION_DROPDOWN] Member socket not connected yet, waiting...`
            );
            if (memberSocket?.once) {
              memberSocket.once('connect', () => {
                console.log(
                  `[SUCCESS] [NOTIFICATION_DROPDOWN] Member socket connected, setting up listeners...`
                );
                setupMemberListeners();
              });
            } else {
              setTimeout(setupMemberListeners, 1000);
            }
            return;
          }

          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Member socket is connected: ${memberSocket.id}`
          );

          // Subscribe to user and admin rooms
          if (userId) {
            memberSocket.emit('subscribe:user', userId);
            memberSocket.emit('subscribe:admin');
          }

          // Remove existing listeners first
          memberSocket.off('member:created');
          memberSocket.off('member:updated');
          memberSocket.off('member:deleted');
          memberSocket.off('member:status_changed');
          memberSocket.off('member:registration_completed');
          memberSocket.off('reward:redemption:new');
          memberSocket.off('equipment:queue:updated');
          memberSocket.off('equipment:status:changed');
          memberSocket.off('equipment:issue:reported');
          memberSocket.off('notification:new');

          // Register Member Service event listeners
          // member:created event - notification will come via notification:new if backend creates it
          memberSocket.on('member:created', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] member:created event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          memberSocket.on('member:registration_completed', data => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] member:registration_completed event received`
            );
            // Update unread count immediately (notification will be added when backend emits notification:new)
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log(
                `[NOTIFICATION_DROPDOWN] Unread count updated from member:registration_completed: ${prev} → ${newCount}`
              );
              return newCount;
            });
            // Sync unread count from database after a short delay to ensure accuracy
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // member:updated event - notification is created in database by backend
          // and will be received via notification:new event, so we skip creating optimistic notification here
          memberSocket.on('member:updated', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] member:updated event received (notification will come via notification:new)`
            );
            // Just update unread count optimistically, actual notification will come from notification:new
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // member:deleted event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('member:deleted', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] member:deleted event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // member:status_changed event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('member:status_changed', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] member:status_changed event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // reward:redemption:new event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('reward:redemption:new', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] reward:redemption:new event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // equipment:queue:updated event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('equipment:queue:updated', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] equipment:queue:updated event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // equipment:status:changed event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('equipment:status:changed', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] equipment:status:changed event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // equipment:issue:reported event - notification is created in database by backend
          // and will be received via notification:new event
          memberSocket.on('equipment:issue:reported', () => {
            console.log(
              `[NOTIFY] [NOTIFICATION_DROPDOWN] equipment:issue:reported event received (notification will come via notification:new)`
            );
            setTimeout(() => {
              fetchUnreadCount().catch(error => {
                console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
              });
            }, 1000);
          });

          // Primary notification event from member service
          memberSocket.on('notification:new', data => {
            console.log(
              '[NOTIFY] [NOTIFICATION_DROPDOWN] [STAR] notification:new event received from member socket:',
              JSON.stringify(data, null, 2)
            );
            handleBookingNew('notification:new', data);
          });

          // Listen for notification:read events from member service
          memberSocket.on('notification:read', (data: any) => {
            try {
              console.log(
                '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:read event received from member socket:',
                JSON.stringify(data, null, 2)
              );

              if (data.all) {
                setNotifications(prev =>
                  prev.map(n => ({
                    ...n,
                    is_read: true,
                    read_at: data.read_at || new Date().toISOString(),
                  }))
                );
                setUnreadCount(0);
              } else if (
                data.bulk &&
                data.notification_ids &&
                Array.isArray(data.notification_ids)
              ) {
                const updatedCount = data.updated_count || data.notification_ids.length;
                setNotifications(prev =>
                  prev.map(n =>
                    data.notification_ids.includes(n.id)
                      ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                      : n
                  )
                );
                setUnreadCount(prev => Math.max(0, prev - updatedCount));
              } else if (data.notification_id) {
                setNotifications(prev =>
                  prev.map(n =>
                    n.id === data.notification_id
                      ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                      : n
                  )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } catch (error) {
              console.error(
                '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:read event:',
                error
              );
            }
          });

          // Listen for notification:count_updated events from member service
          memberSocket.on(
            'notification:count_updated',
            (data: { count: number; user_id?: string }) => {
              try {
                if (!data.user_id || data.user_id === userId) {
                  console.log(
                    '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:count_updated event received from member socket:',
                    data.count
                  );
                  setUnreadCount(data.count);
                }
              } catch (error) {
                console.error(
                  '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:count_updated event:',
                  error
                );
              }
            }
          );
        };

        setupMemberListeners();
      } else {
        console.warn(`[WARNING] [NOTIFICATION_DROPDOWN] Member socket not available`);
      }

      // Setup Identity Service socket listeners for bulk notifications
      if (identitySocket) {
        const setupIdentityListeners = () => {
          if (!identitySocket || !identitySocket.connected) {
            console.log(
              `[WAIT] [NOTIFICATION_DROPDOWN] Identity socket not connected yet, waiting...`
            );
            if (identitySocket?.once) {
              identitySocket.once('connect', () => {
                console.log(
                  `[SUCCESS] [NOTIFICATION_DROPDOWN] Identity socket connected, setting up listeners...`
                );
                setupIdentityListeners();
              });
            } else {
              // Fallback: retry after delay
              setTimeout(setupIdentityListeners, 1000);
            }
            return;
          }

          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Identity socket is connected: ${identitySocket.id}, User ID: ${userId}`
          );

          // Remove existing listeners first to avoid duplicates
          identitySocket.off('notification:new');

          // Primary notification event from identity service (for bulk notifications)
          console.log(
            `👂 [NOTIFICATION_DROPDOWN] Registering notification:new listener on identity socket: ${identitySocket.id}`
          );
          identitySocket.on('notification:new', data => {
            console.log(
              '[NOTIFY] [NOTIFICATION_DROPDOWN] [STAR] notification:new event received from identity socket:',
              JSON.stringify(data, null, 2)
            );
            handleBookingNew('notification:new', data);
          });

          // Listen for notification:read events from identity service
          identitySocket.on('notification:read', (data: any) => {
            try {
              console.log(
                '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:read event received from identity socket:',
                JSON.stringify(data, null, 2)
              );

              if (data.all) {
                setNotifications(prev =>
                  prev.map(n => ({
                    ...n,
                    is_read: true,
                    read_at: data.read_at || new Date().toISOString(),
                  }))
                );
                setUnreadCount(0);
              } else if (
                data.bulk &&
                data.notification_ids &&
                Array.isArray(data.notification_ids)
              ) {
                const updatedCount = data.updated_count || data.notification_ids.length;
                setNotifications(prev =>
                  prev.map(n =>
                    data.notification_ids.includes(n.id)
                      ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                      : n
                  )
                );
                setUnreadCount(prev => Math.max(0, prev - updatedCount));
              } else if (data.notification_id) {
                setNotifications(prev =>
                  prev.map(n =>
                    n.id === data.notification_id
                      ? { ...n, is_read: true, read_at: data.read_at || new Date().toISOString() }
                      : n
                  )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
              }
            } catch (error) {
              console.error(
                '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:read event:',
                error
              );
            }
          });

          // Listen for notification:count_updated events from identity service
          identitySocket.on(
            'notification:count_updated',
            (data: { count: number; user_id?: string }) => {
              try {
                if (!data.user_id || data.user_id === userId) {
                  console.log(
                    '[NOTIFY] [NOTIFICATION_DROPDOWN] notification:count_updated event received from identity socket:',
                    data.count
                  );
                  setUnreadCount(data.count);
                }
              } catch (error) {
                console.error(
                  '[ERROR] [NOTIFICATION_DROPDOWN] Error handling notification:count_updated event:',
                  error
                );
              }
            }
          );
        };

        setupIdentityListeners();
      } else {
        console.warn(`[WARNING] [NOTIFICATION_DROPDOWN] Identity socket not available`);
      }

      console.log(`[SUCCESS] [NOTIFICATION_DROPDOWN] All socket listeners registered successfully`);

      // Verify subscription after a short delay
      setTimeout(() => {
        console.log(
          `[SEARCH] [NOTIFICATION_DROPDOWN] Socket subscription verification - Schedule Socket ID: ${
            scheduleSocket.id
          }, Member Socket ID: ${memberSocket?.id || 'N/A'}, User ID: ${userId}`
        );
      }, 500);

      // Poll for new notifications every 30 seconds as backup (only unread count, not full fetch)
      const interval = setInterval(() => {
        // Only fetch unread count in polling, not full notifications (to reduce load)
        if (!isFetchingRef.current) {
          fetchUnreadCount();
        }
      }, 30000);

      return () => {
        // Cleanup schedule socket listeners
        scheduleSocket.off('booking:new');
        scheduleSocket.off('booking:pending_payment');
        scheduleSocket.off('booking:confirmed');
        scheduleSocket.off('booking:cancelled');
        scheduleSocket.off('booking:payment:success');
        scheduleSocket.off('booking:status_changed');
        scheduleSocket.off('schedule:new');
        scheduleSocket.off('schedule:updated');
        scheduleSocket.off('schedule:deleted');
        scheduleSocket.off('schedule:cancelled');
        scheduleSocket.off('certification:upload');
        scheduleSocket.off('certification:pending');
        scheduleSocket.off('certification:status');
        scheduleSocket.off('certification:verified');
        scheduleSocket.off('certification:rejected');
        scheduleSocket.off('certification:deleted');
        scheduleSocket.off('certification:expiring_soon');
        scheduleSocket.off('certification:expired');
        scheduleSocket.off('waitlist:added');
        scheduleSocket.off('waitlist:promoted');
        scheduleSocket.off('room:changed');
        scheduleSocket.off('room:change:rejected');
        scheduleSocket.off('member:checked_in');
        scheduleSocket.off('trainer:deleted');
        scheduleSocket.off('notification:new');
        scheduleSocket.off('notification:read');
        scheduleSocket.off('notification:count_updated');

        // Cleanup member socket listeners
        if (memberSocket) {
          memberSocket.off('member:created');
          memberSocket.off('member:updated');
          memberSocket.off('member:deleted');
          memberSocket.off('member:status_changed');
          memberSocket.off('member:registration_completed');
          memberSocket.off('reward:redemption:new');
          memberSocket.off('equipment:queue:updated');
          memberSocket.off('equipment:status:changed');
          memberSocket.off('equipment:issue:reported');
          memberSocket.off('notification:new');
          memberSocket.off('notification:read');
          memberSocket.off('notification:count_updated');
        }

        // Cleanup identity socket listeners
        if (identitySocket) {
          identitySocket.off('notification:new');
          identitySocket.off('notification:read');
          identitySocket.off('notification:count_updated');
        }

        clearInterval(interval);
      };
    };

    const cleanup = setupSocketListeners();

    // Listen for certification:created event (triggered after trainer uploads certification)
    // Note: Socket events should handle this, but this is a fallback
    // We don't reload here - socket events will handle adding notifications optimistically
    const handleCertificationCreated = (event: CustomEvent) => {
      console.log(
        '[NOTIFY] [NOTIFICATION_DROPDOWN] certification:created event received:',
        event.detail
      );
      // Don't reload notifications - socket events will handle this optimistically
      // Just sync unread count in the background after a delay to ensure accuracy
      setTimeout(() => {
        fetchUnreadCount().catch(error => {
          console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
        });
      }, 2000);
    };

    window.addEventListener('certification:created', handleCertificationCreated as EventListener);

    // Listen for notification:new custom event from AppLayout/TrainerLayout (fallback if socket event missed)
    // This is important because sometimes socket events might be received by Layout components first
    const handleNotificationNew = (event: CustomEvent) => {
      console.log(
        '[NOTIFY] [NOTIFICATION_DROPDOWN] [STAR][STAR] notification:new custom event received from Layout:',
        JSON.stringify(event.detail, null, 2)
      );
      // Extract notification data and add optimistically
      const notificationData = event.detail;

      // Extract notification_id from various possible locations
      const notificationId =
        notificationData?.notification_id ||
        notificationData?.id ||
        notificationData?.data?.notification_id;

      if (notificationId) {
        console.log(
          `[SUCCESS] [NOTIFICATION_DROPDOWN] Found notification_id from custom event: ${notificationId}`
        );

        setNotifications(prev => {
          const exists = prev.some(n => n.id === notificationId);
          if (exists) {
            console.log(
              `[INFO] [NOTIFICATION_DROPDOWN] Notification ${notificationId} already exists, skipping`
            );
            return prev;
          }

          // Construct notification object - handle different data structures
          // Structure 1: { notification_id, type, title, message, data: {...}, created_at, is_read }
          // Structure 2: { notification_id, certification_id, title, message, ... } (from certification events)
          const notificationType =
            notificationData.type || notificationData.data?.type || 'GENERAL';
          const notificationTitle =
            notificationData.title ||
            notificationData.data?.title ||
            notificationData.data?.title ||
            'Thông báo mới';
          const notificationMessage =
            notificationData.message || notificationData.data?.message || '';

          // Merge data - prioritize data.data if it exists (from notification:new structure)
          // Otherwise use notificationData directly (from certification events)
          const notificationDataObj = notificationData.data || notificationData || {};

          const newNotification: Notification = {
            id: notificationId,
            user_id: userId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            data: notificationDataObj,
            is_read: false,
            created_at:
              notificationData.created_at ||
              notificationData.data?.created_at ||
              notificationDataObj.created_at ||
              new Date().toISOString(),
            updated_at:
              notificationData.created_at ||
              notificationData.updated_at ||
              notificationData.data?.created_at ||
              notificationDataObj.created_at ||
              new Date().toISOString(),
          };

          console.log(
            `[SUCCESS] [NOTIFICATION_DROPDOWN] Added notification ${notificationId} from custom event`
          );
          return [newNotification, ...prev].slice(0, 50);
        });

        setUnreadCount(prev => {
          const newCount = prev + 1;
          console.log(
            `🔢 [NOTIFICATION_DROPDOWN] Unread count updated from custom event: ${prev} → ${newCount}`
          );
          return newCount;
        });
      } else {
        console.warn(
          '[WARNING] [NOTIFICATION_DROPDOWN] Custom event notification:new missing notification_id:',
          notificationData
        );
      }
    };

    window.addEventListener('notification:new', handleNotificationNew as EventListener);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener(
        'certification:created',
        handleCertificationCreated as EventListener
      );
      window.removeEventListener('notification:new', handleNotificationNew as EventListener);
    };
  }, [userId, fetchUnreadCount]);

  // Listen for custom events from AppLayout/TrainerLayout (for certification updates)
  // Note: These events are dispatched from AppLayout/TrainerLayout when socket events are received
  // Socket events should already be handled in setupSocketListeners, but this is a fallback
  useEffect(() => {
    const handleCertificationUpdated = () => {
      // Don't reload notifications - socket events will handle this optimistically
      // Just sync unread count in the background after a delay to ensure accuracy
      setTimeout(() => {
        fetchUnreadCount().catch(error => {
          console.error('[ERROR] [NOTIFICATION_DROPDOWN] Error syncing unread count:', error);
        });
      }, 1000);
    };

    window.addEventListener('certification:updated', handleCertificationUpdated as EventListener);

    return () => {
      window.removeEventListener(
        'certification:updated',
        handleCertificationUpdated as EventListener
      );
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Add to marking set to trigger transition state
      setMarkingAsRead(prev => new Set(prev).add(notificationId));

      // Wait for CSS transition to start rendering
      await new Promise(resolve => setTimeout(resolve, 50));

      const response = await notificationService.markAsRead(notificationId, userId);
      if (response.success) {
        // Update notification state - this triggers the main transition
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        // Wait for transition to complete before removing from marking set
        setTimeout(() => {
          setMarkingAsRead(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        }, 700); // Match transition duration (650ms) + buffer
      } else {
        // If failed, remove from marking set immediately
        setMarkingAsRead(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Remove from marking set on error
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Start marking all as read animation
      setMarkingAllAsRead(true);

      // Get all unread notification IDs
      const unreadNotificationIds = notifications
        .filter(notif => !notif.is_read)
        .map(notif => notif.id);

      // Add all unread notifications to marking set for staggered animation
      unreadNotificationIds.forEach(id => {
        setMarkingAsRead(prev => new Set(prev).add(id));
      });

      // Wait for animations to complete (staggered: 0.05s delay * number of items + 0.65s transition)
      const animationDuration = unreadNotificationIds.length * 50 + 650;
      await new Promise(resolve => setTimeout(resolve, animationDuration));

      const response = await notificationService.markAllAsRead(userId);
      if (response.success) {
        // Update all notifications to read state
        setNotifications(prev =>
          prev.map(notif => ({
            ...notif,
            is_read: true,
            read_at: notif.read_at || new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }

      // Clean up marking states
      setTimeout(() => {
        setMarkingAsRead(new Set());
        setMarkingAllAsRead(false);
      }, 100);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Clean up on error
      setMarkingAsRead(new Set());
      setMarkingAllAsRead(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Optimistic update: Remove from UI immediately for smooth animation
      const deletedNotification = notifications.find(notif => notif.id === notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

      // Update unread count if needed
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Call API in background (don't wait for response for better UX)
      notificationService.deleteNotification(notificationId, userId).catch(error => {
        console.error('Error deleting notification:', error);
        // Optionally: Re-add notification if delete failed
        // But for better UX, we'll keep it deleted optimistically
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-5 h-5 text-orange-600 dark:text-orange-400';
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
        return <CheckCheck className={iconClass} />;
      case 'CERTIFICATION_REJECTED':
        return <XCircle className={iconClass} />;
      case 'CERTIFICATION_AUTO_VERIFIED':
        return <Sparkles className={iconClass} />;
      case 'CERTIFICATION_PENDING':
      case 'CERTIFICATION_UPLOAD':
        return <AlertCircle className={iconClass} />;
      case 'CERTIFICATION_EXPIRED':
      case 'CERTIFICATION_EXPIRING_SOON':
        return <Clock className={iconClass} />;
      case 'CERTIFICATION_DELETED':
        return <XCircle className={iconClass} />;
      case 'CLASS_BOOKING':
        return <Calendar className={iconClass} />;
      case 'CLASS_CANCELLED':
      case 'SCHEDULE_CANCELLED':
        return <AlertCircle className={iconClass} />;
      case 'MEMBERSHIP_EXPIRING':
        return <Clock className={iconClass} />;
      case 'ACHIEVEMENT_UNLOCKED':
        return <Trophy className={iconClass} />;
      case 'MEMBER_REGISTERED':
      case 'MEMBER_UPDATED':
      case 'MEMBER_DELETED':
        return <Bell className={iconClass} />;
      case 'REWARD_REDEMPTION':
        return <Trophy className={iconClass} />;
      case 'WAITLIST_ADDED':
      case 'WAITLIST_PROMOTED':
        return <Clock className={iconClass} />;
      case 'ROOM_CHANGED':
      case 'ROOM_CHANGE_REJECTED':
        return <AlertCircle className={iconClass} />;
      case 'MEMBER_CHECKED_IN':
        return <CheckCheck className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'CERTIFICATION_VERIFIED':
      case 'CERTIFICATION_AUTO_VERIFIED':
      case 'MEMBER_CHECKED_IN':
        return {
          text: 'text-success-600 dark:text-success-400',
          bg: 'bg-success-50 dark:bg-success-500/10',
          border: 'border-success-200 dark:border-success-500/20',
        };
      case 'CERTIFICATION_REJECTED':
      case 'CERTIFICATION_DELETED':
      case 'MEMBER_DELETED':
        return {
          text: 'text-error-600 dark:text-error-400',
          bg: 'bg-error-50 dark:bg-error-500/10',
          border: 'border-error-200 dark:border-error-500/20',
        };
      case 'CERTIFICATION_PENDING':
      case 'CERTIFICATION_UPLOAD':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'CERTIFICATION_EXPIRED':
      case 'CERTIFICATION_EXPIRING_SOON':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'CLASS_BOOKING':
      case 'WAITLIST_PROMOTED':
        return {
          text: 'text-blue-light-600 dark:text-blue-light-400',
          bg: 'bg-blue-light-50 dark:bg-blue-light-500/10',
          border: 'border-blue-light-200 dark:border-blue-light-500/20',
        };
      case 'CLASS_CANCELLED':
      case 'SCHEDULE_CANCELLED':
      case 'ROOM_CHANGE_REJECTED':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'MEMBERSHIP_EXPIRING':
        return {
          text: 'text-warning-600 dark:text-warning-400',
          bg: 'bg-warning-50 dark:bg-warning-500/10',
          border: 'border-warning-200 dark:border-warning-500/20',
        };
      case 'ACHIEVEMENT_UNLOCKED':
      case 'REWARD_REDEMPTION':
        return {
          text: 'text-primary-600 dark:text-primary-400',
          bg: 'bg-primary-50 dark:bg-primary-500/10',
          border: 'border-primary-200 dark:border-primary-500/20',
        };
      case 'MEMBER_REGISTERED':
      case 'MEMBER_UPDATED':
        return {
          text: 'text-blue-light-600 dark:text-blue-light-400',
          bg: 'bg-blue-light-50 dark:bg-blue-light-500/10',
          border: 'border-blue-light-200 dark:border-blue-light-500/20',
        };
      case 'WAITLIST_ADDED':
      case 'ROOM_CHANGED':
        return {
          text: 'text-blue-light-600 dark:text-blue-light-400',
          bg: 'bg-blue-light-50 dark:bg-blue-light-500/10',
          border: 'border-blue-light-200 dark:border-blue-light-500/20',
        };
      default:
        return {
          text: 'text-neutral-600 dark:text-neutral-400',
          bg: 'bg-neutral-50 dark:bg-neutral-800/50',
          border: 'border-neutral-200 dark:border-neutral-700',
        };
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getNotificationRole = (notification: Notification): string | null => {
    const { type, data, message } = notification;

    // Priority 1: Check if data contains role information (highest priority)
    if (data && typeof data === 'object') {
      if ('role' in data && data.role) {
        return data.role as string;
      }
      if (data.auto_verified === true || data.verified_by === 'AI_SYSTEM') {
        return 'AI';
      }
      if ('admin_id' in data || 'admin_name' in data) {
        return 'ADMIN';
      }
      if ('trainer_id' in data || 'trainer_name' in data) {
        return 'TRAINER';
      }
      if ('member_id' in data || 'member_name' in data) {
        return 'MEMBER';
      }
    }

    // Priority 2: Check message content for role hints (before type inference)
    // Only check if message explicitly says "admin đã" or "quản trị viên đã" (admin did something)
    // NOT if it says "thành viên đã" or "member đã" (member did something)
    const messageLower = message?.toLowerCase() || '';
    if (
      (messageLower.includes('admin đã') || messageLower.includes('quản trị viên đã')) &&
      !messageLower.includes('thành viên đã') &&
      !messageLower.includes('member đã')
    ) {
      return 'ADMIN';
    }
    if (messageLower.includes('trainer') || messageLower.includes('huấn luyện viên')) {
      return 'TRAINER';
    }

    // Priority 3: Infer role from notification type
    if (type.startsWith('CERTIFICATION_')) {
      // If title is "AI duyệt", it's from AI
      const titleLower = notification.title?.toLowerCase() || '';
      if (titleLower.includes('ai duyệt') || titleLower === 'ai duyệt') {
        return 'AI';
      }
      // If title is "Admin duyệt" or "Admin từ chối", it's from ADMIN
      if (titleLower.includes('admin duyệt') || titleLower.includes('admin từ chối')) {
        return 'ADMIN';
      }
      // If type is CERTIFICATION_AUTO_VERIFIED, it's from AI
      if (type === 'CERTIFICATION_AUTO_VERIFIED') {
        return 'AI';
      }
      // Otherwise, default to TRAINER for certification notifications
      return 'TRAINER';
    }
    if (type === 'CLASS_BOOKING' || type === 'MEMBERSHIP_' || type.startsWith('MEMBERSHIP_')) {
      return 'MEMBER';
    }
    if (type === 'SYSTEM_ANNOUNCEMENT' || type === 'GENERAL') {
      // Default for GENERAL from trainer creating class
      if (messageLower.includes('tạo lớp') || messageLower.includes('lớp học mới')) {
        return 'TRAINER';
      }
      return 'SYSTEM';
    }

    return null;
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;

    const roleConfig: Record<string, { label: string }> = {
      TRAINER: {
        label: 'Huấn luyện viên',
      },
      MEMBER: {
        label: 'Thành viên',
      },
      ADMIN: {
        label: 'Quản trị viên',
      },
      AI: {
        label: 'AI',
      },
      SUPER_ADMIN: {
        label: 'Super Admin',
      },
      SYSTEM: {
        label: 'Hệ thống',
      },
    };

    // Tất cả badge đều dùng màu cam để đồng bộ
    const orangeBadgeClassName =
      'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';

    const config = roleConfig[role] || {
      label: role,
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-theme-xs font-heading font-semibold border ${orangeBadgeClassName} shadow-sm`}
      >
        {config.label}
      </span>
    );
  };

  const renderMessageWithBadge = (notification: Notification) => {
    const role = getNotificationRole(notification);
    const badge = getRoleBadge(role);

    // Extract name from message or data
    // Priority: admin_name > trainer_name > member_name > extract from message
    let name = '';
    if (notification.data && typeof notification.data === 'object') {
      // For ADMIN role, prioritize admin_name
      if (role === 'ADMIN' && notification.data.admin_name) {
        name = notification.data.admin_name;
      } else {
        // For other roles, use the appropriate name field
        name =
          notification.data.trainer_name ||
          notification.data.member_name ||
          notification.data.admin_name ||
          '';
      }
    }

    // If no name in data and not ADMIN/AI role, try to extract from message (first word before "đã")
    // But skip if it's "Admin" or "AI" since we have badges for those
    if (!name && role !== 'ADMIN' && role !== 'AI') {
      const match = notification.message.match(/^([^đ]+?)\s+đã/);
      if (match) {
        const extractedName = match[1].trim();
        const extractedNameLower = extractedName.toLowerCase();
        // Don't use "Admin" as name if we have ADMIN badge
        // Don't use "AI" as name if we have AI badge
        if (
          (role !== 'ADMIN' || extractedNameLower !== 'admin') &&
          (role !== 'AI' || extractedNameLower !== 'ai')
        ) {
          name = extractedName;
        }
      }
    }

    // For ADMIN role, if we have admin_name in data, use it (don't extract from message)
    // If admin_name is "Admin" (default), don't show it in message since we have badge
    if (role === 'ADMIN' && notification.data && typeof notification.data === 'object') {
      const adminNameFromData = notification.data.admin_name;
      if (adminNameFromData && adminNameFromData.toLowerCase() !== 'admin') {
        name = adminNameFromData; // Use actual admin name
      } else {
        name = ''; // Don't extract "Admin" from message, badge will show it
      }
    }

    // Format message: for ADMIN/AI roles with badges, remove the name from message since badge shows it
    // If admin_name exists and is not "Admin", show it in message
    // If admin_name is "Admin" or doesn't exist, remove "Admin" from message (badge shows it)
    const formatMessage = (
      message: string,
      nameToBold: string,
      shouldRemoveName: boolean = false
    ) => {
      if (shouldRemoveName && nameToBold) {
        // Remove name from message (e.g., "Admin đã duyệt..." -> "đã duyệt...")
        const namePattern = nameToBold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^\\s*${namePattern}\\s+`, 'i');
        return message.replace(regex, '');
      }

      if (!nameToBold) {
        return message;
      }

      // Replace name with bold version
      const regex = new RegExp(`(${nameToBold.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      const parts = message.split(regex);
      return parts.map((part, index) =>
        part === nameToBold ? (
          <strong key={index} className='font-bold'>
            {part}
          </strong>
        ) : (
          part
        )
      );
    };

    // Determine if we should remove name from message
    // For ADMIN/AI roles with badges, remove "Admin" or "AI" from message if it's the default name
    const shouldRemoveNameFromMessage: boolean = !!(
      badge &&
      (role === 'ADMIN' || role === 'AI') &&
      (!name || name.toLowerCase() === 'admin' || name.toLowerCase() === 'ai')
    );

    if (!badge) {
      return <span>{formatMessage(notification.message, name, false)}</span>;
    }

    // Render badge and message as inline elements within the same container
    return (
      <>
        {badge}
        <span className='ml-2'>
          {formatMessage(notification.message, name, shouldRemoveNameFromMessage)}
        </span>
      </>
    );
  };

  return (
    <div className='relative font-sans' ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-all duration-300 ease-in-out rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-2 active:scale-95'
        aria-label='Thông báo'
        aria-expanded={isOpen}
      >
        <Bell className='w-5 h-5 transition-transform duration-300 hover:scale-110' />
        {unreadCount > 0 && (
          <>
            {/* Ping effect - ripple animation */}
            <span className='absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-orange-500 opacity-75 animate-ping' />
            {/* Badge with faster pulse */}
            <span className='absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-theme-xs font-heading font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-orange-500/50 border-2 border-white dark:border-gray-900 z-10 notification-badge-pulse'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className='absolute right-0 mt-2.5 w-[420px] bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl shadow-gray-900/10 dark:shadow-gray-900/50 border border-gray-200/80 dark:border-gray-800/80 z-50 overflow-hidden'
          >
            {/* Header - fixed height to prevent layout shift */}
            <div className='px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900/95 min-h-[72px]'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3 flex-1 min-w-0'>
                  <h3 className='text-theme-xl font-heading font-semibold text-gray-900 dark:text-white tracking-tight flex-shrink-0'>
                    Thông báo
                  </h3>
                  {/* Badge - always present to prevent layout shift, hidden with visibility */}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-theme-xs font-heading font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 shadow-sm transition-opacity duration-300 ${
                      unreadCount > 0
                        ? 'opacity-100 visible pointer-events-auto'
                        : 'opacity-0 invisible pointer-events-none'
                    }`}
                    aria-hidden={unreadCount === 0}
                  >
                    {unreadCount} mới
                  </span>
                </div>
                {/* Button - always present to prevent layout shift, hidden with visibility */}
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className={`text-theme-xs font-heading font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-opacity duration-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 active:scale-95 flex-shrink-0 ${
                    unreadCount > 0
                      ? 'opacity-100 visible pointer-events-auto'
                      : 'opacity-0 invisible pointer-events-none'
                  }`}
                  aria-hidden={unreadCount === 0}
                >
                  <CheckCheck className='w-3.5 h-3.5' />
                  <span>Đánh dấu tất cả đã đọc</span>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <motion.div
              data-scroll-container
              className='notification-scroll-container max-h-[480px] overflow-y-auto overflow-x-hidden no-scrollbar'
              style={{
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
              }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05, // Delay between items
                    delayChildren: 0.05, // Delay before starting
                  },
                },
              }}
              initial='hidden'
              animate='visible'
            >
              <style>{`
              /* Hide scrollbar but allow scrolling with mouse */
              .notification-scroll-container {
                -ms-overflow-style: none; /* IE and Edge */
                scrollbar-width: none; /* Firefox */
              }
              .notification-scroll-container::-webkit-scrollbar {
                display: none; /* Chrome, Safari and Opera */
              }
              
              /* Enhanced pulse animation for notification badge - faster and more noticeable */
              @keyframes notification-pulse {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                  box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.8);
                }
                25% {
                  opacity: 0.85;
                  transform: scale(1.08);
                  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.5);
                }
                50% {
                  opacity: 1;
                  transform: scale(1);
                  box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
                }
                75% {
                  opacity: 0.85;
                  transform: scale(1.08);
                  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.5);
                }
              }
              
              .notification-badge-pulse {
                animation: notification-pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
              
              /* Optimized smooth transitions - faster and smoother */
              .notification-item-transition {
                transition: background-color 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: background-color;
              }
              
              .notification-border-transition {
                transition: background-color 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                            opacity 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: background-color, opacity;
              }
              
              .notification-shadow-transition {
                transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: opacity;
              }
              
              /* Dark mode - same optimized transitions */
              .dark .notification-item-transition {
                transition: background-color 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: background-color;
              }
              
              .dark .notification-border-transition {
                transition: background-color 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                            opacity 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: background-color, opacity;
              }
              
              .dark .notification-shadow-transition {
                transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                will-change: opacity;
              }
              
              /* Smooth checkmark animation when marking as read */
              @keyframes checkmark-success {
                0% {
                  transform: scale(0.8);
                  opacity: 0.7;
                  color: rgb(107 114 128); /* gray-500 */
                }
                50% {
                  transform: scale(1.15);
                }
                100% {
                  transform: scale(1);
                  opacity: 1;
                  color: rgb(34 197 94); /* success-500 */
                }
              }
              
              .checkmark-reading {
                animation: checkmark-success 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              }
              
              /* Mark all as read animation - stagger background transition */
              .mark-all-as-read-animation {
                animation: mark-all-as-read-fade 0.65s ease-in-out forwards;
              }
              
              @keyframes mark-all-as-read-fade {
                0% {
                  background-color: rgb(254 243 199); /* orange-50 */
                }
                100% {
                  background-color: rgb(255 255 255); /* white */
                }
              }
              
              .dark .mark-all-as-read-animation {
                animation: mark-all-as-read-fade-dark 0.65s ease-in-out forwards;
              }
              
              @keyframes mark-all-as-read-fade-dark {
                0% {
                  background-color: rgb(154 52 18 / 0.2); /* orange-900/20 */
                }
                100% {
                  background-color: rgb(17 24 39 / 0.95); /* gray-900/95 */
                }
              }
              
              /* Border fade out animation for mark all as read */
              @keyframes border-fade-out {
                0% {
                  background-color: rgb(249 115 22); /* orange-500 */
                }
                100% {
                  background-color: transparent;
                }
              }
              
              .dark @keyframes border-fade-out-dark {
                0% {
                  background-color: rgb(251 146 60); /* orange-400 */
                }
                100% {
                  background-color: transparent;
                }
              }
              
              /* Shadow fade out animation for mark all as read */
              @keyframes shadow-fade-out {
                0% {
                  opacity: 1;
                }
                100% {
                  opacity: 0;
                }
              }
            `}</style>
              {loading ? (
                <div className='p-10 text-center'>
                  <div className='animate-spin rounded-full h-9 w-9 border-[3px] border-orange-200 border-t-orange-600 dark:border-orange-800 dark:border-t-orange-400 mx-auto'></div>
                  <p className='text-theme-sm font-inter font-medium text-gray-600 dark:text-gray-400 mt-4'>
                    Đang tải thông báo...
                  </p>
                </div>
              ) : !Array.isArray(notifications) || notifications.length === 0 ? (
                <div className='p-12 text-center'>
                  <div className='w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center shadow-inner'>
                    <Bell className='w-9 h-9 text-gray-400 dark:text-gray-500' />
                  </div>
                  <p className='text-theme-sm font-heading font-semibold text-gray-700 dark:text-gray-300 mb-1.5'>
                    Không có thông báo nào
                  </p>
                  <p className='text-theme-xs font-inter text-gray-500 dark:text-gray-400'>
                    Các thông báo mới sẽ hiển thị ở đây
                  </p>
                  {!Array.isArray(notifications) && (
                    <p className='text-theme-xs font-inter text-error-500 mt-2'>
                      Debug: notifications is not an array ({typeof notifications})
                    </p>
                  )}
                </div>
              ) : (
                <AnimatePresence mode='popLayout'>
                  {notifications
                    .filter(notification => notification && notification.id)
                    .map((notification, index) => {
                      const colors = getNotificationColor(notification.type);
                      // Check if this is a certification pending notification
                      const isCertificationPending =
                        notification.type === 'CERTIFICATION_PENDING' ||
                        (notification.data &&
                          (notification.data.trainer_id || notification.data.certification_id));

                      const handleNotificationClick = (e: React.MouseEvent) => {
                        // Don't navigate if clicking on action buttons
                        if ((e.target as HTMLElement).closest('button')) {
                          return;
                        }

                        // Navigate based on notification type and data
                        setIsOpen(false);

                        // Check if notification has action_route in data
                        if (notification.data && (notification.data as any).action_route) {
                          window.location.href = (notification.data as any).action_route;
                        }
                        // Navigate to trainer management if it's a certification pending notification
                        else if (isCertificationPending) {
                          // Construct route with certification_id and trainer_id if available
                          const certificationId = (notification.data as any)?.certification_id;
                          const trainerId = (notification.data as any)?.trainer_id;
                          if (certificationId && trainerId) {
                            window.location.href = `/management/trainers?certification_id=${certificationId}&trainer_id=${trainerId}`;
                          } else if (certificationId) {
                            window.location.href = `/management/trainers?certification_id=${certificationId}`;
                          } else {
                            window.location.href = '/management/trainers';
                          }
                        }
                      };

                      // Check if this notification is being marked as read (for smooth transition)
                      const isMarkingAsRead =
                        markingAsRead.has(notification.id) ||
                        (markingAllAsRead && !notification.is_read);
                      const isUnread = !notification.is_read && !isMarkingAsRead;
                      const isNew = newNotificationIds.has(notification.id);

                      // Calculate delay for stagger animation when marking all as read
                      // Find index of this notification in the unread list
                      const unreadNotifications = notifications.filter(notif => !notif.is_read);
                      const unreadIndex =
                        markingAllAsRead && isUnread
                          ? unreadNotifications.findIndex(notif => notif.id === notification.id)
                          : -1;
                      const staggerDelay = unreadIndex >= 0 ? unreadIndex * 50 : 0; // 50ms delay per item

                      // Variants for normal items (stagger animation - only if not new)
                      const itemVariants = {
                        hidden: { opacity: 0, y: -20, scale: 0.95 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            duration: 0.3,
                            ease: [0.25, 0.46, 0.45, 0.94] as const,
                          },
                        },
                        exit: {
                          opacity: 0,
                          x: 100,
                          scale: 0.85,
                          height: 0,
                          marginTop: 0,
                          marginBottom: 0,
                          paddingTop: 0,
                          paddingBottom: 0,
                          transition: {
                            duration: 0.35,
                            ease: [0.4, 0, 0.2, 1] as const, // ease-in-out cubic-bezier
                          },
                        },
                      };

                      // New notifications use their own animation (not affected by stagger)
                      if (isNew) {
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 100, scale: 0.8 }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              scale: 1,
                            }}
                            exit={{
                              opacity: 0,
                              x: 100,
                              scale: 0.85,
                              height: 0,
                              marginTop: 0,
                              marginBottom: 0,
                              paddingTop: 0,
                              paddingBottom: 0,
                              transition: {
                                duration: 0.35,
                                ease: [0.4, 0, 0.2, 1] as const, // ease-in-out cubic-bezier
                              },
                            }}
                            onClick={handleNotificationClick}
                            className={`group relative pl-16 pr-5 py-4 cursor-pointer notification-item-transition ${
                              isUnread
                                ? 'bg-orange-50 dark:bg-orange-900/20'
                                : isMarkingAsRead
                                ? 'bg-orange-50/50 dark:bg-orange-900/10'
                                : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900/95'
                            } ${index === 0 ? 'pt-4' : ''}`}
                          >
                            {/* Render notification content - same as below */}
                            {/* Border left */}
                            <div
                              className={`absolute left-0 top-0 bottom-0 w-[3px] notification-border-transition ${
                                isUnread
                                  ? 'bg-orange-500 dark:bg-orange-400'
                                  : isMarkingAsRead
                                  ? 'bg-orange-400/60 dark:bg-orange-500/50'
                                  : 'bg-transparent'
                              }`}
                            />
                            {/* Shadow/Ring overlay */}
                            <div
                              className={`absolute inset-0 pointer-events-none notification-shadow-transition ${
                                isUnread
                                  ? 'shadow-sm ring-1 ring-orange-200 dark:ring-orange-500/20 opacity-100'
                                  : isMarkingAsRead
                                  ? 'opacity-0'
                                  : 'opacity-0'
                              }`}
                            />
                            {/* Icon */}
                            <div className='absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10'>
                              {getNotificationIcon(notification.type)}
                            </div>
                            {/* Content */}
                            <div className='flex-1 min-w-0 relative z-10'>
                              <div className='flex items-start justify-between gap-3'>
                                <div className='flex-1 min-w-0'>
                                  <h4
                                    className={`text-theme-sm font-heading font-semibold ${colors.text} mb-1.5 leading-tight tracking-tight`}
                                  >
                                    {notification.title}
                                  </h4>
                                  <p className='text-theme-xs font-heading text-gray-600 dark:text-gray-300 leading-relaxed mb-2'>
                                    {renderMessageWithBadge(notification)}
                                  </p>
                                </div>
                                {/* Actions */}
                                <div className='flex items-start gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-[56px]'>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (isUnread || isMarkingAsRead) {
                                        handleMarkAsRead(notification.id);
                                      }
                                    }}
                                    disabled={(!isUnread && !isMarkingAsRead) || isMarkingAsRead}
                                    className={`w-7 h-7 p-1.5 rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center flex-shrink-0 ${
                                      isUnread || isMarkingAsRead
                                        ? 'text-gray-400 hover:text-success-600 dark:hover:text-success-400 hover:bg-success-50 dark:hover:bg-success-500/10 opacity-100 pointer-events-auto cursor-pointer'
                                        : 'text-gray-400 opacity-0 pointer-events-none cursor-default'
                                    } ${
                                      isMarkingAsRead
                                        ? 'disabled:opacity-50 disabled:cursor-not-allowed'
                                        : ''
                                    }`}
                                    title={
                                      isMarkingAsRead
                                        ? 'Đang đánh dấu...'
                                        : isUnread
                                        ? 'Đánh dấu đã đọc'
                                        : ''
                                    }
                                    aria-label={
                                      isMarkingAsRead
                                        ? 'Đang đánh dấu...'
                                        : isUnread
                                        ? 'Đánh dấu đã đọc'
                                        : ''
                                    }
                                    aria-hidden={!isUnread && !isMarkingAsRead}
                                  >
                                    <Check
                                      className={`w-4 h-4 flex-shrink-0 ${
                                        isMarkingAsRead ? 'checkmark-reading' : ''
                                      }`}
                                    />
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDeleteNotification(notification.id);
                                    }}
                                    className='w-7 h-7 p-1.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0'
                                    title='Xóa thông báo'
                                    aria-label='Xóa thông báo'
                                  >
                                    <Trash2 className='w-4 h-4 flex-shrink-0' />
                                  </button>
                                </div>
                              </div>
                              {/* Time */}
                              <div className='absolute bottom-0 right-0'>
                                <span className='text-[10px] font-heading font-medium text-gray-400 dark:text-gray-500'>
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      }

                      // Normal items use stagger animation
                      return (
                        <motion.div
                          key={notification.id}
                          variants={itemVariants}
                          initial='hidden'
                          animate='visible'
                          exit='exit'
                          onClick={handleNotificationClick}
                          className={`group relative pl-16 pr-5 py-4 cursor-pointer notification-item-transition ${
                            isUnread && !isMarkingAsRead
                              ? 'bg-orange-50 dark:bg-orange-900/20'
                              : isMarkingAsRead && markingAllAsRead
                              ? 'bg-white dark:bg-gray-900/95' // Transitioning to read state
                              : isMarkingAsRead
                              ? 'bg-orange-50/50 dark:bg-orange-900/10'
                              : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900/95'
                          } ${index === 0 ? 'pt-4' : ''} ${
                            markingAllAsRead && isUnread && unreadIndex >= 0
                              ? 'mark-all-as-read-animation'
                              : ''
                          }`}
                          style={
                            markingAllAsRead && isUnread && unreadIndex >= 0
                              ? {
                                  animationDelay: `${staggerDelay}ms`,
                                }
                              : undefined
                          }
                        >
                          {/* Border left - always present to prevent layout shift */}
                          <div
                            className={`absolute left-0 top-0 bottom-0 w-[3px] notification-border-transition ${
                              isUnread && !isMarkingAsRead
                                ? 'bg-orange-500 dark:bg-orange-400'
                                : isMarkingAsRead && markingAllAsRead
                                ? 'bg-transparent' // Fade to transparent when marking all
                                : isMarkingAsRead
                                ? 'bg-orange-400/60 dark:bg-orange-500/50'
                                : 'bg-transparent'
                            }`}
                            style={
                              markingAllAsRead && isUnread && unreadIndex >= 0
                                ? {
                                    animation: 'border-fade-out 0.65s ease-in-out forwards',
                                    animationDelay: `${staggerDelay}ms`,
                                  }
                                : undefined
                            }
                          />
                          {/* Shadow/Ring overlay - always present to prevent layout shift, fade out smoothly */}
                          <div
                            className={`absolute inset-0 pointer-events-none notification-shadow-transition ${
                              isUnread && !isMarkingAsRead
                                ? 'shadow-sm ring-1 ring-orange-200 dark:ring-orange-500/20 opacity-100'
                                : 'opacity-0'
                            }`}
                            style={
                              markingAllAsRead && isUnread && unreadIndex >= 0
                                ? {
                                    animation: 'shadow-fade-out 0.5s ease-in-out forwards',
                                    animationDelay: `${staggerDelay}ms`,
                                  }
                                : undefined
                            }
                          />
                          {/* Icon - positioned at center left, z-index to stay above overlay */}
                          <div className='absolute left-5 top-1/2 -translate-y-1/2 flex items-center justify-center z-10'>
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Content - z-index to stay above overlay */}
                          <div className='flex-1 min-w-0 relative z-10'>
                            <div className='flex items-start justify-between gap-3'>
                              <div className='flex-1 min-w-0'>
                                <h4
                                  className={`text-theme-sm font-heading font-semibold ${colors.text} mb-1.5 leading-tight tracking-tight`}
                                >
                                  {notification.title}
                                </h4>
                                <p className='text-theme-xs font-heading text-gray-600 dark:text-gray-300 leading-relaxed mb-2'>
                                  {renderMessageWithBadge(notification)}
                                </p>
                              </div>

                              {/* Actions - fixed width container to prevent layout shift */}
                              <div className='flex items-start gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-[56px]'>
                                {/* Mark as read button - always present with fixed size to prevent layout shift */}
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (isUnread || isMarkingAsRead) {
                                      handleMarkAsRead(notification.id);
                                    }
                                  }}
                                  disabled={(!isUnread && !isMarkingAsRead) || isMarkingAsRead}
                                  className={`w-7 h-7 p-1.5 rounded-lg transition-all duration-300 active:scale-95 flex items-center justify-center flex-shrink-0 ${
                                    isUnread || isMarkingAsRead
                                      ? 'text-gray-400 hover:text-success-600 dark:hover:text-success-400 hover:bg-success-50 dark:hover:bg-success-500/10 opacity-100 pointer-events-auto cursor-pointer'
                                      : 'text-gray-400 opacity-0 pointer-events-none cursor-default'
                                  } ${
                                    isMarkingAsRead
                                      ? 'disabled:opacity-50 disabled:cursor-not-allowed'
                                      : ''
                                  }`}
                                  title={
                                    isMarkingAsRead
                                      ? 'Đang đánh dấu...'
                                      : isUnread
                                      ? 'Đánh dấu đã đọc'
                                      : ''
                                  }
                                  aria-label={
                                    isMarkingAsRead
                                      ? 'Đang đánh dấu...'
                                      : isUnread
                                      ? 'Đánh dấu đã đọc'
                                      : ''
                                  }
                                  aria-hidden={!isUnread && !isMarkingAsRead}
                                >
                                  <Check
                                    className={`w-4 h-4 flex-shrink-0 ${
                                      isMarkingAsRead ? 'checkmark-reading' : ''
                                    }`}
                                  />
                                </button>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id);
                                  }}
                                  className='w-7 h-7 p-1.5 text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center flex-shrink-0'
                                  title='Xóa thông báo'
                                  aria-label='Xóa thông báo'
                                >
                                  <Trash2 className='w-4 h-4 flex-shrink-0' />
                                </button>
                              </div>
                            </div>
                            {/* Time - positioned at bottom right */}
                            <div className='absolute bottom-0 right-0'>
                              <span className='text-[10px] font-heading font-medium text-gray-400 dark:text-gray-500'>
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Footer */}
            {Array.isArray(notifications) && notifications.length > 0 && (
              <div className='px-5 py-3 border-t border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900/95'>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navigate to full notifications page
                    window.location.href = '/notifications';
                  }}
                  className='w-full text-center text-theme-xs font-heading font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-all duration-200 py-2.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 active:scale-[0.98]'
                >
                  Xem tất cả thông báo →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
