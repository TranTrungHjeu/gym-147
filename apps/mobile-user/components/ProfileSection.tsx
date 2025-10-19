import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Typography, TextColors } from '@/utils/typography';

interface ProfileSectionProps {
  title: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
  }[];
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ title, items }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
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
              <View style={styles.iconContainer}>{item.icon}</View>
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
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
    color: TextColors.primary,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
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
    borderBottomColor: '#F3F4F6',
  },
  itemLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemLabel: {
    ...Typography.bodyMedium,
    color: TextColors.primary,
  },
});

export default ProfileSection;
