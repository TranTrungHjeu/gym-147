import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AIWorkoutPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (customPrompt: string) => void;
  generating?: boolean;
}

const { width } = Dimensions.get('window');

export const AIWorkoutPromptModal: React.FC<AIWorkoutPromptModalProps> = ({
  visible,
  onClose,
  onGenerate,
  generating = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [customPrompt, setCustomPrompt] = useState('');

  const handleGenerate = () => {
    if (!generating && customPrompt.trim()) {
      onGenerate(customPrompt.trim());
      setCustomPrompt(''); // Clear after generating
    }
  };

  const handleClose = () => {
    if (!generating) {
      setCustomPrompt('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.surface,
                  paddingBottom: Math.max(insets.bottom, 24),
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: theme.colors.primary + '15' },
                      ]}
                    >
                      <Sparkles size={24} color={theme.colors.primary} />
                    </View>
                    <Text
                      style={[
                        styles.title,
                        { color: theme.colors.text },
                        Typography.h4,
                      ]}
                    >
                      {t('workouts.aiWorkoutPrompt.title')}
                    </Text>
                  </View>
                  {!generating && (
                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.closeButton}
                    >
                      <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description */}
                <Text
                  style={[
                    styles.description,
                    { color: theme.colors.textSecondary },
                    Typography.bodyRegular,
                  ]}
                >
                  {t('workouts.aiWorkoutPrompt.description')}
                </Text>

                {/* Examples */}
                <View style={styles.examplesContainer}>
                  <Text
                    style={[
                      styles.examplesTitle,
                      { color: theme.colors.text },
                      Typography.bodySmall,
                    ]}
                  >
                    {t('workouts.aiWorkoutPrompt.examples')}
                  </Text>
                  <View style={styles.examplesList}>
                    {[
                      t('workouts.aiWorkoutPrompt.example1'),
                      t('workouts.aiWorkoutPrompt.example2'),
                      t('workouts.aiWorkoutPrompt.example3'),
                    ].map((example, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.exampleButton,
                          {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setCustomPrompt(example)}
                        disabled={generating}
                      >
                        <Text
                          style={[
                            styles.exampleText,
                            { color: theme.colors.textSecondary },
                            Typography.caption,
                          ]}
                        >
                          {example}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Input */}
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      },
                      Typography.bodyRegular,
                    ]}
                    placeholder={t('workouts.aiWorkoutPrompt.placeholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={customPrompt}
                    onChangeText={setCustomPrompt}
                    multiline
                    numberOfLines={4}
                    editable={!generating}
                    autoFocus
                  />
                  <Text
                    style={[
                      styles.inputHint,
                      { color: theme.colors.textSecondary },
                      Typography.caption,
                    ]}
                  >
                    {t('workouts.aiWorkoutPrompt.hint')}
                  </Text>
                </View>
              </ScrollView>

              {/* Actions - Fixed at bottom */}
              <View style={[styles.actions, { marginBottom: 0 }]}>
                {!generating && (
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        backgroundColor: theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={handleClose}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: theme.colors.text },
                        Typography.bodyMedium,
                      ]}
                    >
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    {
                      backgroundColor:
                        customPrompt.trim() && !generating
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                    !generating && styles.generateButtonFlex,
                  ]}
                  onPress={handleGenerate}
                  disabled={!customPrompt.trim() || generating}
                >
                  {generating ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.generateButtonText,
                        { color: theme.colors.textInverse },
                        Typography.bodyMedium,
                      ]}
                    >
                      {t('workouts.aiWorkoutPrompt.generate')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 600,
    padding: 24,
    paddingTop: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  description: {
    marginBottom: 20,
    lineHeight: 20,
  },
  examplesContainer: {
    marginBottom: 20,
  },
  examplesTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  examplesList: {
    gap: 8,
  },
  exampleButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  exampleText: {
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 22,
  },
  inputHint: {
    marginTop: 8,
    opacity: 0.7,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  generateButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  generateButtonFlex: {
    flex: 1,
  },
  generateButtonText: {
    fontWeight: '600',
  },
});
