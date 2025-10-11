import { useEffect, useRef, useState } from 'react';
// OTPInput component with success loading state

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  isSuccessLoading?: boolean; // New prop for success loading state
  error?: string;
  disabled?: boolean;
  resendCooldown?: number; // in seconds
  isVerified?: boolean; // New prop to track verification status
  value?: string; // OTP value from parent component
}

export default function OTPInput({
  length = 6,
  onComplete,
  onResend,
  isLoading = false,
  isSuccessLoading = false,
  error,
  disabled = false,
  resendCooldown = 60,
  isVerified = false,
  value = '',
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-focus first input
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Sync OTP value from parent component
  useEffect(() => {
    if (value && value.length === length) {
      const otpArray = value.split('').slice(0, length);
      setOtp(otpArray);
    }
  }, [value, length]);

  const handleChange = (index: number, value: string) => {
    if (disabled || isLoading || isSuccessLoading) return;

    // Only allow single digit
    const newValue = value.replace(/[^0-9]/g, '').slice(0, 1);

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);

    // Move to next input
    if (newValue && index < length - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    const otpString = newOtp.join('');
    const isComplete = otpString.length === length && !newOtp.includes('');

    if (isComplete) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading || isSuccessLoading) return;

    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous input
        setActiveIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled || isLoading || isSuccessLoading) return;

    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, length);

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length && i < length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      // Focus last filled input
      const lastFilledIndex = Math.min(pastedData.length - 1, length - 1);
      setActiveIndex(lastFilledIndex);
      inputRefs.current[lastFilledIndex]?.focus();

      // Check if complete
      const otpString = newOtp.join('');
      const isComplete = otpString.length === length && !newOtp.includes('');

      if (isComplete) {
        onComplete(otpString);
      }
    }
  };

  const handleResend = () => {
    if (cooldown > 0 || disabled || isLoading || isSuccessLoading) return;

    setOtp(new Array(length).fill(''));
    setActiveIndex(0);
    setCooldown(resendCooldown);
    onResend();

    // Focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  return (
    <div className='space-y-4'>
      {/* OTP Input Fields */}
      <div className='flex justify-center space-x-2'>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => (inputRefs.current[index] = el)}
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => setActiveIndex(index)}
            disabled={disabled || isLoading || isSuccessLoading}
            className={`w-12 h-12 text-center text-lg font-semibold border-2 rounded-xl transition-all duration-300 focus:outline-none ${
              error
                ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 animate-pulse'
                : activeIndex === index
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-lg scale-105'
                  : digit
                    ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-md'
                    : 'border-gray-300 dark:border-white/20 bg-white/80 dark:bg-white/10 text-gray-800 dark:text-white'
            } ${
              disabled || isLoading || isSuccessLoading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:border-orange-300 dark:hover:border-orange-500 hover:scale-105'
            }`}
            maxLength={1}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className='flex items-center justify-center space-x-1'>
          <svg
            className='w-4 h-4 text-red-500 dark:text-red-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
          <p className='text-red-600 dark:text-red-300 text-sm'>{error}</p>
        </div>
      )}

      {/* Resend Button */}
      <div className='text-center'>
        <button
          type='button'
          onClick={handleResend}
          disabled={cooldown > 0 || disabled || isLoading || isSuccessLoading}
          className={`text-sm font-medium transition-colors duration-200 ${
            cooldown > 0 || disabled || isLoading || isSuccessLoading
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300'
          }`}
        >
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã OTP'}
        </button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className='flex items-center justify-center space-x-2 animate-fade-in'>
          <div className='w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin'></div>
          <span className='text-orange-600 dark:text-orange-400 text-sm font-medium'>
            Đang xác thực...
          </span>
        </div>
      )}

      {/* Success Loading Indicator */}
      {isSuccessLoading && (
        <div className='flex items-center justify-center space-x-2 animate-fade-in'>
          <div className='w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin'></div>
          <span className='text-green-600 dark:text-green-400 text-sm font-medium'>
            Xác thực thành công! Đang chuyển tiếp...
          </span>
        </div>
      )}

      {/* Success Animation */}
      {isVerified && !isLoading && !isSuccessLoading && !error && (
        <div className='flex items-center justify-center space-x-2 animate-fade-in-up'>
          <div className='w-5 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center animate-bounce shadow-lg'>
            <svg className='w-3 h-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                clipRule='evenodd'
              />
            </svg>
          </div>
          <span className='text-green-600 dark:text-green-400 text-sm font-semibold'>
            Xác thực thành công!
          </span>
        </div>
      )}
    </div>
  );
}
