import { Eye, EyeOff, Key, Mail, Phone, Shield } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import OTPInput from '../auth/OTPInput';
import { userService } from '../../services/user.service';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userPhone?: string;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  userEmail,
  userPhone,
}: ChangePasswordModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessLoading, setOtpSuccessLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0); // Cooldown timer in seconds
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number>(currentStep);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Load cooldown from localStorage on component mount and when modal opens
  useEffect(() => {
    // Check cooldown for both EMAIL and PHONE methods
    const emailKey = userEmail ? `otp_cooldown_${userEmail}_EMAIL` : null;
    const phoneKey = userPhone ? `otp_cooldown_${userPhone}_PHONE` : null;
    
    // Try to load cooldown for current verification method first
    const currentKey = verificationMethod === 'EMAIL' ? emailKey : phoneKey;
    const savedCooldown = currentKey ? localStorage.getItem(currentKey) : null;
    
    if (savedCooldown) {
      try {
        const { expiresAt } = JSON.parse(savedCooldown);
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
        
        if (remaining > 0) {
          setOtpCooldown(remaining);
        } else {
          // Cooldown expired, remove from localStorage
          localStorage.removeItem(currentKey);
        }
      } catch (error) {
        console.error('Error loading cooldown from localStorage:', error);
        if (currentKey) localStorage.removeItem(currentKey);
      }
    } else {
      // If no cooldown for current method, check the other method
      const otherKey = verificationMethod === 'EMAIL' ? phoneKey : emailKey;
      if (otherKey) {
        const otherCooldown = localStorage.getItem(otherKey);
        if (otherCooldown) {
          try {
            const { expiresAt } = JSON.parse(otherCooldown);
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
            
            if (remaining > 0) {
              setOtpCooldown(remaining);
            } else {
              localStorage.removeItem(otherKey);
            }
          } catch (error) {
            console.error('Error loading cooldown from localStorage:', error);
            if (otherKey) localStorage.removeItem(otherKey);
          }
        }
      }
    }
  }, [userEmail, userPhone, verificationMethod]); // Load on mount and when user info changes

  // GSAP modal entrance/exit animation
  useEffect(() => {
    if (isOpen && modalRef.current && backdropRef.current && contentRef.current) {
      // Entrance animation
      gsap.set([backdropRef.current, contentRef.current], { opacity: 0 });
      gsap.set(contentRef.current, { scale: 0.9, y: 20 });

      const tl = gsap.timeline();
      tl.to(backdropRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: 'power2.out',
      });
      tl.to(
        contentRef.current,
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.4,
          ease: 'back.out(1.2)',
        },
        '-=0.1'
      );
    } else if (!isOpen && backdropRef.current && contentRef.current) {
      // Exit animation
      const tl = gsap.timeline({
        onComplete: () => {
          if (contentRef.current) contentRef.current.style.display = 'none';
        },
      });
      tl.to(contentRef.current, {
        opacity: 0,
        scale: 0.95,
        y: 10,
        duration: 0.2,
        ease: 'power2.in',
      });
      tl.to(
        backdropRef.current,
        {
          opacity: 0,
          duration: 0.15,
          ease: 'power2.in',
        },
        '-=0.1'
      );
    }
  }, [isOpen]);

  // GSAP step transition animation
  useEffect(() => {
    if (!isOpen) return;

    const prevStep = prevStepRef.current;
    const isForward = currentStep > prevStep;

    // Get refs for current and previous steps
    const currentRef = currentStep === 1 ? step1Ref : currentStep === 2 ? step2Ref : step3Ref;
    const prevRef = prevStep === 1 ? step1Ref : prevStep === 2 ? step2Ref : step3Ref;

    if (currentRef.current && prevRef.current && prevStep !== currentStep) {
      const tl = gsap.timeline();

      // Exit previous step
      tl.to(prevRef.current, {
        opacity: 0,
        x: isForward ? -40 : 40,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          if (prevRef.current) prevRef.current.style.display = 'none';
        },
      });

      // Enter current step
      if (currentRef.current) {
        currentRef.current.style.display = 'block';
        gsap.set(currentRef.current, {
          opacity: 0,
          x: isForward ? 40 : -40,
          scale: 0.95,
        });

        tl.to(
          currentRef.current,
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.35,
            ease: 'power3.out',
          },
          '-=0.15'
        );
      }
    } else if (currentRef.current && prevStep === currentStep) {
      // First render
      if (currentRef.current) {
        currentRef.current.style.display = 'block';
        gsap.fromTo(
          currentRef.current,
          {
            opacity: 0,
            x: 30,
            scale: 0.98,
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power3.out',
          }
        );
      }
    }

    // Animate header
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }

    // Animate icon
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0.8, rotation: -10 },
        { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }

    prevStepRef.current = currentStep;
  }, [currentStep, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setVerificationMethod('EMAIL');
      setOtp('');
      setOtpVerified(false);
      setOtpError('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setIdentifier('');
      prevStepRef.current = 1;
      // Don't reset cooldown - keep it running
    }
  }, [isOpen]);

  // Clear error when button becomes disabled due to cooldown
  useEffect(() => {
    if (otpCooldown > 0 && otpError) {
      // Clear error when cooldown starts (button is disabled)
      setOtpError('');
    }
  }, [otpCooldown]); // Only run when cooldown changes

  // Cooldown timer effect - save to localStorage and update state
  useEffect(() => {
    if (otpCooldown > 0) {
      const cooldownKey = `otp_cooldown_${userEmail || userPhone}_${verificationMethod}`;
      const expiresAt = Date.now() + otpCooldown * 1000;
      
      // Save to localStorage
      localStorage.setItem(cooldownKey, JSON.stringify({ expiresAt }));
      
      const timer = setTimeout(() => {
        setOtpCooldown(otpCooldown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Cooldown finished, remove from localStorage
      const cooldownKey = `otp_cooldown_${userEmail || userPhone}_${verificationMethod}`;
      localStorage.removeItem(cooldownKey);
    }
  }, [otpCooldown, userEmail, userPhone, verificationMethod]);

  // Set default verification method based on available user info
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      if (userEmail && !userPhone) {
        setVerificationMethod('EMAIL');
      } else if (userPhone && !userEmail) {
        setVerificationMethod('PHONE');
      }
    }
  }, [isOpen, currentStep, userEmail, userPhone]);

  const handleSendOTP = async () => {
    // Check if button is disabled - if so, don't proceed and don't show error
    if (otpLoading || otpCooldown > 0) {
      // Button is disabled due to loading or cooldown - no need to show error
      return;
    }

    if (!verificationMethod) {
      // No toast - user must select a method (button is disabled if no method available)
      return;
    }

    // Check if user has the selected verification method
    if (verificationMethod === 'EMAIL' && !userEmail) {
      // No toast - button is already disabled if email doesn't exist
      return;
    }

    if (verificationMethod === 'PHONE' && !userPhone) {
      // No toast - button is already disabled if phone doesn't exist
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const response = await userService.sendOTPForPasswordChange(verificationMethod);
      
      if (response.success) {
        setIdentifier(response.data.identifier);
        setCurrentStep(2);
        // Set cooldown from response or default to 60 seconds
        const retryAfter = response.data?.retryAfter || 60;
        setOtpCooldown(retryAfter);
        // Save to localStorage will be handled by useEffect
        // No toast - message is already shown on modal (step 2)
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Không thể gửi OTP';
      
      // Handle rate limit error - extract cooldown from response
      if (error.response?.status === 429 && error.response?.data?.data?.retryAfter) {
        setOtpCooldown(error.response.data.data.retryAfter);
      }
      
      setOtpError(errorMessage);
      // No toast - error is already shown in OTPInput component
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue: string) => {
    try {
      setOtpSuccessLoading(true);
      setOtpError('');
      setOtp(otpValue);

      // Store OTP for later verification in the final submit
      // We'll verify it when submitting the password change
      // For now, mark as verified to allow proceeding to password step
      setOtpVerified(true);
      setCurrentStep(3);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Mã OTP không đúng';
      setOtpError(errorMessage);
      setOtpVerified(false);
    } finally {
      setOtpSuccessLoading(false);
    }
  };

  const handleResendOTP = async () => {
    await handleSendOTP();
  };

  const validatePassword = (password: string): string => {
    if (!password || password.length < 8) {
      return 'Mật khẩu phải có ít nhất 8 ký tự';
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 chữ thường';
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 chữ hoa';
    }

    if (!/(?=.*\d)/.test(password)) {
      return 'Mật khẩu phải có ít nhất 1 số';
    }

    return '';
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordError('');
    
    if (value) {
      const error = validatePassword(value);
      if (error) {
        setPasswordError(error);
      }
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setPasswordError('');
    
    if (value && newPassword && value !== newPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới');
      return;
    }

    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!otp || otp.length !== 6) {
      // No toast - error will be shown when user goes back to step 2
      setCurrentStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      setPasswordError('');

      const response = await userService.changePasswordWithOTP({
        verificationMethod,
        otp,
        newPassword,
      });

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: response.message || 'Mật khẩu đã được thay đổi thành công',
            duration: 3000,
          });
        }
        onClose();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Không thể đổi mật khẩu';
      
      // Check if it's an OTP error
      if (errorMessage.includes('OTP') || errorMessage.includes('otp') || errorMessage.includes('mã')) {
        setOtpError(errorMessage);
        setCurrentStep(2);
        // No toast - error is already shown in OTPInput component via otpError prop
      } else {
        // Password errors (including duplicate password) - only show in error message, no toast
        setPasswordError(errorMessage);
        // No toast - error is already displayed in the form via passwordError
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) {
      return { strength: 0, label: '', color: '' };
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) strength++;

    if (strength <= 2) {
      return { strength, label: 'Yếu', color: 'bg-red-500' };
    } else if (strength <= 3) {
      return { strength, label: 'Trung bình', color: 'bg-yellow-500' };
    } else {
      return { strength, label: 'Mạnh', color: 'bg-green-500' };
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (!isOpen && !modalRef.current) return null;

  return (
    <div
      ref={modalRef}
      className='fixed inset-0 z-[100000] flex items-center justify-center p-5'
      style={{ display: isOpen ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <div
        ref={backdropRef}
        className='fixed inset-0 bg-black/80 backdrop-blur-sm'
        style={{ opacity: 0 }}
      />
      <div
        ref={contentRef}
        className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm relative'
        style={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
            {/* Close Button */}
            <button
              className='absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 shadow-sm hover:shadow-md'
              onClick={onClose}
            >
              <svg
                className='w-5 h-5'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>

            <div className='p-5'>
              {/* Header */}
              <div ref={headerRef} className='text-center mb-4'>
                <div
                  ref={iconRef}
                  className='inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-3 shadow-md'
                >
                  <Key className='w-6 h-6 text-white' />
                </div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-1'>
                  Đổi mật khẩu
                </h2>
                <p className='text-xs text-gray-600 dark:text-gray-400 font-space-grotesk'>
                  {currentStep === 1 && 'Chọn phương thức xác thực'}
                  {currentStep === 2 && 'Nhập mã OTP để xác thực'}
                  {currentStep === 3 && 'Nhập mật khẩu mới'}
                </p>
              </div>

              {/* Step 1: Choose Verification Method */}
              {currentStep === 1 && (
                <div ref={step1Ref}>
                    <div className='space-y-3'>
                      <div className='space-y-2'>
                        <button
                          type='button'
                          onClick={() => setVerificationMethod('EMAIL')}
                          disabled={!userEmail}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2.5 ${
                            verificationMethod === 'EMAIL'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-600'
                          } ${!userEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              verificationMethod === 'EMAIL'
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {verificationMethod === 'EMAIL' && (
                              <div className='w-1.5 h-1.5 rounded-full bg-white'></div>
                            )}
                          </div>
                          <Mail className='w-4 h-4 text-gray-700 dark:text-gray-300 flex-shrink-0' />
                          <div className='flex-1 text-left min-w-0'>
                            <div className='text-sm font-semibold text-gray-900 dark:text-white font-space-grotesk truncate'>
                              Email
                            </div>
                            <div className='text-xs text-gray-500 dark:text-gray-400 font-space-grotesk truncate'>
                              {userEmail ? userEmail.replace(/(.{2})(.*)(@.*)/, '$1****$3') : 'Chưa cập nhật'}
                            </div>
                          </div>
                        </button>

                      <button
                        type='button'
                        onClick={() => setVerificationMethod('PHONE')}
                        disabled={!userPhone}
                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2.5 ${
                          verificationMethod === 'PHONE'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-600'
                        } ${!userPhone ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            verificationMethod === 'PHONE'
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {verificationMethod === 'PHONE' && (
                            <div className='w-1.5 h-1.5 rounded-full bg-white'></div>
                          )}
                        </div>
                        <Phone className='w-4 h-4 text-gray-700 dark:text-gray-300 flex-shrink-0' />
                        <div className='flex-1 text-left min-w-0'>
                          <div className='text-sm font-semibold text-gray-900 dark:text-white font-space-grotesk truncate'>
                            Số điện thoại
                          </div>
                          <div className='text-xs text-gray-500 dark:text-gray-400 font-space-grotesk truncate'>
                            {userPhone ? userPhone.replace(/(\d{4})(\d+)/, '****$2') : 'Chưa cập nhật'}
                          </div>
                        </div>
                      </button>
                    </div>

                    <button
                      type='button'
                      onClick={handleSendOTP}
                      disabled={otpLoading || otpCooldown > 0 || (!userEmail && verificationMethod === 'EMAIL') || (!userPhone && verificationMethod === 'PHONE')}
                      className='w-full py-2.5 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-space-grotesk'
                    >
                      {otpLoading 
                        ? 'Đang gửi...' 
                        : otpCooldown > 0 
                          ? `Gửi lại sau ${otpCooldown}s` 
                          : 'Gửi mã OTP'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {currentStep === 2 && (
                <div ref={step2Ref} className='space-y-4' style={{ display: 'none' }}>
                    <div className='text-center'>
                      <div className='inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg mb-2 shadow-sm'>
                        <Shield className='w-5 h-5 text-white' />
                      </div>
                      <h3 className='text-base font-bold text-gray-900 dark:text-white font-space-grotesk mb-1'>
                        Xác thực {verificationMethod === 'EMAIL' ? 'Email' : 'Số điện thoại'}
                      </h3>
                      <p className='text-xs text-gray-600 dark:text-gray-400 font-space-grotesk'>
                        Mã OTP đã được gửi đến{' '}
                        <span className='font-semibold text-orange-500 dark:text-orange-400'>
                          {identifier || (verificationMethod === 'EMAIL' ? userEmail : userPhone)}
                        </span>
                      </p>
                    </div>

                    <OTPInput
                      length={6}
                      onComplete={handleVerifyOTP}
                      onResend={handleResendOTP}
                      isLoading={otpLoading}
                      isSuccessLoading={otpSuccessLoading}
                      error={otpError}
                      resendCooldown={60}
                      isVerified={otpVerified}
                      value={otp}
                    />

                    <div className='flex gap-2 pt-1'>
                      <button
                        type='button'
                        onClick={() => {
                          setCurrentStep(1);
                          setOtp('');
                          setOtpVerified(false);
                          setOtpError('');
                        }}
                        className='flex-1 py-2 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-lg border border-gray-300 dark:border-white/20 transition-all duration-200 font-space-grotesk'
                      >
                        Quay lại
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          if (otpVerified) {
                            setCurrentStep(3);
                          }
                        }}
                        disabled={!otpVerified}
                        className='flex-1 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-space-grotesk'
                      >
                        Tiếp theo
                      </button>
                    </div>
                </div>
              )}

              {/* Step 3: New Password */}
              {currentStep === 3 && (
                <form
                  ref={step3Ref}
                  onSubmit={handleSubmit}
                  className='space-y-3'
                  style={{ display: 'none' }}
                >
                    <div className='space-y-1.5'>
                      <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 font-space-grotesk'>
                        Mật khẩu mới <span className='text-orange-500'>*</span>
                      </label>
                      <div className='relative'>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => handlePasswordChange(e.target.value)}
                          className={`w-full px-3 py-2 pr-10 rounded-lg border-2 transition-all duration-200 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-space-grotesk ${
                            passwordError
                              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                              : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                          } focus:outline-none`}
                          placeholder='Nhập mật khẩu mới'
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        >
                          {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                      </div>
                      {newPassword && (
                        <div className='flex items-center gap-2'>
                          <div className='flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'>
                            <div
                              className={`h-full transition-all duration-200 ${passwordStrength.color}`}
                              style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className='text-xs font-medium text-gray-600 dark:text-gray-400 font-space-grotesk whitespace-nowrap'>
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className='space-y-1.5'>
                      <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 font-space-grotesk'>
                        Xác nhận mật khẩu <span className='text-orange-500'>*</span>
                      </label>
                      <div className='relative'>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => handleConfirmPasswordChange(e.target.value)}
                          className={`w-full px-3 py-2 pr-10 rounded-lg border-2 transition-all duration-200 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-space-grotesk ${
                            passwordError
                              ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                              : 'border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
                          } focus:outline-none`}
                          placeholder='Nhập lại mật khẩu mới'
                        />
                        <button
                          type='button'
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        >
                          {showConfirmPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                      </div>
                    </div>

                    {passwordError && (
                      <div className='p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
                        <p className='text-xs text-red-600 dark:text-red-400 font-space-grotesk'>
                          {passwordError}
                        </p>
                      </div>
                    )}

                    <div className='flex gap-2 pt-1'>
                      <button
                        type='button'
                        onClick={() => {
                          setCurrentStep(2);
                          setPasswordError('');
                        }}
                        className='flex-1 py-2 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-lg border border-gray-300 dark:border-white/20 transition-all duration-200 font-space-grotesk'
                      >
                        Quay lại
                      </button>
                      <button
                        type='submit'
                        disabled={isSubmitting || !newPassword || !confirmPassword || !!passwordError}
                        className='flex-1 py-2 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-space-grotesk'
                      >
                        {isSubmitting ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                </form>
              )}
            </div>
          </div>
    </div>
  );
}

