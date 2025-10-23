import { BookingModalProps, CreateBookingRequest } from '@/types/classTypes';
import { useTheme } from '@/utils/theme';
import { Calendar, Clock, MapPin, Star, Users, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BookingModal({
  visible,
  schedule,
  onClose,
  onConfirm,
  loading = false,
}: BookingModalProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [notes, setNotes] = useState('');

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString(i18n.language, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleConfirm = () => {
    if (!schedule) return;

    const bookingData: CreateBookingRequest = {
      schedule_id: schedule.id,
      special_needs: specialNeeds.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onConfirm(bookingData);
  };

  const handleClose = () => {
    setSpecialNeeds('');
    setNotes('');
    onClose();
  };

  const isFullyBooked = schedule.current_bookings >= schedule.max_capacity;
  const spotsAvailable = schedule.max_capacity - schedule.current_bookings;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: theme.colors.border }]}
        >
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {isFullyBooked ? 'Join Waitlist' : 'Book Class'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={loading}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Class Info */}
          <View style={styles.classInfo}>
            <Image
              source={{
                uri:
                  schedule.gym_class?.thumbnail ||
                  'https://images.pexels.com/photos/1229356/pexels-photo-1229356.jpeg?auto=compress&cs=tinysrgb&w=800',
              }}
              style={styles.classImage}
              resizeMode="cover"
            />
            <View style={styles.classDetails}>
              <Text style={[styles.className, { color: theme.colors.text }]}>
                {schedule.gym_class?.name}
              </Text>
              <Text
                style={[
                  styles.classCategory,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {schedule.gym_class?.category}
              </Text>
              <Text
                style={[
                  styles.classDuration,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {schedule.gym_class?.duration} {t('classes.minutes')}
              </Text>
            </View>
          </View>

          {/* Schedule Details */}
          <View style={styles.scheduleDetails}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('classes.classDetails')}
            </Text>

            <View style={styles.detailRow}>
              <Calendar size={20} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                {formatDate(schedule.start_time)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Clock size={20} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                {formatTime(schedule.start_time)} -{' '}
                {formatTime(schedule.end_time)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                {schedule.room?.name}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Users size={20} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                {schedule.current_bookings}/{schedule.max_capacity} booked
                {!isFullyBooked && ` (${spotsAvailable} spots available)`}
              </Text>
            </View>
          </View>

          {/* Trainer Info */}
          {schedule.trainer && (
            <View style={styles.trainerInfo}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Trainer
              </Text>
              <View style={styles.trainerDetails}>
                <View style={styles.trainerInfo}>
                  <Text
                    style={[styles.trainerName, { color: theme.colors.text }]}
                  >
                    {schedule.trainer.full_name}
                  </Text>
                  <Text
                    style={[
                      styles.trainerBio,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {schedule.trainer.bio}
                  </Text>
                  {schedule.trainer.rating_average && (
                    <View style={styles.ratingContainer}>
                      <Star
                        size={16}
                        color={theme.colors.warning}
                        fill={theme.colors.warning}
                      />
                      <Text
                        style={[
                          styles.ratingText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {schedule.trainer.rating_average.toFixed(1)} (
                        {schedule.trainer.total_classes} {t('classes.classes')})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Special Requirements */}
          <View style={styles.requirementsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('classes.specialRequirements')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t('classes.specialNeedsPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={specialNeeds}
              onChangeText={setSpecialNeeds}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Additional Notes */}
          <View style={styles.notesSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('classes.additionalNotes')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder={t('classes.additionalNotesPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Booking Terms */}
          <View style={styles.termsSection}>
            <Text
              style={[styles.termsText, { color: theme.colors.textSecondary }]}
            >
              {t('classes.bookingTerms')}
              {isFullyBooked && ` ${t('classes.waitlistNotice')}`}
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text
              style={[styles.cancelButtonText, { color: theme.colors.text }]}
            >
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                color={theme.colors.textInverse}
                size="small"
              />
            ) : (
              <Text
                style={[
                  styles.confirmButtonText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {isFullyBooked
                  ? t('classes.joinWaitlist')
                  : t('classes.booking.book')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  classInfo: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 24,
  },
  classImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  classDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  classCategory: {
    fontSize: 14,
    marginBottom: 2,
  },
  classDuration: {
    fontSize: 14,
  },
  scheduleDetails: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 12,
  },
  trainerInfo: {
    marginBottom: 24,
  },
  trainerDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  trainerBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  requirementsSection: {
    marginBottom: 20,
  },
  notesSection: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  termsSection: {
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
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
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
