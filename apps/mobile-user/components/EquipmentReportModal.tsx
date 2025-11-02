import { IssueType, Severity } from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Camera, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface EquipmentReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    issue_type: IssueType;
    description: string;
    severity: Severity;
    images?: string[];
  }) => void;
  equipmentName?: string;
}

export default function EquipmentReportModal({
  visible,
  onClose,
  onSubmit,
  equipmentName,
}: EquipmentReportModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [issueType, setIssueType] = useState<IssueType>(IssueType.OTHER);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>(Severity.MEDIUM);

  const issueTypes = Object.values(IssueType);
  const severities = Object.values(Severity);

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert(
        t('common.error'),
        t('equipment.issue.description') + ' is required'
      );
      return;
    }

    onSubmit({
      issue_type: issueType,
      description: description.trim(),
      severity,
    });

    // Reset form
    setIssueType(IssueType.OTHER);
    setDescription('');
    setSeverity(Severity.MEDIUM);
    onClose();
  };

  const getSeverityColor = (sev: Severity) => {
    switch (sev) {
      case Severity.LOW:
        return theme.colors.success;
      case Severity.MEDIUM:
        return theme.colors.warning;
      case Severity.HIGH:
        return '#FF6B35';
      case Severity.CRITICAL:
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modal, { backgroundColor: theme.colors.background }]}
        >
          <View
            style={[styles.header, { borderBottomColor: theme.colors.border }]}
          >
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {t('equipment.issue.reportIssue')}
              </Text>
              {equipmentName && (
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {equipmentName}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Issue Type */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('equipment.issue.issueType')} *
              </Text>
              <View style={styles.chipContainer}>
                {issueTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          issueType === type
                            ? theme.colors.primary
                            : theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setIssueType(type)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            issueType === type
                              ? '#fff'
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t(
                        `equipment.issue.types.${type
                          .toLowerCase()
                          .replaceAll('_', '')}`,
                        type
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('equipment.issue.description')} *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={t('equipment.notesPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Severity */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('equipment.issue.severityLabel')} *
              </Text>
              <View style={styles.chipContainer}>
                {severities.map((sev) => (
                  <TouchableOpacity
                    key={sev}
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          severity === sev
                            ? getSeverityColor(sev)
                            : theme.colors.surface,
                        borderColor:
                          severity === sev
                            ? getSeverityColor(sev)
                            : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSeverity(sev)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            severity === sev
                              ? '#fff'
                              : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t(
                        `equipment.issue.severities.${sev.toLowerCase()}`,
                        sev
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Photos (Optional - for future implementation) */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('equipment.issue.addPhotos')} ({t('common.optional')})
              </Text>
              <TouchableOpacity
                style={[
                  styles.photoButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => {
                  Alert.alert(
                    t('common.comingSoon'),
                    'Photo upload will be available soon!'
                  );
                }}
              >
                <Camera size={24} color={theme.colors.textSecondary} />
                <Text
                  style={[
                    styles.photoButtonText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t('equipment.issue.addPhotos')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View
            style={[styles.footer, { borderTopColor: theme.colors.border }]}
          >
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.colors.border },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.cancelButtonText, { color: theme.colors.text }]}
              >
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>
                {t('equipment.issue.submit')}
              </Text>
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
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    ...Typography.h5,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    ...Typography.h6,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    ...Typography.bodyMedium,
    minHeight: 120,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoButtonText: {
    ...Typography.bodyMedium,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  submitButton: {},
  submitButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: '#fff',
  },
});
