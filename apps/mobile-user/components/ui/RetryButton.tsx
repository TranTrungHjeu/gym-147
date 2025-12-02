import { Button } from './Button';
import { useTheme } from '@/utils/theme';
import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface RetryButtonProps {
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onPress,
  loading = false,
  variant = 'outline',
  size = 'medium',
  fullWidth = false,
}) => {
  const { t } = useTranslation();

  return (
    <Button
      title={t('common.retry', { defaultValue: 'Thử lại' })}
      onPress={onPress}
      loading={loading}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
    />
  );
};

export default RetryButton;

