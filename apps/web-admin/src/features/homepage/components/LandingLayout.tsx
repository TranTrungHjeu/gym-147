import React, { ReactNode, useEffect } from 'react';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';
import '../styles/homepage.css';

interface LandingLayoutProps {
  children: ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  // Add homepage-active class to body and html when component mounts
  useEffect(() => {
    document.body.classList.add('homepage-active');
    document.documentElement.classList.add('homepage-active');

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('homepage-active');
      document.documentElement.classList.remove('homepage-active');
    };
  }, []);

  return (
    <div className='homepage-wrapper'>
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
};

