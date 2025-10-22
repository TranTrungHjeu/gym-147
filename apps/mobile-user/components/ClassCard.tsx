import { ClassCardProps } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { useRouter } from 'expo-router';
import { Calendar, Clock, MapPin, Star, Users } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ClassCard({
  schedule,
  onPress,
  onBook,
  onCancel,
  showBookingActions = true,
}: ClassCardProps) {
  const { theme } = useTheme();
  const router = useRouter();

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return theme.colors.success;
      case 'INTERMEDIATE':
        return theme.colors.warning;
      case 'ADVANCED':
        return theme.colors.error;
      case 'ALL_LEVELS':
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return theme.colors.primary;
      case 'IN_PROGRESS':
        return theme.colors.warning;
      case 'COMPLETED':
        return theme.colors.success;
      case 'CANCELLED':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const isFullyBooked = schedule.current_bookings >= schedule.max_capacity;
  const hasWaitlist = schedule.waitlist_count > 0;
  const spotsAvailable = schedule.max_capacity - schedule.current_bookings;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with class image and status */}
      <View style={styles.header}>
        <Image
          source={{
            uri:
              schedule.gym_class?.thumbnail ||
              'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
          }}
          style={styles.classImage}
          resizeMode="cover"
        />
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(schedule.status) },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.colors.text }]}>
            {schedule.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Class Info */}
      <View style={styles.content}>
        <View style={styles.classHeader}>
          <Text style={[styles.className, { color: theme.colors.text }]}>
            {schedule.gym_class?.name}
          </Text>
          <View
            style={[
              styles.difficultyBadge,
              {
                backgroundColor: getDifficultyColor(
                  schedule.gym_class?.difficulty || ''
                ),
              },
            ]}
          >
            <Text style={styles.difficultyText}>
              {schedule.gym_class?.difficulty}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.classDescription,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={2}
        >
          {schedule.gym_class?.description}
        </Text>

        {/* Trainer Info */}
        {schedule.trainer && (
          <View style={styles.trainerInfo}>
            <View style={styles.trainerDetails}>
              <Text style={[styles.trainerName, { color: theme.colors.text }]}>
                {schedule.trainer.full_name}
              </Text>
              {schedule.trainer.rating_average && (
                <View style={styles.ratingContainer}>
                  <Star
                    size={14}
                    color={theme.colors.warning}
                    fill={theme.colors.warning}
                  />
                  <Text
                    style={[
                      styles.ratingText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {schedule.trainer.rating_average.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Schedule Info */}
        <View style={styles.scheduleInfo}>
          <View style={styles.scheduleItem}>
            <Calendar size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {formatDate(schedule.start_time)}
            </Text>
          </View>
          <View style={styles.scheduleItem}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {formatTime(schedule.start_time)} -{' '}
              {formatTime(schedule.end_time)}
            </Text>
          </View>
          <View style={styles.scheduleItem}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.scheduleText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {schedule.room?.name}
            </Text>
          </View>
        </View>

        {/* Capacity Info */}
        <View style={styles.capacityInfo}>
          <View style={styles.capacityItem}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text
              style={[
                styles.capacityText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {schedule.current_bookings}/{schedule.max_capacity} booked
            </Text>
          </View>
          {isFullyBooked && (
            <Text
              style={[styles.waitlistText, { color: theme.colors.warning }]}
            >
              {hasWaitlist
                ? `${schedule.waitlist_count} on waitlist`
                : 'Fully booked'}
            </Text>
          )}
          {!isFullyBooked && spotsAvailable <= 5 && (
            <Text style={[styles.spotsText, { color: theme.colors.error }]}>
              Only {spotsAvailable} spots left!
            </Text>
          )}
        </View>

        {/* Price */}
        {schedule.price_override && (
          <View style={styles.priceContainer}>
            <Text style={[styles.priceText, { color: theme.colors.primary }]}>
              ${schedule.price_override}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {showBookingActions && (
        <View style={styles.actions}>
          {schedule.status === 'SCHEDULED' && !isFullyBooked && (
            <TouchableOpacity
              style={[
                styles.bookButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={onBook}
            >
              <Text
                style={[
                  styles.bookButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Book Class
              </Text>
            </TouchableOpacity>
          )}
          {schedule.status === 'SCHEDULED' && isFullyBooked && !hasWaitlist && (
            <TouchableOpacity
              style={[
                styles.waitlistButton,
                { backgroundColor: theme.colors.warning },
              ]}
              onPress={onBook}
            >
              <Text
                style={[
                  styles.waitlistButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                Join Waitlist
              </Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.colors.error }]}
              onPress={onCancel}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.error }]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    position: 'relative',
    height: 120,
  },
  classImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  className: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  classDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  trainerInfo: {
    marginBottom: 12,
  },
  trainerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  scheduleInfo: {
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 14,
    marginLeft: 8,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 14,
    marginLeft: 8,
  },
  waitlistText: {
    fontSize: 12,
    fontWeight: '500',
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  bookButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  waitlistButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  waitlistButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
