import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mail, Phone, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import OTPInput from '../auth/OTPInput';
import { userService } from '../../services/user.service';

interface ChangeEmailPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newEmail?: string, newPhone?: string) => void;
  userEmail?: string;
  userPhone?: string;
  type: 'EMAIL' | 'PHONE';
}

export default function ChangeEmailPhoneModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
  userPhone,
  type,
}: ChangeEmailPhoneModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'PHONE'>(
    type === 'EMAIL' ? 'EMAIL' : 'PHONE'
  );
  const [newValue, setNewValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessLoading, setOtpSuccessLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [inputError, setInputError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setNewValue('');
      setOtp('');
      setOtpVerified(false);
      setOtpError('');
      setOtpLoading(false);
      setOtpSuccessLoading(false);
      setIdentifier('');
      setOtpCooldown(0);
      setInputError('');
      setVerificationMethod(type === 'EMAIL' ? 'EMAIL' : 'PHONE');
    }
  }, [isOpen, type]);

  // Load cooldown from localStorage
  useEffect(() => {
    if (!isOpen) return;
    
    const emailKey = userEmail ? `otp_email_phone_change_${userEmail}_EMAIL` : null;
    const phoneKey = userPhone ? `otp_email_phone_change_${userPhone}_PHONE` : null;
    
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
          if (currentKey) localStorage.removeItem(currentKey);
        }
      } catch (error) {
        console.error('Error loading cooldown:', error);
        if (currentKey) localStorage.removeItem(currentKey);
      }
    }
  }, [isOpen, userEmail, userPhone, verificationMethod]);

  // Clear error when button becomes disabled due to cooldown
  useEffect(() => {
    if (otpCooldown > 0 && otpError) {
      setOtpError('');
    }
  }, [otpCooldown]);

  // Cooldown timer effect
  useEffect(() => {
    if (otpCooldown > 0) {
      const cooldownKey = `otp_email_phone_change_${userEmail || userPhone}_${verificationMethod}`;
      const expiresAt = Date.now() + otpCooldown * 1000;
      localStorage.setItem(cooldownKey, JSON.stringify({ expiresAt }));
      
      const timer = setTimeout(() => {
        setOtpCooldown(otpCooldown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      const cooldownKey = `otp_email_phone_change_${userEmail || userPhone}_${verificationMethod}`;
      localStorage.removeItem(cooldownKey);
    }
  }, [otpCooldown, userEmail, userPhone, verificationMethod]);

  const validateInput = (value: string): string => {
    if (type === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) {
        return 'Email không được để trống';
      }
      if (!emailRegex.test(value.trim())) {
        return 'Email không hợp lệ';
      }
      if (value.trim().toLowerCase() === userEmail?.toLowerCase()) {
        return 'Email mới phải khác email hiện tại';
      }
    } else {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!value.trim()) {
        return 'Số điện thoại không được để trống';
      }
      if (!phoneRegex.test(value.trim().replace(/\s+/g, ''))) {
        return 'Số điện thoại không hợp lệ (10-11 chữ số)';
      }
      if (value.trim() === userPhone) {
        return 'Số điện thoại mới phải khác số điện thoại hiện tại';
      }
    }
    return '';
  };

  const handleContinue = async () => {
    const error = validateInput(newValue);
    if (error) {
      setInputError(error);
      return;
    }
    setInputError('');
    
    // Tự động gửi OTP luôn với phương thức mặc định
    // Nếu đổi email thì dùng EMAIL, nếu đổi phone thì dùng PHONE
    const defaultMethod = type === 'EMAIL' ? 'EMAIL' : 'PHONE';
    setVerificationMethod(defaultMethod);
    
    // Gọi handleSendOTP để gửi OTP
    await handleSendOTP();
  };

  const handleSendOTP = async () => {
    if (otpLoading || otpCooldown > 0) {
      return;
    }

    // Tự động set verificationMethod nếu chưa có
    if (!verificationMethod) {
      const defaultMethod = type === 'EMAIL' ? 'EMAIL' : 'PHONE';
      setVerificationMethod(defaultMethod);
    }

    const methodToUse = verificationMethod || (type === 'EMAIL' ? 'EMAIL' : 'PHONE');

    if (methodToUse === 'EMAIL' && !userEmail) {
      setOtpError('Email hiện tại không tồn tại');
      return;
    }

    if (methodToUse === 'PHONE' && !userPhone) {
      setOtpError('Số điện thoại hiện tại không tồn tại');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const response = await userService.sendOTPForEmailPhoneChange(
        methodToUse,
        type === 'EMAIL' ? newValue.trim() : undefined,
        type === 'PHONE' ? newValue.trim() : undefined
      );
      
      if (response.success) {
        setIdentifier(response.data.identifier);
        setCurrentStep(3); // Chuyển thẳng sang step nhập OTP
        const retryAfter = response.data?.retryAfter || 60;
        setOtpCooldown(retryAfter);
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Không thể gửi OTP';
      
      if (error.response?.status === 429 && error.response?.data?.data?.retryAfter) {
        setOtpCooldown(error.response.data.data.retryAfter);
      }
      
      setOtpError(errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue: string) => {
    try {
      setOtpSuccessLoading(true);
      setOtpError('');
      setOtp(otpValue);

      const response = await userService.updateEmailPhoneWithOTP({
        verificationMethod,
        otp: otpValue,
        newEmail: type === 'EMAIL' ? newValue.trim() : undefined,
        newPhone: type === 'PHONE' ? newValue.trim() : undefined,
      });

      if (response.success) {
        setOtpVerified(true);
        setTimeout(() => {
          onSuccess(
            type === 'EMAIL' ? newValue.trim() : undefined,
            type === 'PHONE' ? newValue.trim() : undefined
          );
          onClose();
        }, 500);
      }
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 z-[100000] flex items-center justify-center p-5'
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: 0.3,
            }}
            className='bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm relative'
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              className='absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 shadow-sm hover:shadow-md'
              onClick={onClose}
            >
              <X className='w-5 h-5' />
            </button>

            <div className='p-5'>
              {/* Header */}
              <motion.div
                key={`header-${currentStep}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className='text-center mb-4'
              >
                <motion.div
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className='inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-3 shadow-md'
                >
                  {type === 'EMAIL' ? (
                    <Mail className='w-6 h-6 text-white' />
                  ) : (
                    <Phone className='w-6 h-6 text-white' />
                  )}
                </motion.div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-1'>
                  Đổi {type === 'EMAIL' ? 'Email' : 'Số điện thoại'}
                </h2>
                <p className='text-xs text-gray-600 dark:text-gray-400 font-space-grotesk'>
                  {currentStep === 1 && `Nhập ${type === 'EMAIL' ? 'email' : 'số điện thoại'} mới`}
                  {currentStep === 3 && 'Nhập mã OTP để xác thực'}
                </p>
              </motion.div>

              {/* Step 1: Enter new value */}
              <AnimatePresence mode='wait'>
                {currentStep === 1 && (
                  <motion.div
                    key='step-1'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className='space-y-4'
                  >
                    <div className='space-y-3'>
                      <div>
                        <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 font-space-grotesk mb-2'>
                          {type === 'EMAIL' ? 'Email hiện tại' : 'Số điện thoại hiện tại'}
                        </label>
                        <div className='px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 font-space-grotesk'>
                          {type === 'EMAIL' ? userEmail : userPhone}
                        </div>
                      </div>

                      <div>
                        <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 font-space-grotesk mb-2'>
                          {type === 'EMAIL' ? 'Email mới' : 'Số điện thoại mới'}
                        </label>
                        <input
                          type={type === 'EMAIL' ? 'email' : 'tel'}
                          value={newValue}
                          onChange={e => {
                            setNewValue(e.target.value);
                            setInputError('');
                          }}
                          placeholder={type === 'EMAIL' ? 'example@email.com' : '0123456789'}
                          className={`w-full px-4 py-3 text-sm border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 font-space-grotesk ${
                            inputError
                              ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
                              : 'border-gray-300 dark:border-gray-700 focus:ring-orange-500/30 focus:border-orange-500'
                          }`}
                          autoFocus
                        />
                        {inputError && (
                          <p className='mt-2 text-xs text-red-500 font-space-grotesk'>{inputError}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type='button'
                      onClick={handleContinue}
                      disabled={otpLoading || otpCooldown > 0}
                      className='w-full py-2.5 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-space-grotesk flex items-center justify-center gap-2'
                    >
                      {otpLoading ? (
                        <>
                          <span>Đang gửi OTP...</span>
                        </>
                      ) : otpCooldown > 0 ? (
                        <span>Gửi lại sau {otpCooldown}s</span>
                      ) : (
                        <>
                          <span>Tiếp theo</span>
                          <ArrowRight className='w-4 h-4' />
                        </>
                      )}
                    </button>
                    {otpError && currentStep === 1 && (
                      <p className='mt-2 text-xs text-red-500 font-space-grotesk text-center'>{otpError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 2: Choose verification method */}
              <AnimatePresence mode='wait'>
                {currentStep === 2 && (
                  <motion.div
                    key='step-2'
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className='space-y-4'
                  >
                    <div className='space-y-2'>
                      {userEmail && (
                        <button
                          type='button'
                          onClick={() => setVerificationMethod('EMAIL')}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2.5 ${
                            verificationMethod === 'EMAIL'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-600'
                          }`}
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
                            <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                              {userEmail.replace(/(.{2})(.*)(@.*)/, '$1****$3')}
                            </div>
                          </div>
                        </button>
                      )}

                      {userPhone && (
                        <button
                          type='button'
                          onClick={() => setVerificationMethod('PHONE')}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2.5 ${
                            verificationMethod === 'PHONE'
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-600'
                          }`}
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
                            <div className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                              {userPhone.replace(/(\d{4})(\d+)/, '****$2')}
                            </div>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => setCurrentStep(1)}
                        className='flex-1 py-2.5 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-lg transition-all duration-200 font-space-grotesk'
                      >
                        Quay lại
                      </button>
                      <button
                        type='button'
                        onClick={handleSendOTP}
                        disabled={otpLoading || otpCooldown > 0}
                        className='flex-1 py-2.5 text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-orange-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-space-grotesk'
                      >
                        {otpLoading 
                          ? 'Đang gửi...' 
                          : otpCooldown > 0 
                            ? `Gửi lại sau ${otpCooldown}s` 
                            : 'Gửi mã OTP'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 3: OTP Verification */}
              <AnimatePresence mode='wait'>
                {currentStep === 3 && (
                  <motion.div
                    key='step-3'
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className='space-y-4'
                  >
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
                          setOtpError('');
                        }}
                        className='flex-1 py-2 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-lg transition-all duration-200 font-space-grotesk'
                      >
                        Quay lại
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
