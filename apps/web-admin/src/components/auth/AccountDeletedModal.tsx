import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface AccountDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const AccountDeletedModal: React.FC<AccountDeletedModalProps> = ({
  isOpen,
  onClose,
  onLogout,
}) => {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none'>
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
            }}
            className='relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full p-5 z-10 pointer-events-auto'
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleLogout}
              className='absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200'
              aria-label='Đóng'
            >
              <X className='w-4 h-4' />
            </button>

            {/* Icon */}
            <div className='flex justify-center mb-3'>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className='w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center'
              >
                <AlertCircle className='w-7 h-7 text-red-600 dark:text-red-400' />
              </motion.div>
            </div>

            {/* Title */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className='text-lg font-semibold text-gray-900 dark:text-white text-center mb-2'
            >
              Tài khoản đã bị xóa
            </motion.h3>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className='text-sm text-gray-600 dark:text-gray-300 text-center mb-5 leading-relaxed'
            >
              Tài khoản của bạn đã bị xóa bởi quản trị viên. Vui lòng đăng xuất và liên hệ với quản trị viên nếu bạn có thắc mắc.
            </motion.p>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className='flex justify-center'
            >
              <button
                onClick={handleLogout}
                className='px-5 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2'
              >
                Đăng xuất
              </button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AccountDeletedModal;























