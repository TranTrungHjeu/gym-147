import {
  ForgotPasswordData,
  LoginCredentials,
  RegisterCredentials,
  ValidationError,
} from '@/types/authTypes';

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { field: 'email', message: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { field: 'email', message: 'Please enter a valid email address' };
  }

  return null;
};

/**
 * Password validation
 */
export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }

  if (password.length < 8) {
    return {
      field: 'password',
      message: 'Password must be at least 8 characters',
    };
  }

  // Check for at least one uppercase, one lowercase, and one number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return {
      field: 'password',
      message: 'Password must contain uppercase, lowercase, and number',
    };
  }

  return null;
};

/**
 * Name validation
 */
export const validateName = (name: string): ValidationError | null => {
  if (!name) {
    return { field: 'name', message: 'Name is required' };
  }

  if (name.trim().length < 2) {
    return { field: 'name', message: 'Name must be at least 2 characters' };
  }

  return null;
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (
  password: string,
  confirmPassword: string
): ValidationError | null => {
  if (!confirmPassword) {
    return {
      field: 'confirmPassword',
      message: 'Please confirm your password',
    };
  }

  if (password !== confirmPassword) {
    return { field: 'confirmPassword', message: 'Passwords do not match' };
  }

  return null;
};

/**
 * Validate login credentials
 */
export const validateLoginCredentials = (
  credentials: LoginCredentials
): ValidationError[] => {
  const errors: ValidationError[] = [];

  const identifierError = validateEmail(credentials.identifier);
  if (identifierError) errors.push(identifierError);

  const passwordError = validatePassword(credentials.password);
  if (passwordError) errors.push(passwordError);

  return errors;
};

/**
 * Validate register credentials
 */
export const validateRegisterCredentials = (
  credentials: RegisterCredentials
): ValidationError[] => {
  const errors: ValidationError[] = [];

  const nameError = validateName(credentials.name);
  if (nameError) errors.push(nameError);

  const emailError = validateEmail(credentials.email);
  if (emailError) errors.push(emailError);

  const passwordError = validatePassword(credentials.password);
  if (passwordError) errors.push(passwordError);

  const confirmPasswordError = validateConfirmPassword(
    credentials.password,
    credentials.confirmPassword
  );
  if (confirmPasswordError) errors.push(confirmPasswordError);

  return errors;
};

/**
 * Validate forgot password data
 */
export const validateForgotPasswordData = (
  data: ForgotPasswordData
): ValidationError[] => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  return errors;
};

/**
 * Get error message for a specific field
 */
export const getFieldError = (
  errors: ValidationError[],
  field: string
): string | undefined => {
  return errors.find((error) => error.field === field)?.message;
};
