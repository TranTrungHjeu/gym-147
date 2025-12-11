import { AlertCircle, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface AccountDeletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  deletedBy?: 'admin' | 'self';
  reason?: string;
}

const AccountDeletedModal: React.FC<AccountDeletedModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  deletedBy = 'admin',
  reason,
}) => {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const getMessage = () => {
    if (deletedBy === 'admin') {
      return reason
        ? `Tài khoản của bạn đã bị xóa bởi quản trị viên.\n\nLý do: ${reason}\n\nVui lòng đăng xuất và liên hệ với quản trị viên nếu bạn có thắc mắc.`
        : 'Tài khoản của bạn đã bị xóa bởi quản trị viên. Vui lòng đăng xuất và liên hệ với quản trị viên nếu bạn có thắc mắc.';
    }
    return 'Tài khoản của bạn đã được xóa thành công. Vui lòng đăng xuất để hoàn tất.';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-none'>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm pointer-events-auto'
            onClick={handleLogout}
          />

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
            className='relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-red-200 dark:border-red-800 max-w-md w-full z-10 pointer-events-auto'
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className='bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-b border-red-200 dark:border-red-800 px-6 py-4 rounded-t-2xl'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-center gap-3 flex-1'>
                  <div className='w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0'>
                    <AlertCircle className='w-6 h-6 text-red-600 dark:text-red-400' />
                  </div>
                  <div className='flex-1'>
                    <h3 className='text-lg font-semibold font-heading text-gray-900 dark:text-white mb-1'>
                      Tài khoản đã bị xóa
                    </h3>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      {deletedBy === 'admin' ? 'Xóa bởi quản trị viên' : 'Xóa bởi chính bạn'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className='p-6'>
              <div className='mb-6'>
                <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line'>
                  {getMessage()}
                </p>
              </div>

              {/* Support Info */}
              <div className='mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700'>
                <div className='flex items-start gap-3'>
                  <AlertCircle className='w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <p className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                      Cần hỗ trợ?
                    </p>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Liên hệ với chúng tôi qua email:{' '}
                      <a
                        href='mailto:support@gym147.vn'
                        className='text-orange-600 dark:text-orange-400 hover:underline'
                      >
                        support@gym147.vn
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='flex justify-end'>
                <button
                  onClick={handleLogout}
                  className='inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold font-heading text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200'
                >
                  <LogOut className='w-4 h-4' />
                  Đăng xuất
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AccountDeletedModal;
