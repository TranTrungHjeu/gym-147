import { IssueType, Severity } from '@/types/equipmentTypes';
import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Camera, X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { memberService } from '@/services/member/member.service';

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
  const [images, setImages] = useState<Array<{ uri: string; uploaded?: boolean; url?: string; base64?: string }>>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const issueTypes = Object.values(IssueType);
  const severities = Object.values(Severity);

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('registration.permissionRequired') || 'Permission to access camera roll is required!'
        );
        return;
      }

      // Launch image picker with base64
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          uploaded: false,
          base64: asset.base64,
        }));
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Permission to access camera is required!'
        );
        return;
      }

      // Launch camera with base64
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newImage = {
          uri: asset.uri,
          uploaded: false,
          base64: asset.base64,
        };
        setImages(prev => [...prev, newImage]);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert(t('common.error'), error.message || 'Failed to take photo');
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const image of images) {
        if (image.uploaded && image.url) {
          uploadedUrls.push(image.url);
          continue;
        }

        // Use base64 from ImagePicker if available
        let base64 = image.base64;
        
        // If base64 not available, try to read from file
        if (!base64) {
          try {
            // For React Native, use expo-file-system if available
            const FileSystem = require('expo-file-system');
            base64 = await FileSystem.readAsStringAsync(image.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (readError) {
            console.error('Error reading image file:', readError);
            continue; // Skip this image
          }
        }

        if (!base64) {
          console.error('No base64 data available for image');
          continue;
        }

        // Upload to backend
        const uploadResult = await memberService.uploadAvatar(
          base64,
          'image/jpeg',
          `equipment-issue-${Date.now()}.jpg`
        );

        if (uploadResult.success && uploadResult.data?.profile_photo) {
          uploadedUrls.push(uploadResult.data.profile_photo);
        } else {
          console.error('Failed to upload image:', uploadResult.error);
        }
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      throw new Error(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(
        t('common.error'),
        t('equipment.issue.description') + ' is required'
      );
      return;
    }

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      onSubmit({
        issue_type: issueType,
        description: description.trim(),
        severity,
        images: imageUrls,
      });

      // Reset form
      setIssueType(IssueType.OTHER);
      setDescription('');
      setSeverity(Severity.MEDIUM);
      setImages([]);
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || 'Failed to upload images. Please try again.'
      );
    }
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

            {/* Photos */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                {t('equipment.issue.addPhotos')} ({t('common.optional')})
              </Text>
              
              {/* Image Preview Grid */}
              {images.length > 0 && (
                <View style={styles.imageGrid}>
                  {images.map((image, index) => (
                    <View key={index} style={styles.imagePreviewContainer}>
                      <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={[styles.removeImageButton, { backgroundColor: theme.colors.error }]}
                        onPress={() => removeImage(index)}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Photo Buttons */}
              <View style={styles.photoButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.photoButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={pickImage}
                  disabled={uploadingImages}
                >
                  <ImageIcon size={20} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.photoButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('common.selectFromGallery') || 'Gallery'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.photoButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      flex: 1,
                    },
                  ]}
                  onPress={takePhoto}
                  disabled={uploadingImages}
                >
                  <Camera size={20} color={theme.colors.textSecondary} />
                  <Text
                    style={[
                      styles.photoButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('common.takePhoto') || 'Camera'}
                  </Text>
                </TouchableOpacity>
              </View>
              {uploadingImages && (
                <Text style={[styles.uploadingText, { color: theme.colors.textSecondary }]}>
                  {t('common.uploading') || 'Uploading images...'}
                </Text>
              )}
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
                uploadingImages && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={uploadingImages}
            >
              <Text style={styles.submitButtonText}>
                {uploadingImages
                  ? t('common.uploading') || 'Uploading...'
                  : t('equipment.issue.submit')}
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
  photoButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoButtonText: {
    ...Typography.bodySmall,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    ...Typography.bodySmall,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
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
