import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { ChevronRight, Clock, Dumbbell } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WorkoutCardProps {
  title: string;
  duration: string;
  exercises: number;
  image: string;
  onPress?: () => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({
  title,
  duration,
  exercises,
  image,
  onPress,
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={{ uri: image }} style={styles.image} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textInverse }]}>
            {title}
          </Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Clock size={14} color={theme.colors.textInverse} />
              <Text
                style={[styles.detailText, { color: theme.colors.textInverse }]}
              >
                {duration}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Dumbbell size={14} color={theme.colors.textInverse} />
              <Text
                style={[styles.detailText, { color: theme.colors.textInverse }]}
              >
                {exercises} exercises
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          <ChevronRight size={20} color={theme.colors.textInverse} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 160,
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  title: {
    ...Typography.h4,
    marginBottom: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    ...Typography.bodySmallMedium,
    marginLeft: 4,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WorkoutCard;
