import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { EyeCloseIcon, EyeIcon } from '../../icons';
import { authService } from '../../services/auth.service';
import Toast from '../common/Toast';
import Label from '../form/Label';
import Checkbox from '../form/input/Checkbox';
import Input from '../form/input/InputField';
import OTPInput from './OTPInput';

interface SignUpFormProps {
  onSwitchToSignIn?: () => void;
}

export default function SignUpForm({ onSwitchToSignIn }: SignUpFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isFormLoaded, setIsFormLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupType, setSignupType] = useState('email'); // 'email' or 'phone'
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessLoading, setOtpSuccessLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emailForPhone: '', // Email thật khi đăng ký bằng phone
    password: '',
    age: '',
    referralCode: '',
    couponCode: '',
    otp: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setIsFormLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Validation functions
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) {
          return signupType === 'email'
            ? 'Email không được để trống'
            : 'Số điện thoại không được để trống';
        }
        if (signupType === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
        } else {
          if (!/^[0-9]{10,11}$/.test(value.replace(/\s/g, '')))
            return 'Số điện thoại phải có 10-11 chữ số';
        }
        return '';
      case 'password':
        if (!value) return 'Mật khẩu không được để trống';
        if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
        }
        return '';
      case 'firstName':
        if (!value) return 'Họ không được để trống';
        if (value.length < 2) return 'Họ phải có ít nhất 2 ký tự';
        return '';
      case 'lastName':
        if (!value) return 'Tên không được để trống';
        if (value.length < 2) return 'Tên phải có ít nhất 2 ký tự';
        return '';
      case 'age':
        if (!value) return 'Tuổi không được để trống và phải là một số';
        const age = parseInt(value);
        if (isNaN(age) || age < 16 || age > 100) return 'Tuổi phải từ 16 đến 100';
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string) => {
    // For phone signup, save phone number to both email and phone fields
    if (name === 'email' && signupType === 'phone') {
      setFormData(prev => ({ ...prev, email: value, phone: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Mark field as touched
    setTouchedFields(prev => ({ ...prev, [name]: true }));

    // Validate field
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleFieldBlur = (name: string) => {
    setTouchedFields(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof typeof formData]);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  // Handle signup type change
  const handleSignupTypeChange = (type: string) => {
    setSignupType(type);
    // Clear form data when switching types to avoid "already exists" error
    setFormData(prev => ({
      ...prev,
      email: '',
      phone: '',
      emailForPhone: '',
      otp: '',
    }));
    // Clear all field errors
    setFieldErrors({});
    setTouchedFields({});
    // Clear OTP verification status
    setOtpVerified(false);
    setOtpError('');
    // Show info message
    showToast(
      `Đã chuyển sang đăng ký bằng ${type === 'email' ? 'email' : 'số điện thoại'}`,
      'info'
    );
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    handleFieldChange(name, value);
  };

  const validateStep1 = () => {
    if (signupType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(formData.email);
    } else {
      const phoneRegex = /^[0-9]{10,11}$/;
      return phoneRegex.test(formData.email); // Still using email field for phone input
    }
  };

  const validateStep2 = () => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.age !== '' &&
      formData.password.length >= 8 &&
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)
    );
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!validateStep1()) return;

    setOtpLoading(true);
    setOtpError('');
    setOtpVerified(false); // Reset verification status

    try {
      const data = await authService.sendOTP({
        identifier: signupType === 'email' ? formData.email : formData.phone,
        type: signupType === 'email' ? 'EMAIL' : 'PHONE',
      });

      if (data.success) {
        setCurrentStep(2);
        showToast(data.message, 'success');
      } else {
        // Handle specific error cases with user-friendly messages
        let errorMessage = data.message;

        if (
          data.message.includes('đã được sử dụng') ||
          data.message.includes('đã tồn tại') ||
          data.message.includes('already exists')
        ) {
          const currentType = signupType === 'email' ? 'Email' : 'Số điện thoại';
          const alternativeType = signupType === 'email' ? 'số điện thoại' : 'email';
          errorMessage = `${currentType} này đã được sử dụng! Vui lòng thử ${alternativeType} khác hoặc đăng nhập.`;
        }

        setOtpError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      let errorMessage = 'Có lỗi xảy ra khi gửi mã OTP';

      if (error instanceof Error) {
        if (
          error.message.includes('đã được sử dụng') ||
          error.message.includes('đã tồn tại') ||
          error.message.includes('already exists')
        ) {
          const currentType = signupType === 'email' ? 'Email' : 'Số điện thoại';
          const alternativeType = signupType === 'email' ? 'số điện thoại' : 'email';
          errorMessage = `${currentType} này đã được sử dụng! Vui lòng thử ${alternativeType} khác hoặc đăng nhập.`;
        } else {
          errorMessage = error.message;
        }
      }

      setOtpError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (otp: string) => {
    setOtpLoading(true);
    setOtpError('');

    try {
      const data = await authService.verifyOTP({
        identifier: signupType === 'email' ? formData.email : formData.phone,
        otp: otp,
        type: signupType === 'email' ? 'EMAIL' : 'PHONE',
      });

      if (data.success) {
        setOtpVerified(true);
        setFormData(prev => ({ ...prev, otp: otp })); // Save OTP to formData
        showToast('Xác thực thành công!', 'success');

        // Show loading and transition to next step
        setOtpSuccessLoading(true);
        setTimeout(() => {
          setCurrentStep(3);
          setOtpSuccessLoading(false);
        }, 1500);
      } else {
        setOtpError(data.message);
        showToast(data.message, 'error');
      }
    } catch (error) {
      setOtpError('Có lỗi xảy ra khi xác thực OTP');
      showToast('Có lỗi xảy ra khi xác thực OTP', 'error');
    } finally {
      setOtpLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setOtpVerified(false); // Reset verification status
    await handleSendOTP();
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      handleSendOTP();
    } else if (currentStep === 3 && validateStep2()) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // Reset OTP state when going back from step 2 to step 1
      if (currentStep === 2) {
        setOtpVerified(false);
        setOtpError('');
        setOtpLoading(false);
        setOtpSuccessLoading(false);
        setFormData(prev => ({ ...prev, otp: '' }));
      }
      // When going back from step 3 to step 2, keep OTP input and verified state
      // User already verified, so show the OTP they used

      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 4) {
      // Check if OTP is verified before submitting
      if (!otpVerified) {
        showToast('Vui lòng xác thực OTP trước khi đăng ký', 'error');
        return;
      }

      setIsLoading(true);

      try {
        // For phone signup, we need to get email from step 3 (personal info)
        // For email signup, email is already in formData.email
        const registerData = {
          email: signupType === 'email' ? formData.email : formData.emailForPhone,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: signupType === 'phone' ? formData.phone : undefined,
          otp: formData.otp,
          otpType: (signupType === 'email' ? 'EMAIL' : 'PHONE') as 'EMAIL' | 'PHONE',
          primaryMethod: (signupType === 'email' ? 'EMAIL' : 'PHONE') as 'EMAIL' | 'PHONE',
          age: parseInt(formData.age),
          referralCode: formData.referralCode || undefined,
          couponCode: formData.couponCode || undefined,
        };

        const data = await authService.register(registerData);

        if (data.success) {
          showToast('Đăng ký thành công!', 'success');

          // Redirect to login or dashboard
          setTimeout(() => {
            onSwitchToSignIn?.();
          }, 2000);
        } else {
          // Handle specific error cases with user-friendly messages
          let errorMessage = data.message || 'Có lỗi xảy ra khi đăng ký';

          if (
            data.message?.includes('đã được sử dụng') ||
            data.message?.includes('đã tồn tại') ||
            data.message?.includes('already exists')
          ) {
            const currentType = signupType === 'email' ? 'Email' : 'Số điện thoại';
            const alternativeType = signupType === 'email' ? 'số điện thoại' : 'email';
            errorMessage = `${currentType} này đã được sử dụng! Vui lòng thử ${alternativeType} khác hoặc đăng nhập.`;
          }

          showToast(errorMessage, 'error');
        }
      } catch (error) {
        console.error('Register error:', error);
        let errorMessage = 'Có lỗi xảy ra khi đăng ký';

        if (error instanceof Error) {
          if (
            error.message.includes('đã được sử dụng') ||
            error.message.includes('đã tồn tại') ||
            error.message.includes('already exists')
          ) {
            const currentType = signupType === 'email' ? 'Email' : 'Số điện thoại';
            const alternativeType = signupType === 'email' ? 'số điện thoại' : 'email';
            errorMessage = `${currentType} này đã được sử dụng! Vui lòng thử ${alternativeType} khác hoặc đăng nhập.`;
          } else {
            errorMessage = error.message;
          }
        }

        showToast(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className={`flex flex-col h-full transition-all duration-1000 ${isFormLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
    >
      {/* Back Button */}

      {/* Form Container */}
      <div className='flex flex-col justify-center flex-1 w-full max-w-md mx-auto py-1'>
        <div className='bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-gray-200 dark:border-white/20 shadow-2xl auth-form-container'>
          {/* Header */}
          <div className='mb-4 text-center'>
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
                  d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                />
              </svg>
            </div>
            <h1
              className='mb-1 font-bold text-lg'
              style={{ color: 'white !important', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}
            >
              ĐĂNG KÝ
            </h1>
            <p className='text-gray-600 dark:text-white/70 text-xs '>
              Tạo tài khoản mới để bắt đầu hành trình fitness!
            </p>
          </div>

          {/* Progress Indicator */}
          <div className='mb-6'>
            <div className='flex items-center justify-center space-x-2'>
              {[1, 2, 3, 4].map(step => (
                <div key={step} className='flex items-center'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ${
                      step <= currentStep
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                        : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                        step < currentStep ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/10'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className='mt-2 text-center'>
              <p className='text-gray-600 dark:text-white/60 text-xs '>Bước {currentStep} / 4</p>
            </div>
          </div>

          {/* Step 1: Email/Phone Input */}
          {currentStep === 1 && (
            <>
              {/* Signup Type Toggle */}
              <div className='mb-4'>
                <div
                  className={`flex bg-gray-100 dark:bg-white/10 rounded-xl p-1 border transition-all duration-300 border-gray-200 dark:border-white/20`}
                >
                  <button
                    type='button'
                    onClick={() => handleSignupTypeChange('email')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-300 ${
                      signupType === 'email'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type='button'
                    onClick={() => handleSignupTypeChange('phone')}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-all duration-300 ${
                      signupType === 'phone'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'text-gray-600 dark:text-white/70 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    Số điện thoại
                  </button>
                </div>
                {false && (
                  <div className='mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
                    <p className='text-xs text-red-600 dark:text-red-400 text-center font-medium'>
                      ⚠️ {signupType === 'email' ? 'Email' : 'Số điện thoại'} này đã được sử dụng!
                    </p>
                    <p className='text-xs text-red-500 dark:text-red-500 text-center mt-1'>
                      Thử chuyển sang {signupType === 'email' ? 'số điện thoại' : 'email'} khác
                    </p>
                  </div>
                )}
              </div>

              {/* Email/Phone Field */}
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium '>
                  {signupType === 'email' ? 'Email' : 'Số điện thoại'}{' '}
                  <span className='text-orange-400'>*</span>
                </Label>
                <div className='relative'>
                  <Input
                    type={signupType === 'email' ? 'email' : 'tel'}
                    name='email'
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder={
                      signupType === 'email' ? 'Nhập email của bạn' : 'Nhập số điện thoại'
                    }
                    className={`w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm ${
                      touchedFields.email && fieldErrors.email
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-white/20 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                  <div className='absolute inset-y-0 right-0 flex items-center pr-3 z-20 pointer-events-none'>
                    {signupType === 'email' ? (
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

              {/* Next Button */}
              <div className='mt-6'>
                <button
                  type='button'
                  onClick={handleNext}
                  disabled={!validateStep1()}
                  className='w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none '
                >
                  Tiếp theo
                </button>
              </div>
            </>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <>
              {/* Header */}
              <div className='text-center mb-6'>
                <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg'>
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
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
                  Xác thực {signupType === 'email' ? 'Email' : 'Số điện thoại'}
                </h2>
                <p className='text-gray-600 dark:text-white/70 text-sm'>
                  Chúng tôi đã gửi mã xác thực đến{' '}
                  <span className='font-semibold text-orange-500 dark:text-orange-400'>
                    {formData.email}
                  </span>
                </p>
              </div>

              {/* OTP Input */}
              <OTPInput
                length={6}
                onComplete={handleVerifyOTP}
                onResend={handleResendOTP}
                isLoading={otpLoading}
                isSuccessLoading={otpSuccessLoading}
                error={otpError}
                resendCooldown={60}
                isVerified={otpVerified}
                value={formData.otp}
              />

              {/* Navigation Buttons */}
              <div className='flex gap-3 mt-6'>
                <button
                  type='button'
                  onClick={handleBack}
                  className='flex-1 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-300 dark:border-white/20 transition-all duration-300 transform hover:scale-105'
                >
                  Quay lại
                </button>
                <button
                  type='button'
                  onClick={() => setCurrentStep(3)}
                  disabled={!otpVerified}
                  className='flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                >
                  Tiếp theo
                </button>
              </div>
            </>
          )}

          {/* Step 3: Personal Information */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmit} className='space-y-3'>
              {/* Name Fields */}
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-gray-700 dark:text-white/90 font-medium '>
                    Họ <span className='text-orange-400'>*</span>
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
                          d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                        />
                      </svg>
                    </div>
                    <Input
                      type='text'
                      name='firstName'
                      value={formData.firstName}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur('firstName')}
                      placeholder='Họ của bạn'
                      className={`w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm ${
                        touchedFields.firstName && fieldErrors.firstName
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-gray-300 dark:border-white/20 focus:border-orange-400 focus:ring-orange-400/20'
                      }`}
                    />
                  </div>
                  <ErrorMessage fieldName='firstName' />
                </div>
                <div className='space-y-2'>
                  <Label className='text-gray-700 dark:text-white/90 font-medium '>
                    Tên <span className='text-orange-400'>*</span>
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
                          d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                        />
                      </svg>
                    </div>
                    <Input
                      type='text'
                      name='lastName'
                      value={formData.lastName}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur('lastName')}
                      placeholder='Tên của bạn'
                      className={`w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm ${
                        touchedFields.lastName && fieldErrors.lastName
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                          : 'border-gray-300 dark:border-white/20 focus:border-orange-400 focus:ring-orange-400/20'
                      }`}
                    />
                  </div>
                  <ErrorMessage fieldName='lastName' />
                </div>
              </div>

              {/* Age Field */}
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium '>
                  Tuổi <span className='text-orange-400'>*</span>
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
                        d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                      />
                    </svg>
                  </div>
                  <Input
                    type='number'
                    name='age'
                    value={formData.age}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('age')}
                    placeholder='Nhập tuổi của bạn'
                    min='16'
                    max='100'
                    className={`w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                      touchedFields.age && fieldErrors.age
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-white/20 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                </div>
                <ErrorMessage fieldName='age' />
              </div>

              {/* Password Field */}
              <div className='space-y-2'>
                <Label className='text-gray-700 dark:text-white/90 font-medium '>
                  Mật khẩu <span className='text-orange-400'>*</span>
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
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('password')}
                    placeholder='Nhập mật khẩu của bạn'
                    className={`w-full pl-4 pr-16 py-3 bg-white/80 dark:bg-white/10 border rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:ring-2 transition-all duration-300 backdrop-blur-sm ${
                      touchedFields.password && fieldErrors.password
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : 'border-gray-300 dark:border-white/20 focus:border-orange-400 focus:ring-orange-400/20'
                    }`}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 flex items-center pr-12 text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/80 transition-colors duration-200 z-30'
                  >
                    {showPassword ? (
                      <img src={EyeIcon} alt='hide' className='w-5 h-5' />
                    ) : (
                      <img src={EyeCloseIcon} alt='show' className='w-5 h-5' />
                    )}
                  </button>
                </div>
                <ErrorMessage fieldName='password' />
              </div>

              {/* Navigation Buttons */}
              <div className='flex gap-3 mt-6'>
                <button
                  type='button'
                  onClick={handleBack}
                  className='flex-1 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-300 dark:border-white/20 transition-all duration-300 transform hover:scale-105 '
                >
                  Quay lại
                </button>
                <button
                  type='button'
                  onClick={handleNext}
                  disabled={!validateStep2()}
                  className='flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none '
                >
                  Tiếp theo
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Referral Code, Coupon & Terms */}
          {currentStep === 4 && (
            <form onSubmit={handleSubmit} className='space-y-3'>
              {/* Header */}
              <div className='text-center mb-6'>
                <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg'>
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
                      d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-gray-800 dark:text-white mb-2 '>
                  Thông tin bổ sung
                </h2>
                <p className='text-gray-600 dark:text-white/70 text-sm '>
                  Nhập mã giới thiệu và coupon (tùy chọn)
                </p>
              </div>

              {/* Referral Code & Coupon */}
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='space-y-2'>
                  <Label className='text-gray-700 dark:text-white/90 font-medium '>
                    Mã giới thiệu
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
                          d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                        />
                      </svg>
                    </div>
                    <Input
                      type='text'
                      name='referralCode'
                      value={formData.referralCode}
                      onChange={handleInputChange}
                      placeholder='Nhập mã giới thiệu'
                      className='w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300 backdrop-blur-sm '
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label className='text-gray-700 dark:text-white/90 font-medium '>
                    Coupon giảm giá
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
                          d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                        />
                      </svg>
                    </div>
                    <Input
                      type='text'
                      name='couponCode'
                      value={formData.couponCode}
                      onChange={handleInputChange}
                      placeholder='Nhập mã coupon'
                      className='w-full pl-4 pr-10 py-3 bg-white/80 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-white/50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all duration-300 backdrop-blur-sm '
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className='flex items-start gap-3'>
                <Checkbox
                  className='w-5 h-5 text-orange-500 border-gray-300 dark:border-white/30 bg-white dark:bg-white/10 focus:ring-orange-400/20 mt-0.5'
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <p className='text-gray-600 dark:text-white/70 text-sm leading-relaxed '>
                  Đồng ý{' '}
                  <span className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 cursor-pointer font-medium'>
                    điều khoản sử dụng
                  </span>{' '}
                  và{' '}
                  <span className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 cursor-pointer font-medium'>
                    chính sách bảo mật
                  </span>{' '}
                  của chúng tôi.
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className='flex gap-3 mt-6'>
                <button
                  type='button'
                  onClick={handleBack}
                  className='flex-1 py-3 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-300 dark:border-white/20 transition-all duration-300 transform hover:scale-105 '
                >
                  Quay lại
                </button>
                <button
                  type='submit'
                  disabled={isLoading || !isChecked}
                  className='flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none '
                >
                  {isLoading ? (
                    <div className='flex items-center justify-center space-x-2'>
                      <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                      <span>Đang tạo tài khoản...</span>
                    </div>
                  ) : (
                    'Tạo Tài Khoản'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign In Link - Show on all steps */}
          <div className='mt-6 text-center'>
            <p className='text-gray-600 dark:text-white/70 text-sm'>
              Đã có tài khoản?{' '}
              <button
                onClick={onSwitchToSignIn}
                className='text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 font-semibold transition-colors duration-200 hover:underline'
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
