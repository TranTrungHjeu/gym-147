import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileSectionProps {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
    badge?: number;
  }[];
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, items }) => {
  const { theme } = useTheme();
  const themedStyles = styles(theme);

  return (
    <View style={themedStyles.container}>
      <Text style={[Typography.h6, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View style={themedStyles.sectionContent}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              themedStyles.itemContainer,
              index < items.length - 1 && themedStyles.itemBorder,
            ]}
            onPress={item.onPress}
          >
            <View style={themedStyles.itemLeftContent}>
              <View style={themedStyles.iconContainer}>{item.icon}</View>
              <Text
                style={[
                  Typography.bodyMedium,
                  { color: theme.colors.text },
                ]}
              >
                {item.label}
              </Text>
            </View>
            <View style={themedStyles.itemRightContent}>
              {item.badge && item.badge > 0 && (
                <View style={themedStyles.badge}>
                  <Text
                    style={[
                      Typography.caption,
                      { color: theme.colors.textInverse, fontWeight: '600' },
                    ]}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
    },
    sectionContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    itemLeftContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemRightContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: theme.radius.full,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xs,
      backgroundColor: theme.colors.error,
    },
  });

export default ProfileSection;
