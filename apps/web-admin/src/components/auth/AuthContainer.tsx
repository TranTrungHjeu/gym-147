import { useEffect, useState } from 'react';
import ForgotPasswordForm from './ForgotPasswordForm';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

export default function AuthContainer() {
  const [currentForm, setCurrentForm] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
  const [clearErrors, setClearErrors] = useState(false);
  const [autoFillCredentials, setAutoFillCredentials] = useState<
    { email?: string; phone?: string; password?: string } | undefined
  >();

  const switchForm = (
    formType: 'signin' | 'signup' | 'forgot-password',
    credentials?: { email?: string; phone?: string; password?: string }
  ) => {
    if (formType === currentForm) return;
    console.log('Switching from', currentForm, 'to', formType);

    // Clear errors when switching forms
    setClearErrors(true);
    setCurrentForm(formType);

    // Set auto-fill credentials if provided
    if (credentials) {
      setAutoFillCredentials(credentials);
    } else {
      setAutoFillCredentials(undefined);
    }
  };

  // Reset clearErrors after forms have processed it
  useEffect(() => {
    if (clearErrors) {
      const timer = setTimeout(() => setClearErrors(false), 100);
      return () => clearTimeout(timer);
    }
  }, [clearErrors]);

  // Clear autoFillCredentials after it's been used
  useEffect(() => {
    if (autoFillCredentials) {
      const timer = setTimeout(() => setAutoFillCredentials(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [autoFillCredentials]);

  return (
    <div className='relative w-full max-w-md min-h-[800px] overflow-visible'>
      {/* Sign In Form */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          currentForm === 'signin' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        <SignInForm
          onSwitchToSignUp={() => switchForm('signup')}
          onSwitchToForgotPassword={() => switchForm('forgot-password')}
          clearErrors={clearErrors}
          autoFillCredentials={autoFillCredentials}
        />
      </div>

      {/* Sign Up Form */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          currentForm === 'signup' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <SignUpForm
          onSwitchToSignIn={credentials => switchForm('signin', credentials)}
          clearErrors={clearErrors}
        />
      </div>

      {/* Forgot Password Form */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          currentForm === 'forgot-password'
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0'
        }`}
      >
        <ForgotPasswordForm
          onSwitchToSignIn={() => switchForm('signin')}
          clearErrors={clearErrors}
        />
      </div>
    </div>
  );
}
