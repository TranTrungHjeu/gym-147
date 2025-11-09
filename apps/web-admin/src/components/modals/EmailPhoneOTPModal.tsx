import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Mail, Phone, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import OTPInput from '../auth/OTPInput';
import { userService } from '../../services/user.service';

interface EmailPhoneOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
  userPhone?: string;
  newEmail?: string;
  newPhone?: string;
  firstName?: string;
  lastName?: string;
}

export default function EmailPhoneOTPModal({
  isOpen,
  onClose,
  onSuccess,
  userEmail,
  userPhone,
  newEmail,
  newPhone,
  firstName,
  lastName,
}: EmailPhoneOTPModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccessLoading, setOtpSuccessLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Determine what's changing
  const emailChanging = newEmail && newEmail !== userEmail;
  const phoneChanging = newPhone && newPhone !== userPhone;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setVerificationMethod('EMAIL');
      setOtp('');
      setOtpVerified(false);
      setOtpError('');
      setOtpLoading(false);
      setOtpSuccessLoading(false);
      setIdentifier('');
      setOtpCooldown(0);
    }
  }, [isOpen]);

  // Load cooldown from localStorage on component mount
  useEffect(() => {
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
  }, [userEmail, userPhone, verificationMethod]);

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

  // Set default verification method
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      if (emailChanging && userEmail) {
        setVerificationMethod('EMAIL');
      } else if (phoneChanging && userPhone) {
        setVerificationMethod('PHONE');
      } else if (userEmail && !userPhone) {
        setVerificationMethod('EMAIL');
      } else if (userPhone && !userEmail) {
        setVerificationMethod('PHONE');
      }
    }
  }, [isOpen, currentStep, userEmail, userPhone, emailChanging, phoneChanging]);

  const handleSendOTP = async () => {
    if (otpLoading || otpCooldown > 0) {
      return;
    }

    if (!verificationMethod) {
      return;
    }

    if (verificationMethod === 'EMAIL' && !userEmail) {
      return;
    }

    if (verificationMethod === 'PHONE' && !userPhone) {
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');
      const response = await userService.sendOTPForEmailPhoneChange(verificationMethod, newEmail, newPhone);
      
      if (response.success) {
        setIdentifier(response.data.identifier);
        setCurrentStep(2);
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
        newEmail,
        newPhone,
        firstName,
        lastName,
      });

      if (response.success) {
        setOtpVerified(true);
        setTimeout(() => {
          onSuccess();
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
                  <Shield className='w-6 h-6 text-white' />
                </motion.div>
                <h2 className='text-xl font-bold text-gray-900 dark:text-white font-space-grotesk mb-1'>
                  Xác thực thay đổi
                </h2>
                <p className='text-xs text-gray-600 dark:text-gray-400 font-space-grotesk'>
                  {currentStep === 1 && 'Chọn phương thức xác thực'}
                  {currentStep === 2 && 'Nhập mã OTP để xác thực'}
                </p>
              </motion.div>

              {/* Change Summary */}
              {(emailChanging || phoneChanging) && currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800'
                >
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='w-1.5 h-1.5 rounded-full bg-orange-500'></div>
                    <p className='text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide font-space-grotesk'>
                      Thay đổi được yêu cầu
                    </p>
                  </div>
                  <div className='space-y-1.5 text-xs'>
                    {emailChanging && (
                      <div className='flex items-center gap-2 text-gray-700 dark:text-gray-300 font-space-grotesk'>
                        <Mail className='w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0' />
                        <span className='flex-1 truncate'>{userEmail}</span>
                        <ArrowRight className='w-3.5 h-3.5 text-orange-500 flex-shrink-0' />
                        <span className='flex-1 truncate font-semibold'>{newEmail}</span>
                      </div>
                    )}
                    {phoneChanging && (
                      <div className='flex items-center gap-2 text-gray-700 dark:text-gray-300 font-space-grotesk'>
                        <Phone className='w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0' />
                        <span className='flex-1 truncate'>{userPhone}</span>
                        <ArrowRight className='w-3.5 h-3.5 text-orange-500 flex-shrink-0' />
                        <span className='flex-1 truncate font-semibold'>{newPhone}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 1: Choose verification method */}
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 2: OTP Verification */}
              <AnimatePresence mode='wait'>
                {currentStep === 2 && (
                  <motion.div
                    key='step-2'
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
                        onClick={() => setCurrentStep(1)}
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
