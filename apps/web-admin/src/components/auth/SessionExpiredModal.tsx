import { AlertCircle, LogIn } from 'lucide-react';
import React from 'react';
import ErrorModal from '../common/ErrorModal';
import { useNavigate } from 'react-router-dom';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate('/auth');
    }
    onClose();
  };

  return (
    <ErrorModal
      isOpen={isOpen}
      onClose={onClose}
      title='Phiên đăng nhập đã hết hạn'
      message='Phiên đăng nhập của bạn đã hết hạn vì lý do bảo mật.\n\nVui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.'
      variant='warning'
      icon={<AlertCircle className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />}
      actions={{
        primary: {
          label: 'Đăng nhập lại',
          onClick: handleLogin,
          variant: 'primary',
        },
      }}
    />
  );
};

export default SessionExpiredModal;

