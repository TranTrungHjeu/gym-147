/**
 * EXAMPLE: Notification Dropdown với Framer Motion Animations
 * 
 * File này chứa các ví dụ về cách implement animations cho notification dropdown
 * Sử dụng Framer Motion (đã có sẵn trong dự án)
 * 
 * Các animation được đề xuất:
 * 1. Dropdown container: Slide down + fade
 * 2. Notification items: Stagger animation
 * 3. New notification: Slide in + bounce
 * 4. Mark as read: Fade background
 * 5. Delete: Slide out + fade
 * 6. Unread badge: Pulse
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2 } from 'lucide-react';

// ============================================
// 1. DROPDOWN CONTAINER ANIMATION
// ============================================
export const DropdownContainerExample = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-0 mt-2.5 w-[420px] bg-white dark:bg-gray-900/95 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-800/80 z-50"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// 2. NOTIFICATION LIST WITH STAGGER ANIMATION
// ============================================
export const NotificationListExample = ({ notifications }: { notifications: any[] }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // Delay giữa các item
        delayChildren: 0.1, // Delay trước khi bắt đầu
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-h-[480px] overflow-y-auto"
    >
      {notifications.map((notification) => (
        <motion.div
          key={notification.id}
          variants={itemVariants}
          className="p-4 border-b border-gray-200 dark:border-gray-800"
        >
          {/* Notification content */}
        </motion.div>
      ))}
    </motion.div>
  );
};

// ============================================
// 3. NEW NOTIFICATION ANIMATION (Real-time)
// ============================================
export const NewNotificationItemExample = ({ notification, onMarkAsRead }: { notification: any; onMarkAsRead: (id: string) => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{notification.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
        </div>
        <button
          onClick={() => onMarkAsRead(notification.id)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// 4. MARK AS READ ANIMATION
// ============================================
export const MarkAsReadExample = ({ notification, isMarkingAsRead }: { notification: any; isMarkingAsRead: boolean }) => {
  return (
    <motion.div
      animate={{
        backgroundColor: isMarkingAsRead 
          ? ['rgba(249, 115, 22, 0.1)', 'rgba(255, 255, 255, 1)'] 
          : notification.is_read 
          ? 'rgba(255, 255, 255, 1)' 
          : 'rgba(249, 115, 22, 0.1)',
        borderLeftColor: isMarkingAsRead
          ? ['rgb(249, 115, 22)', 'transparent']
          : notification.is_read
          ? 'transparent'
          : 'rgb(249, 115, 22)',
      }}
      transition={{
        duration: 0.65,
        ease: "easeInOut",
      }}
      className="p-4 border-l-4"
    >
      {/* Notification content */}
    </motion.div>
  );
};

// ============================================
// 5. DELETE NOTIFICATION ANIMATION
// ============================================
export const DeleteNotificationExample = ({ notifications, onDelete }: { notifications: any[]; onDelete: (id: string) => void }) => {
  return (
    <AnimatePresence mode="popLayout">
      {notifications.map((notification) => (
        <motion.div
          key={notification.id}
          initial={{ opacity: 1, x: 0, scale: 1, height: 'auto' }}
          exit={{
            opacity: 0,
            x: 100,
            scale: 0.8,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          transition={{
            duration: 0.3,
            ease: "easeIn",
          }}
          className="p-4 border-b border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
            </div>
            <button
              onClick={() => onDelete(notification.id)}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

// ============================================
// 6. UNREAD BADGE ANIMATION
// ============================================
export const UnreadBadgeExample = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <motion.span
      animate={{
        scale: [1, 1.1, 1],
        boxShadow: [
          '0 0 0 0 rgba(249, 115, 22, 0.8)',
          '0 0 0 8px rgba(249, 115, 22, 0)',
          '0 0 0 0 rgba(249, 115, 22, 0.8)',
        ],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
    >
      {count > 9 ? '9+' : count}
    </motion.span>
  );
};

// ============================================
// 7. EMPTY STATE ANIMATION
// ============================================
export const EmptyStateExample = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="p-12 text-center"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
      >
        <Bell className="w-9 h-9 text-gray-400 dark:text-gray-500" />
      </motion.div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        Không có thông báo nào
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Các thông báo mới sẽ hiển thị ở đây
      </p>
    </motion.div>
  );
};

// ============================================
// 8. LOADING STATE ANIMATION (Skeleton)
// ============================================
export const LoadingStateExample = () => {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
          className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"
        />
      ))}
    </div>
  );
};

// ============================================
// 9. COMPLETE EXAMPLE - Full Implementation
// ============================================
export const CompleteNotificationDropdownExample = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  // Item variants
  const itemVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      x: 100,
      scale: 0.8,
      height: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      transition: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  };

  const handleDelete = (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50"
      >
        <Bell className="w-5 h-5" />
        <UnreadBadgeExample count={notifications.filter((n) => !n.is_read).length} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2.5 w-[420px] bg-white dark:bg-gray-900/95 rounded-xl shadow-xl border border-gray-200/80 dark:border-gray-800/80 z-50"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200/80 dark:border-gray-800/80">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Thông báo</h3>
            </div>

            {/* Notifications List */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-h-[480px] overflow-y-auto"
            >
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg">
                          <Check className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// 10. ACCESSIBILITY - Respect prefers-reduced-motion
// ============================================
export const AccessibleNotificationExample = ({ children }: { children: React.ReactNode }) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Disable animations for users who prefer reduced motion
    return <div>{children}</div>;
  }

  return <motion.div>{children}</motion.div>;
};

