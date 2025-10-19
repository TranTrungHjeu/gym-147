import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Typography, FontFamily, TextColors } from '@/utils/typography';

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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[styles.inputContainer, error && styles.inputContainerError]}
      >
        {icon && <View style={styles.iconContainer}>{icon}</View>}

        <TextInput
          style={styles.input}
          secureTextEntry={isPassword && !isPasswordVisible}
          placeholderTextColor={TextColors.tertiary}
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
              <EyeOff size={20} color={TextColors.secondary} />
            ) : (
              <Eye size={20} color={TextColors.secondary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...Typography.bodySmallMedium,
    color: TextColors.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerError: {
    borderColor: TextColors.error,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: 16,
    color: TextColors.primary,
    padding: 0,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorText: {
    ...Typography.caption,
    color: TextColors.error,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default AuthInput;
