import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ClassRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: {
    class_rating: number;
    trainer_rating?: number | null;
    feedback_notes?: string | null;
  }) => Promise<void> | void;
  className?: string;
  trainerName?: string;
  existingRating?: {
    class_rating?: number | null;
    trainer_rating?: number | null;
    feedback_notes?: string | null;
  };
}

export default function ClassRatingModal({
  visible,
  onClose,
  onSubmit,
  className,
  trainerName,
  existingRating,
}: ClassRatingModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [classRating, setClassRating] = useState(0);
  const [trainerRating, setTrainerRating] = useState(0);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with existing rating if provided
  useEffect(() => {
    if (visible && existingRating) {
      setClassRating(existingRating.class_rating || 0);
      setTrainerRating(existingRating.trainer_rating || 0);
      setFeedbackNotes(existingRating.feedback_notes || '');
    } else if (visible) {
      // Reset when modal opens without existing rating
      setClassRating(0);
      setTrainerRating(0);
      setFeedbackNotes('');
    }
  }, [visible, existingRating]);

  const handleSubmit = async () => {
    if (classRating === 0) {
      return; // Require class rating
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        class_rating: classRating,
        trainer_rating: trainerRating > 0 ? trainerRating : null,
        feedback_notes: feedbackNotes.trim() || null,
      });
      // Reset after successful submit (unless existingRating is provided, then keep it)
      if (!existingRating) {
        setClassRating(0);
        setTrainerRating(0);
        setFeedbackNotes('');
      }
    } catch (error) {
      console.error('Rating submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (!existingRating) {
      setClassRating(0);
      setTrainerRating(0);
      setFeedbackNotes('');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.container, { backgroundColor: theme.colors.surface }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {t('classes.rating.rateYourClass', 'Rate Your Class')}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {t('classes.rating.howWasYourClass', 'How was your class experience?')}
            </Text>
          </View>

          {/* Class Info */}
          {(className || trainerName) && (
            <View
              style={[
                styles.infoContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              {className && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="fitness-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.infoText, { color: theme.colors.text }]}
                  >
                    {className}
                  </Text>
                </View>
              )}
              {trainerName && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.infoText, { color: theme.colors.text }]}
                  >
                    {trainerName}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Class Rating */}
          <View style={styles.ratingSection}>
            <Text style={[styles.ratingLabel, { color: theme.colors.text }]}>
              {t('classes.rating.rateClass', 'Rate the Class')}
            </Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setClassRating(star)}
                  disabled={isSubmitting}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= classRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= classRating ? '#FFD700' : theme.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {classRating > 0 && (
              <Text
                style={[
                  styles.ratingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {classRating === 1 && t('classes.rating.poor', 'Poor')}
                {classRating === 2 && t('classes.rating.fair', 'Fair')}
                {classRating === 3 && t('classes.rating.good', 'Good')}
                {classRating === 4 && t('classes.rating.veryGood', 'Very Good')}
                {classRating === 5 && t('classes.rating.excellent', 'Excellent!')}
              </Text>
            )}
          </View>

          {/* Trainer Rating (Optional) */}
          {trainerName && (
            <View style={styles.ratingSection}>
              <Text style={[styles.ratingLabel, { color: theme.colors.text }]}>
                {t('classes.rating.rateTrainer', 'Rate the Trainer')} ({t('common.optional', 'Optional')})
              </Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setTrainerRating(star)}
                    disabled={isSubmitting}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= trainerRating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= trainerRating ? '#FFD700' : theme.colors.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Feedback Notes (Optional) */}
          <View style={styles.feedbackSection}>
            <Text style={[styles.feedbackLabel, { color: theme.colors.text }]}>
              {t('classes.rating.feedback', 'Feedback')} ({t('common.optional', 'Optional')})
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder={t('classes.rating.feedbackPlaceholder', 'Share your thoughts...')}
              placeholderTextColor={theme.colors.textSecondary}
              value={feedbackNotes}
              onChangeText={setFeedbackNotes}
              multiline
              numberOfLines={3}
              editable={!isSubmitting}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.skipButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={handleSkip}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.skipButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('common.skip', 'Skip')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                classRating === 0 && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={classRating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  {t('common.submit', 'Submit')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    ...Typography.h3,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.bodyMedium,
    textAlign: 'center',
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    fontWeight: '600',
  },
  feedbackSection: {
    marginBottom: 24,
  },
  feedbackLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    borderWidth: 1.5,
  },
  submitButton: {},
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...Typography.buttonMedium,
    fontWeight: '600',
  },
  skipButtonText: {},
  submitButtonText: {
    color: '#FFFFFF',
  },
});

