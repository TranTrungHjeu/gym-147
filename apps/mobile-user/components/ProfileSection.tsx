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
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: theme.colors.surface,
            shadowColor: theme.colors.text,
          },
        ]}
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.itemContainer,
              index < items.length - 1 && styles.itemBorder,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.itemLeftContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.gray },
                ]}
              >
                {item.icon}
              </View>
              <Text style={[styles.itemLabel, { color: theme.colors.text }]}>
                {item.label}
              </Text>
            </View>
            <View style={styles.itemRightContent}>
              {item.badge && item.badge > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.error },
                  ]}
                >
                  <Text
                    style={[styles.badgeText, { color: theme.colors.surface }]}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
              <ChevronRight size={20} color={theme.colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.h6,
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  itemLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemLabel: {
    ...Typography.bodyMedium,
  },
  itemRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProfileSection;
