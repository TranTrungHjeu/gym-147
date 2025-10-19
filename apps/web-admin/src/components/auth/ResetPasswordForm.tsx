import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { ButtonLoading } from '../ui/AppLoading/Loading';

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoaded, setIsFormLoaded] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const token = searchParams.get('token');

  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Validate token on component mount
  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsTokenValid(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await authService.validateResetToken(token!);
      setIsTokenValid(response.success);
    } catch (error) {
      console.error('Token validation error:', error);
      setIsTokenValid(false);
    }
  };

  // Validation functions
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'password':
        if (!value) return 'Mật khẩu không được để trống';
        if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
        if (!/(?=.*[a-z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
        if (!/(?=.*[A-Z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
        if (!/(?=.*\d)/.test(value)) return 'Mật khẩu phải có ít nhất 1 số';
        return '';
      case 'confirmPassword':
        if (!value) return 'Xác nhận mật khẩu không được để trống';
        if (value !== formData.password) return 'Mật khẩu xác nhận không khớp';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));

    // Validate field
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));

    // Re-validate confirm password if password changed
    if (name === 'password' && touchedFields.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const value = formData[name as keyof typeof formData];
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

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mark all fields as touched for validation
    setTouchedFields({ password: true, confirmPassword: true });

    // Validate all fields
    const passwordError = validateField('password', formData.password);
    const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);

    setFieldErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    // If there are validation errors, stop here
    if (passwordError || confirmPasswordError) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.resetPassword({
        token: token!,
        newPassword: formData.password,
      });

      if (response.success) {
        setIsPasswordReset(true);
      } else {
        setFieldErrors(prev => ({
          ...prev,
          password: response.message || 'Có lỗi xảy ra khi đặt lại mật khẩu',
        }));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setFieldErrors(prev => ({
        ...prev,
        password: 'Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.',
      }));
    }

    setIsLoading(false);
  };

  // Loading state
  if (isTokenValid === null) {
    return (
      <div className='flex flex-col justify-center items-center min-h-[400px]'>
        <div className='w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin'></div>
        <p className='mt-4 text-gray-600 dark:text-white/70'>Đang xác thực token...</p>
      </div>
    );
  }

  // Invalid token
  if (isTokenValid === false) {
    return (
      <div
        className={`flex flex-col h-full transition-all duration-1000 ${isFormLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      >
        <div className='flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-1'>
          <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl auth-form-container'>
            {/* Error Icon */}
            <div className='mb-4 text-center'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-3 shadow-lg'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </div>
              <h1
                className='mb-2 font-bold text-xl text-white'
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
              >
                TOKEN KHÔNG HỢP LỆ
              </h1>
              <p className='text-gray-600 dark:text-white/70 text-sm'>
                Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ
              </p>
            </div>

            {/* Action Buttons */}
            <div className='space-y-3'>
              <button
                onClick={() => navigate('/auth')}
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105'
              >
                Yêu cầu link mới
              </button>

              <button
                onClick={() => navigate('/auth')}
                className='w-full py-3 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105'
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isPasswordReset) {
    return (
      <div
        className={`flex flex-col h-full transition-all duration-1000 ${isFormLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      >
        <div className='flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-1'>
          <div className='bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl auth-form-container'>
            {/* Success Icon */}
            <div className='mb-4 text-center'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-3 shadow-lg'>
                <svg
                  className='w-8 h-8 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
              <h1
                className='mb-2 font-bold text-xl text-white'
                style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
              >
                ĐẶT LẠI THÀNH CÔNG
              </h1>
              <p className='text-gray-600 dark:text-white/70 text-sm'>
                Mật khẩu của bạn đã được đặt lại thành công
              </p>
            </div>

            {/* Action Button */}
            <div>
              <button
                onClick={() => navigate('/auth')}
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105'
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div
      className={`flex flex-col h-full transition-all duration-1000 ${isFormLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
    >
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
                  d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                />
              </svg>
            </div>
            <h1
              className='mb-1 font-bold text-lg animate-fade-in-up delay-200 text-white'
              style={{ color: 'white !important', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
            >
              ĐẶT LẠI MẬT KHẨU
            </h1>
            <p className='text-gray-600 dark:text-white/70 text-xs'>
              Tạo mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleResetPassword} className='space-y-3'>
            {/* Password Field */}
            <div className='space-y-2'>
              <Label className='text-gray-700 dark:text-white/90 font-medium'>
                Mật khẩu mới <span className='text-orange-400'>*</span>
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
                  placeholder='Nhập mật khẩu mới'
                  value={formData.password}
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

            {/* Confirm Password Field */}
            <div className='space-y-2'>
              <Label className='text-gray-700 dark:text-white/90 font-medium'>
                Xác nhận mật khẩu <span className='text-orange-400'>*</span>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  name='confirmPassword'
                  placeholder='Nhập lại mật khẩu mới'
                  value={formData.confirmPassword}
                  onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  className={`w-full pl-4 pr-16 py-3 bg-white/90 dark:bg-gray-700/80 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm auth-input ${
                    touchedFields.confirmPassword && fieldErrors.confirmPassword
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-gray-300 dark:border-gray-600 focus:border-orange-400 focus:ring-orange-400/20'
                  }`}
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute inset-y-0 right-0 flex items-center pr-12 text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors duration-200 z-30'
                >
                  {showConfirmPassword ? (
                    <Eye className='w-5 h-5' />
                  ) : (
                    <EyeOff className='w-5 h-5' />
                  )}
                </button>
              </div>
              <ErrorMessage fieldName='confirmPassword' />
            </div>

            {/* Password Requirements */}
            <div className='p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600'>
              <p className='text-gray-600 dark:text-white/70 text-xs font-medium mb-2'>
                Mật khẩu phải có:
              </p>
              <ul className='space-y-1 text-xs text-gray-500 dark:text-white/60'>
                <li
                  className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  ></span>
                  Ít nhất 8 ký tự
                </li>
                <li
                  className={`flex items-center gap-2 ${/(?=.*[a-z])/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${/(?=.*[a-z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  ></span>
                  1 chữ thường
                </li>
                <li
                  className={`flex items-center gap-2 ${/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${/(?=.*[A-Z])/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  ></span>
                  1 chữ hoa
                </li>
                <li
                  className={`flex items-center gap-2 ${/(?=.*\d)/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${/(?=.*\d)/.test(formData.password) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  ></span>
                  1 số
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type='submit'
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none auth-button'
                disabled={isLoading}
              >
                {isLoading ? <ButtonLoading /> : 'Đặt Lại Mật Khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
