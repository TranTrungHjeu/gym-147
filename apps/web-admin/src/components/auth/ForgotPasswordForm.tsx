import { useEffect, useState } from 'react';
import { authService } from '../../services/auth.service';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { ButtonLoading } from '../ui/AppLoading/Loading';

interface ForgotPasswordFormProps {
  onSwitchToSignIn?: () => void;
  clearErrors?: boolean;
}

export default function ForgotPasswordForm({
  onSwitchToSignIn,
  clearErrors = false,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [resetMethod, setResetMethod] = useState<'email' | 'phone'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormLoaded, setIsFormLoaded] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

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

  const handleBackToSignIn = () => {
    // Clear all errors before switching back to sign in form
    setFieldErrors({});
    setTouchedFields({});
    onSwitchToSignIn?.();
  };

  // Validation functions
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) return 'Email không được để trống';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
        return '';
      case 'phone':
        if (!value) return 'Số điện thoại không được để trống';
        if (!/^[0-9]{10,11}$/.test(value)) return 'Số điện thoại phải có 10-11 chữ số';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    if (name === 'email') setEmail(value);
    if (name === 'phone') setPhone(value);

    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));

    // Validate field
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const value = name === 'email' ? email : name === 'phone' ? phone : '';
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

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mark all fields as touched for validation
    setTouchedFields({
      email: resetMethod === 'email',
      phone: resetMethod === 'phone',
    });

    // Validate all fields
    const emailError = resetMethod === 'email' ? validateField('email', email) : '';
    const phoneError = resetMethod === 'phone' ? validateField('phone', phone) : '';

    setFieldErrors({
      email: emailError,
      phone: phoneError,
    });

    // If there are validation errors, stop here
    if (emailError || phoneError) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.forgotPassword(
        resetMethod === 'email' ? { email } : { phone }
      );

      if (response.success) {
        setIsEmailSent(true);
        // Hiển thị toast thành công
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: response.message || 'Link đặt lại mật khẩu đã được gửi thành công!',
            duration: 5000,
          });
        }
      } else {
        // Kiểm tra nếu là rate limiting trong response
        if (response.data?.remainingTime) {
          const remainingTime = response.data.remainingTime;
          const minutes = Math.floor(remainingTime / 60);
          const seconds = remainingTime % 60;
          const timeText = minutes > 0 ? `${minutes} phút ${seconds} giây` : `${seconds} giây`;

          if (window.showToast) {
            window.showToast({
              type: 'warning',
              message: `Vui lòng đợi`,
              countdown: remainingTime,
            });
          }

          setFieldErrors(prev => ({
            ...prev,
            [resetMethod]: `Vui lòng đợi ${timeText} trước khi yêu cầu lại`,
          }));
        } else if (response.data?.accountExists === false) {
          // Nếu là lỗi tài khoản không tồn tại, hiển thị toast warning
          if (window.showToast) {
            window.showToast({
              type: 'warning',
              message: response.message || 'Tài khoản không tồn tại',
              duration: 6000,
            });
          }

          setFieldErrors(prev => ({
            ...prev,
            [resetMethod]: response.message,
          }));
        } else {
          // Hiển thị toast lỗi cho các lỗi khác
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: response.message || 'Có lỗi xảy ra khi gửi link đặt lại mật khẩu',
              duration: 5000,
            });
          }

          setFieldErrors(prev => ({
            ...prev,
            [resetMethod]: response.message || 'Có lỗi xảy ra',
          }));
        }
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);

      // Xử lý lỗi rate limiting
      if (error.response?.status === 429) {
        const remainingTime = error.response?.data?.data?.remainingTime || 300;
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        const timeText = minutes > 0 ? `${minutes} phút ${seconds} giây` : `${seconds} giây`;

        if (window.showToast) {
          window.showToast({
            type: 'warning',
            message: `Vui lòng đợi`,
            countdown: remainingTime, // Sử dụng countdown thay vì duration
          });
        }

        setFieldErrors(prev => ({
          ...prev,
          [resetMethod]: `Vui lòng đợi trước khi yêu cầu lại`,
        }));
      } else if (error.response?.status === 404) {
        // Xử lý lỗi tài khoản không tồn tại
        const errorData = error.response?.data;
        if (errorData?.data?.accountExists === false) {
          if (window.showToast) {
            window.showToast({
              type: 'warning',
              message: errorData.message || 'Tài khoản không tồn tại',
              duration: 6000,
            });
          }

          setFieldErrors(prev => ({
            ...prev,
            [resetMethod]: errorData.message || 'Tài khoản không tồn tại',
          }));
        } else {
          // Lỗi 404 khác
          if (window.showToast) {
            window.showToast({
              type: 'error',
              message: 'Có lỗi xảy ra khi gửi link đặt lại mật khẩu. Vui lòng thử lại.',
              duration: 5000,
            });
          }

          setFieldErrors(prev => ({
            ...prev,
            [resetMethod]: 'Có lỗi xảy ra. Vui lòng thử lại.',
          }));
        }
      } else {
        // Lỗi khác
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: 'Có lỗi xảy ra khi gửi link đặt lại mật khẩu. Vui lòng thử lại.',
            duration: 5000,
          });
        }

        setFieldErrors(prev => ({
          ...prev,
          [resetMethod]: 'Có lỗi xảy ra. Vui lòng thử lại.',
        }));
      }
    }

    setIsLoading(false);
  };

  // Success message component
  if (isEmailSent) {
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
                {resetMethod === 'email' ? 'EMAIL ĐÃ ĐƯỢC GỬI' : 'SMS ĐÃ ĐƯỢC GỬI'}
              </h1>
              <p className='text-gray-600 dark:text-white/70 text-sm'>
                {resetMethod === 'email'
                  ? 'Chúng tôi đã gửi link đặt lại mật khẩu đến email của bạn'
                  : 'Chúng tôi đã gửi link đặt lại mật khẩu đến số điện thoại của bạn'}
              </p>
            </div>

            {/* Contact Info */}
            <div className='mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600'>
              <div className='flex items-center gap-3'>
                {resetMethod === 'email' ? (
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
                <span className='text-gray-700 dark:text-white/80 font-medium'>
                  {resetMethod === 'email' ? email : phone}
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className='mb-6 space-y-3'>
              <div className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-600 dark:text-orange-400 text-xs font-bold'>1</span>
                </div>
                <p className='text-gray-600 dark:text-white/70 text-sm'>
                  {resetMethod === 'email'
                    ? 'Kiểm tra hộp thư đến của bạn'
                    : 'Kiểm tra tin nhắn SMS của bạn'}
                </p>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-600 dark:text-orange-400 text-xs font-bold'>2</span>
                </div>
                <p className='text-gray-600 dark:text-white/70 text-sm'>
                  Click vào link trong email để đặt lại mật khẩu
                </p>
              </div>
              <div className='flex items-start gap-3'>
                <div className='w-6 h-6 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5'>
                  <span className='text-orange-600 dark:text-orange-400 text-xs font-bold'>3</span>
                </div>
                <p className='text-gray-600 dark:text-white/70 text-sm'>
                  Tạo mật khẩu mới và đăng nhập lại
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='space-y-3'>
              <button
                onClick={() => setIsEmailSent(false)}
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105'
              >
                Gửi lại email
              </button>

              <button
                type='button'
                onClick={handleBackToSignIn}
                className='w-full py-3 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105'
              >
                Quay lại đăng nhập
              </button>
            </div>

            {/* Help Text */}
            <div className='mt-6 text-center'>
              <p className='text-gray-500 dark:text-white/60 text-xs'>
                Không nhận được email? Kiểm tra thư mục spam hoặc{' '}
                <button
                  onClick={() => setIsEmailSent(false)}
                  className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 font-medium transition-colors duration-200 hover:underline'
                >
                  thử lại
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              QUÊN MẬT KHẨU
            </h1>
            <p className='text-gray-600 dark:text-white/70 text-xs'>
              Nhập email hoặc số điện thoại để nhận link đặt lại mật khẩu
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleForgotPassword} className='space-y-3'>
            {/* Reset Method Toggle */}
            <div className='flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-4'>
              <button
                type='button'
                onClick={() => {
                  setResetMethod('email');
                  setFieldErrors({});
                  setTouchedFields({});
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  resetMethod === 'email'
                    ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Email
              </button>
              <button
                type='button'
                onClick={() => {
                  setResetMethod('phone');
                  setFieldErrors({});
                  setTouchedFields({});
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  resetMethod === 'phone'
                    ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Số điện thoại
              </button>
            </div>

            {/* Email Field */}
            {resetMethod === 'email' && (
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium'>
                  Email <span className='text-orange-400'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    type='email'
                    name='email'
                    placeholder='admin@gym147.com'
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
                  </div>
                </div>
                <ErrorMessage fieldName='email' />
              </div>
            )}

            {/* Phone Field */}
            {resetMethod === 'phone' && (
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium'>
                  Số điện thoại <span className='text-orange-400'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    type='tel'
                    name='phone'
                    placeholder='0123456789'
                    value={phone}
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    className={`w-full px-4 py-3 bg-white/90 dark:bg-gray-700/80 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm auth-input ${
                      touchedFields.phone && fieldErrors.phone
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-gray-600 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                  <div className='absolute inset-y-0 right-0 flex items-center pr-3'>
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
                  </div>
                </div>
                <ErrorMessage fieldName='phone' />
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type='submit'
                className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none auth-button'
                disabled={isLoading}
              >
                {isLoading ? <ButtonLoading /> : 'Gửi Email Đặt Lại'}
              </button>
            </div>
          </form>

          {/* Back to Sign In */}
          <div className='mt-6 text-center'>
            <p className='text-gray-600 dark:text-white/70 text-sm'>
              Nhớ mật khẩu rồi?{' '}
              <button
                type='button'
                onClick={handleBackToSignIn}
                className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 font-semibold transition-colors duration-200 hover:underline'
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
