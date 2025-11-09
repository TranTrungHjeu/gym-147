import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeTogglerTwo from '../../components/common/ThemeTogglerTwo';
import AuthContainer from '../../components/auth/AuthContainer';
import AuthAnimation from '@/assets/animation-gym147-2.mp4';
import LogoText from '@/assets/images/logo-text.png';

export default function AuthLayout() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='relative h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black font-space-grotesk'>
      {/* Background Elements */}
      <div className='absolute inset-0 overflow-hidden'>
        {/* Floating Orbs */}
        <div
          className={`absolute top-20 left-20 w-32 h-32 bg-blue-400/20 dark:bg-orange-400/30 rounded-full blur-xl transition-all duration-1000 ${isLoaded ? 'animate-pulse' : 'opacity-0'}`}
        ></div>
        <div
          className={`absolute top-40 right-32 w-24 h-24 bg-orange-400/30 dark:bg-orange-300/40 rounded-full blur-lg transition-all duration-1200 delay-300 ${isLoaded ? 'animate-bounce' : 'opacity-0'}`}
        ></div>
        <div
          className={`absolute bottom-32 left-1/3 w-40 h-40 bg-purple-400/15 dark:bg-orange-500/25 rounded-full blur-2xl transition-all duration-1500 delay-500 ${isLoaded ? 'animate-pulse' : 'opacity-0'}`}
        ></div>

        {/* Grid Pattern */}
        <div className='absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10'></div>

        {/* Gradient Overlay */}
        <div className='absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent dark:from-black/90 dark:via-black/50'></div>
      </div>

      <div className='relative flex flex-col justify-center w-full h-full lg:flex-row'>
        {/* Left Side - Form */}
        <div
          className={`flex-1 flex items-center justify-center p-4 py-8 transition-all duration-1000 ${isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}
        >
          <AuthContainer />
        </div>

        {/* Right Side - Video & Branding */}
        <div
          className={`hidden lg:flex lg:w-1/2 items-center justify-center relative transition-all duration-1200 delay-300 ${isLoaded ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}
        >
          {/* Video Background */}
          <div className='absolute inset-0 overflow-hidden'>
            <video
              autoPlay
              muted
              loop
              playsInline
              className='absolute inset-0 w-full h-full object-cover'
            >
              <source src={AuthAnimation} type='video/mp4' />
            </video>
            <div className='absolute inset-0 bg-gradient-to-t from-white/60 via-white/20 to-transparent dark:from-black/70 dark:via-black/30'></div>
          </div>

          {/* Branding Content */}
          <div className='relative z-10 text-center max-w-lg px-8'>
            {/* Logo */}
            <div className='mb-8'>
              <Link
                to='/'
                className='inline-block transition-transform duration-300 hover:scale-105'
              >
                <div className='flex items-center justify-center mb-4'>
                  <img
                    src={LogoText}
                    alt='Gym 147 Logo'
                    className='h-16 w-auto object-contain drop-shadow-lg'
                  />
                </div>
              </Link>
            </div>

            {/* Features */}
            <div className='space-y-6 mb-8'>
              <div className='flex items-center space-x-4 text-gray-800 dark:text-white/90 backdrop-blur-sm bg-white/80 dark:bg-white/15 rounded-xl p-3 border border-gray-200 dark:border-white/30'>
                <div className='w-10 h-10 bg-orange-500/20 dark:bg-orange-400/40 rounded-xl flex items-center justify-center backdrop-blur-sm'>
                  <svg className='w-6 h-6 text-orange-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <span className='text-lg font-medium '>TẬP LUYỆN CHUYÊN NGHIỆP</span>
              </div>

              <div className='flex items-center space-x-4 text-gray-800 dark:text-white/90 backdrop-blur-sm bg-white/80 dark:bg-white/15 rounded-xl p-3 border border-gray-200 dark:border-white/30'>
                <div className='w-10 h-10 bg-orange-500/20 dark:bg-orange-400/40 rounded-xl flex items-center justify-center backdrop-blur-sm'>
                  <svg className='w-6 h-6 text-orange-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <span className='text-lg font-medium '>NÂNG CẤP THỂ CHẤT</span>
              </div>

              <div className='flex items-center space-x-4 text-gray-800 dark:text-white/90 backdrop-blur-sm bg-white/80 dark:bg-white/15 rounded-xl p-3 border border-gray-200 dark:border-white/30'>
                <div className='w-10 h-10 bg-orange-500/20 dark:bg-orange-400/40 rounded-xl flex items-center justify-center backdrop-blur-sm'>
                  <svg className='w-6 h-6 text-orange-400' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <span className='text-lg font-medium '>GIÁO TRÌNH CHUYÊN NGHIỆP</span>
              </div>
            </div>

            {/* Quote */}
            <div className='backdrop-blur-sm bg-white/10 rounded-2xl p-6 border border-white/20'>
              <blockquote className='text-white/90 text-lg italic  leading-relaxed'>
                "Your body can do it. It's your mind that you have to convince."
              </blockquote>
              <cite className='text-orange-400 text-sm mt-3 block font-semibold font-space-grotesk'>
                TRUNG HIEU TRAN
              </cite>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className='absolute top-20 right-20 w-3 h-3 bg-orange-400 rounded-full animate-ping shadow-lg'></div>
          <div className='absolute bottom-32 left-20 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-lg'></div>
          <div className='absolute top-1/2 right-10 w-4 h-4 bg-orange-300/50 rounded-full animate-bounce shadow-lg'></div>
        </div>

        {/* Theme Toggle */}
        <div className='fixed z-50 top-6 right-6'>
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
