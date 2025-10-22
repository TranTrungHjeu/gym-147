import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

interface TextAreaProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: any;
  inputStyle?: any;
  rows?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  rows = 4,
  ...textInputProps
}) => {
  const { theme } = useTheme();

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (textInputProps.editable === false) return theme.colors.border;
    return theme.colors.border;
  };

  const getBackgroundColor = () => {
    if (textInputProps.editable === false) return theme.colors.surface;
    return theme.colors.surface;
  };

  const minHeight = rows * 20 + 24; // Approximate height based on rows

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}

      <TextInput
        style={[
          styles.textArea,
          {
            color: theme.colors.text,
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
            minHeight,
          },
          inputStyle,
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        textAlignVertical="top"
        {...textInputProps}
      />

      {error && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      {helperText && !error && (
        <Text
          style={[styles.helperText, { color: theme.colors.textSecondary }]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  errorText: {
    ...Typography.caption,
    marginTop: 4,
  },
  helperText: {
    ...Typography.caption,
    marginTop: 4,
  },
});

export default TextArea;
