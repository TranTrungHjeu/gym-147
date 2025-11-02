import { useTheme } from '@/utils/theme';
import { FontFamily, Typography } from '@/utils/typography';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  ...textInputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          secureTextEntry={isPassword && !isPasswordVisible}
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          {...textInputProps}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <EyeOff size={20} color={theme.colors.textSecondary} />
            ) : (
              <Eye size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
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
    ...Typography.bodySmallMedium,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    padding: 0,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorText: {
    ...Typography.caption,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default AuthInput;
