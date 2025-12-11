import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/auth.service';
import Label from '../form/Label';
import Checkbox from '../form/input/Checkbox';
import Input from '../form/input/InputField';
import { ButtonLoading } from '../ui/AppLoading/Loading';
import ErrorModal from './ErrorModal';

interface SignInFormProps {
  onSwitchToSignUp?: () => void;
  onSwitchToForgotPassword?: () => void;
  clearErrors?: boolean;
  autoFillCredentials?: { email?: string; phone?: string; password?: string };
}

export default function SignInForm({
  onSwitchToSignUp,
  onSwitchToForgotPassword,
  clearErrors = false,
  autoFillCredentials,
}: SignInFormProps) {
  const { t } = useTranslation();
  const { setIsNavigating } = useNavigation();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoaded, setIsFormLoaded] = useState(false);
  const [loginType, setLoginType] = useState('email'); // 'email' or 'phone'
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const navigate = useNavigate();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: t('auth.signIn.errors.loginFailed'),
    message: '',
  });
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Clear errors when clearErrors prop changes
  useEffect(() => {
    if (clearErrors) {
      setFieldErrors({});
      setTouchedFields({});
    }
  }, [clearErrors]);

  // Auto-fill credentials when provided
  useEffect(() => {
    if (autoFillCredentials) {
      if (autoFillCredentials.email) {
        setEmail(autoFillCredentials.email);
        setLoginType('email');
      } else if (autoFillCredentials.phone) {
        setEmail(autoFillCredentials.phone);
        setLoginType('phone');
      }
      if (autoFillCredentials.password) {
        setPassword(autoFillCredentials.password);
      }

      // Show success toast for auto-fill
      showToast(t('auth.signIn.messages.autoFillSuccess'), 'success');
    }
  }, [autoFillCredentials]);

  // Validation functions
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) {
          return loginType === 'email'
            ? t('auth.signIn.validation.emailRequired')
            : t('auth.signIn.validation.phoneRequired');
        }
        if (loginType === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return t('auth.signIn.validation.emailInvalid');
        } else {
          if (!/^[0-9]{10,11}$/.test(value.replace(/\s/g, '')))
            return t('auth.signIn.validation.phoneInvalid');
        }
        return '';
      case 'password':
        if (!value) return t('auth.signIn.validation.passwordRequired');
        return '';
      case 'adminLogin':
        if (!isAdminLogin && (email.includes('admin') || email.includes('gym147'))) {
          return t('auth.signIn.validation.adminLoginRequired');
        }
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);

    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));

    // Validate field
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleAdminLoginChange = (checked: boolean) => {
    setIsAdminLogin(checked);
    // Clear adminLogin error when checkbox is checked
    if (checked) {
      setFieldErrors(prev => ({ ...prev, adminLogin: '' }));
    }
  };

  const handleForgotPasswordClick = () => {
    // Clear all errors before switching to forgot password form
    setFieldErrors({});
    setTouchedFields({});
    onSwitchToForgotPassword?.();
  };

  const handleSignUpClick = () => {
    // Clear all errors before switching to sign up form
    setFieldErrors({});
    setTouchedFields({});
    onSwitchToSignUp?.();
  };

  // Handle login type change
  const handleLoginTypeChange = (type: string) => {
    setLoginType(type);
    // Clear email field error when switching type
    setFieldErrors(prev => ({ ...prev, email: '' }));
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const value = name === 'email' ? email : password;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  // Error Message Component
  const ErrorMessage = ({ fieldName }: { fieldName: string }) => {
    const error = fieldErrors[fieldName];
    const isTouched = touchedFields[fieldName];

    if (!isTouched || !error) return null;

    return (
      <div className='flex items-center gap-1 mt-1'>
        <svg
          className='w-3 h-3 text-red-500 dark:text-red-400 flex-shrink-0'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path
            fillRule='evenodd'
            d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
            clipRule='evenodd'
          />
        </svg>
        <p className='text-red-600 dark:text-red-300 text-xs leading-relaxed'>{error}</p>
      </div>
    );
  };

  // Real login function
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    setIsLoading(true);

    // Mark all fields as touched for validation
    setTouchedFields({ email: true, password: true });

    // Validate all fields
    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);

    setFieldErrors({
      email: emailError,
      password: passwordError,
    });

    // If there are validation errors, stop here
    if (emailError || passwordError) {
      setIsLoading(false);
      return;
    }

    // Check if admin login is required but not checked
    if (!isAdminLogin && (email.includes('admin') || email.includes('gym147'))) {
      setFieldErrors({
        email: emailError,
        password: passwordError,
        adminLogin: t('auth.signIn.validation.adminLoginRequired'),
      });
      setIsLoading(false);
      return;
    }

    try {
      // Call real API
      const response = await authService.login({
        identifier: email, // Backend expects 'identifier' field
        password: password,
        rememberMe: isChecked, // Send remember me flag
      });

      if (response.success) {
        // Store tokens and user data
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('isLoggedIn', 'true');

        // Set navigation loading
        setIsNavigating(true);

        // Navigate to dashboard based on role
        const userRole = response.data.user.role;
        console.log('User role:', userRole);

        if (userRole === 'SUPER_ADMIN') {
          navigate('/super-admin-dashboard');
        } else if (userRole === 'ADMIN') {
          navigate('/admin-dashboard');
        } else if (userRole === 'TRAINER') {
          navigate('/trainerdashboard/homepage');
        } else {
          navigate('/member-dashboard');
        }
      } else {
        // Handle API error response
        setFieldErrors(prev => ({
          ...prev,
          password: response.message || t('auth.signIn.errors.loginFailed'),
        }));
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // Determine error message based on error type
      let errorTitle = t('auth.signIn.errors.loginFailed');
      let errorMessage = t('auth.signIn.errors.genericError');

      if (error.response?.status === 401) {
        errorTitle = t('auth.signIn.errors.invalidCredentials');
        errorMessage = t('auth.signIn.errors.invalidCredentialsMessage');
      } else if (error.response?.status === 423) {
        errorTitle = t('auth.signIn.errors.accountLocked');
        errorMessage = t('auth.signIn.errors.accountLockedMessage');
      } else if (error.response?.status === 200 && error.response?.data?.requires2FA) {
        errorTitle = t('auth.signIn.errors.requires2FA');
        errorMessage = t('auth.signIn.errors.requires2FAMessage');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show error modal instead of inline error or reload
      setErrorModal({
        isOpen: true,
        title: errorTitle,
        message: errorMessage,
      });

      // Clear password field for security
      setPassword('');
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setIsOAuthLoading(true);
      const response = await authService.getGoogleAuthUrl();
      if (response.success && response.data?.authUrl) {
        // Open OAuth URL in new window
        window.location.href = response.data.authUrl;
      } else {
        showToast(t('auth.signIn.errors.googleOAuthFailed'), 'error');
      }
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      showToast(error.message || t('auth.signIn.errors.googleLoginFailed'), 'error');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsOAuthLoading(true);
      const response = await authService.getFacebookAuthUrl();
      if (response.success && response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        showToast(t('auth.signIn.errors.facebookOAuthFailed'), 'error');
      }
    } catch (error: any) {
      console.error('Facebook OAuth error:', error);
      showToast(error.message || t('auth.signIn.errors.facebookLoginFailed'), 'error');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full transition-all duration-1000 ${
        isFormLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      {/* Back Button */}

      {/* Form Container */}
      <div className='flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-1'>
        <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-4 border border-gray-200 dark:border-gray-700 shadow-2xl auth-form-container'>
          {/* Header */}
          <div className='mb-3 text-center'>
            <div className='inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-2 shadow-lg auth-icon'>
              <svg
                className='w-5 h-5 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                />
              </svg>
            </div>
            <h1
              className='mb-1 font-bold text-lg animate-fade-in-up delay-200 text-white'
              style={{ color: 'white !important', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
            >
              {t('auth.signIn.title')}
            </h1>
            <p className='text-gray-600 dark:text-white/70 text-xs '>{t('auth.signIn.welcome')}</p>
          </div>

          {/* Login Type Toggle */}
          <div className='mb-3'>
            <div className='flex bg-gray-100 dark:bg-gray-700/80 rounded-xl p-1 border border-gray-200 dark:border-gray-600'>
              <button
                type='button'
                onClick={() => handleLoginTypeChange('email')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-300  ${
                  loginType === 'email'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Email
              </button>
              <button
                type='button'
                onClick={() => handleLoginTypeChange('phone')}
                className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-300  ${
                  loginType === 'phone'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                {t('auth.signIn.phone')}
              </button>
            </div>
          </div>
          {/* Social Login Buttons */}
          <div className='mb-3'>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3'>
              <button
                type='button'
                onClick={handleGoogleLogin}
                disabled={isOAuthLoading || isLoading}
                className='group inline-flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 transition-all duration-300 bg-gray-100 dark:bg-gray-700/80 rounded-xl px-4 hover:bg-gray-200 dark:hover:bg-white/20 hover:scale-105 border border-gray-300 dark:border-gray-600 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 20 20'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z'
                    fill='#4285F4'
                  />
                  <path
                    d='M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z'
                    fill='#34A853'
                  />
                  <path
                    d='M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z'
                    fill='#FBBC05'
                  />
                  <path
                    d='M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z'
                    fill='#EB4335'
                  />
                </svg>
                {isOAuthLoading ? t('common.processing') : 'GOOGLE'}
              </button>
              <button
                type='button'
                onClick={handleFacebookLogin}
                disabled={isOAuthLoading || isLoading}
                className='group inline-flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 transition-all duration-300 bg-gray-100 dark:bg-gray-700/80 rounded-xl px-4 hover:bg-gray-200 dark:hover:bg-white/20 hover:scale-105 border border-gray-300 dark:border-gray-600 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 20 20'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  className='fill-current'
                >
                  <path d='M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z' />
                </svg>
                FACEBOOK
              </button>
            </div>

            {/* Divider */}
            <div className='relative py-3'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-300 dark:border-gray-600'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-4 py-2 text-gray-500 dark:text-white/60 bg-transparent backdrop-blur-sm rounded-full border border-gray-300 dark:border-gray-600'>
                  OR
                </span>
              </div>
            </div>
            {/* Login Form */}
            <form onSubmit={handleLogin} className='space-y-3' noValidate>
              {/* Email/Phone Field */}
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium '>
                  {loginType === 'email' ? t('auth.signIn.email') : t('auth.signIn.phone')}{' '}
                  <span className='text-orange-400'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    type={loginType === 'email' ? 'email' : 'tel'}
                    name='email'
                    placeholder={loginType === 'email' ? 'admin@gym147.com' : '0123456789'}
                    value={email}
                    onChange={e => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    className={`w-full px-4 py-3 bg-white/90 dark:bg-gray-700/80 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm auth-input ${
                      touchedFields.email && fieldErrors.email
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-gray-600 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                  <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
                    {loginType === 'email' ? (
                      <svg
                        className='w-5 h-5 text-gray-500 dark:text-white/50'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                        />
                      </svg>
                    ) : (
                      <svg
                        className='w-5 h-5 text-gray-500 dark:text-white/50'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <ErrorMessage fieldName='email' />
              </div>

              {/* Password Field */}
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium '>
                  {t('auth.signIn.password')} <span className='text-orange-400'>*</span>
                </Label>
                <div className='relative'>
                  <div className='absolute inset-y-0 right-0 flex items-center pr-3 z-20 pointer-events-none'>
                    <svg
                      className='w-5 h-5 text-gray-500 dark:text-white/50'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name='password'
                    placeholder='admin123'
                    value={password}
                    onChange={e => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleFieldBlur('password')}
                    className={`w-full pl-4 pr-16 py-3 bg-white/90 dark:bg-gray-700/80 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm auth-input ${
                      touchedFields.password && fieldErrors.password
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-gray-600 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 flex items-center pr-12 text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors duration-200 z-30'
                  >
                    {showPassword ? <Eye className='w-5 h-5' /> : <EyeOff className='w-5 h-5' />}
                  </button>
                </div>
                <ErrorMessage fieldName='password' />
              </div>
              {/* Admin Login Option */}
              <div className='flex items-center gap-3'>
                <Checkbox
                  className='w-5 h-5 text-orange-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/80 focus:ring-orange-400/20'
                  checked={isAdminLogin}
                  onChange={handleAdminLoginChange}
                />
                <span className='text-gray-700 dark:text-white/80 text-sm font-medium '>
                  {t('auth.signIn.adminLogin')}
                </span>
              </div>
              {fieldErrors.adminLogin && (
                <p className='text-red-500 text-xs mt-1'>{fieldErrors.adminLogin}</p>
              )}

              {/* Remember Me & Forgot Password */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Checkbox
                    checked={isChecked}
                    onChange={setIsChecked}
                    className='w-5 h-5 text-orange-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/80 focus:ring-orange-400/20'
                  />
                  <span className='text-gray-700 dark:text-white/80 text-sm font-medium '>
                    {t('auth.signIn.rememberMe')}
                  </span>
                </div>
                <button
                  type='button'
                  onClick={handleForgotPasswordClick}
                  className='text-sm text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors duration-200 font-medium hover:underline'
                >
                  {t('auth.signIn.forgotPassword')}
                </button>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type='submit'
                  className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none  auth-button'
                  disabled={isLoading}
                >
                  {isLoading ? <ButtonLoading /> : t('auth.signIn.submit')}
                </button>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className='mt-6 text-center'>
              <p className='text-gray-600 dark:text-white/70 text-sm'>
                {t('auth.signIn.noAccount')}{' '}
                <button
                  type='button'
                  onClick={handleSignUpClick}
                  className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 font-semibold transition-colors duration-200 hover:underline'
                >
                  {t('auth.signIn.signUpNow')}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
}
