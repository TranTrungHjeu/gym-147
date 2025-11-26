import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
  iconColor?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  iconSize = 64,
  iconColor,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const themedStyles = styles(theme);
  const finalIconColor = iconColor || theme.colors.textSecondary;

  return (
    <View style={themedStyles.container}>
      {Icon && (
        <View style={themedStyles.iconContainer}>
          <Icon size={iconSize} color={finalIconColor} strokeWidth={1.5} />
        </View>
      )}
      
      {title && (
        <Text style={[themedStyles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      )}
      
      {description && (
        <Text
          style={[
            themedStyles.description,
            { color: theme.colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      )}

      {onAction && actionLabel && (
        <TouchableOpacity
          style={[
            themedStyles.actionButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text
            style={[
              themedStyles.actionButtonText,
              { color: theme.colors.textInverse },
            ]}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 200,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
      opacity: 0.6,
    },
    title: {
      ...Typography.h5,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    description: {
      ...Typography.bodyMedium,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
      maxWidth: 280,
    },
    actionButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      minWidth: 160,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    actionButtonText: {
      ...Typography.buttonMedium,
    },
  });

export default EmptyState;

