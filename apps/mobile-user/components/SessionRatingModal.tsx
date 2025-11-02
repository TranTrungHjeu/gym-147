import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SessionRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => Promise<void>;
  sessionData?: {
    duration: number; // minutes
    calories: number;
  };
}

export default function SessionRatingModal({
  visible,
  onClose,
  onSubmit,
  sessionData,
}: SessionRatingModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      return; // Require rating
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating);
      setRating(0); // Reset
    } catch (error) {
      console.error('Rating submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setRating(0);
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
              {t('session.rateYourWorkout', 'Rate Your Workout')}
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {t('session.howWasYourSession', 'How was your session?')}
            </Text>
          </View>

          {/* Session Summary */}
          {sessionData && (
            <View
              style={[
                styles.summaryContainer,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <View style={styles.summaryRow}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.summaryText, { color: theme.colors.text }]}
                >
                  {Math.floor(sessionData.duration / 60)}h{' '}
                  {sessionData.duration % 60}m
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="flame-outline" size={20} color="#FF6B35" />
                <View>
                  <Text
                    style={[styles.summaryText, { color: theme.colors.text }]}
                  >
                    {sessionData.calories > 0 ? `${sessionData.calories} kcal` : t('common.calculating', 'Calculating...')}
                  </Text>
                  <Text
                    style={[
                      styles.estimatedText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t(
                      'session.estimatedCalories',
                      '(will be calculated from equipment usage)'
                    )}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Star Rating */}
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                disabled={isSubmitting}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color={star <= rating ? '#FFD700' : theme.colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Labels */}
          {rating > 0 && (
            <Text
              style={[
                styles.ratingLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {rating === 1 && t('session.ratingPoor', 'Poor')}
              {rating === 2 && t('session.ratingFair', 'Fair')}
              {rating === 3 && t('session.ratingGood', 'Good')}
              {rating === 4 && t('session.ratingVeryGood', 'Very Good')}
              {rating === 5 && t('session.ratingExcellent', 'Excellent!')}
            </Text>
          )}

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
                rating === 0 && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  estimatedText: {
    ...Typography.caption,
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 24,
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
