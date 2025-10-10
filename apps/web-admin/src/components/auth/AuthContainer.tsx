import { useState } from 'react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

export default function AuthContainer() {
  const [currentForm, setCurrentForm] = useState<'signin' | 'signup'>('signin');

  const switchForm = (formType: 'signin' | 'signup') => {
    if (formType === currentForm) return;
    console.log('Switching from', currentForm, 'to', formType);
    setCurrentForm(formType);
  };

  return (
    <div className='relative w-full max-w-md min-h-[800px] overflow-visible'>
      {/* Sign In Form */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          currentForm === 'signin' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        <SignInForm onSwitchToSignUp={() => switchForm('signup')} />
      </div>

      {/* Sign Up Form */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-in-out ${
          currentForm === 'signup' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <SignUpForm onSwitchToSignIn={() => switchForm('signin')} />
      </div>
    </div>
  );
}
