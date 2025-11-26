import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../../../assets/images/logo-text.png';
import { SearchModal } from '../../../components/SearchModal';
import LanguageSelector from '../../../components/common/LanguageSelector';
import { ButtonLoading } from '../../../components/ui/AppLoading';
import { useNavigation } from '../../../context/NavigationContext';
import { useHomepageReact } from '../../../hooks/useHomepageReact';
import { useTranslation } from '../../../hooks/useTranslation';

export const LandingHeader: React.FC = () => {
  const { searchModal, searchIconClicked, handleSearchClick } = useHomepageReact();
  const { setIsNavigating } = useNavigation();
  const { t } = useTranslation();
  const location = useLocation();
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);

  const toggleNotification = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const closeNotification = () => {
    setIsNotificationOpen(false);
  };

  const handleLoginClick = () => {
    setIsLoginLoading(true);
    setIsNavigating(true);

    // Reset loading state after navigation
    setTimeout(() => {
      setIsLoginLoading(false);
    }, 2000);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Error Notification System */}
      {isNotificationOpen && (
        <div className='error-notification-container'>
          <div className='error-notification-header'>
            <h3>
              <i className='fa fa-exclamation-triangle'></i> {t('homepage.notification.title')}
            </h3>
            <button className='error-close' onClick={closeNotification}>
              <i className='fa fa-times'></i>
            </button>
          </div>
          <div className='error-notification-content'>
            <div className='error-item error-warning'>
              <i className='fa fa-warning'></i>
              <span>{t('homepage.notification.maintenance')}</span>
            </div>
            <div className='error-item error-info'>
              <i className='fa fa-info-circle'></i>
              <span>{t('homepage.notification.newFeature')}</span>
            </div>
            <div className='error-item error-success'>
              <i className='fa fa-check-circle'></i>
              <span>{t('homepage.notification.systemNormal')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header Section Begin */}
      <header className='header-section'>
        <div className='w-full px-4'>
          <div className='flex flex-wrap items-center'>
            <div className='w-full lg:w-1/4'>
              <div className='logo'>
                <Link to='/'>
                  <img
                    src={logoImg}
                    alt='GYM 147'
                    style={{
                      maxHeight: '70px',
                      width: 'auto',
                      height: 'auto',
                      maxWidth: '100%',
                    }}
                    className='max-w-full h-auto'
                  />
                </Link>
              </div>
            </div>
            <div className='w-full lg:w-1/2'>
              <nav className='nav-menu'>
                <ul>
                  <li className={isActive('/') ? 'active' : ''}>
                    <Link to='/'>{t('homepage.navigation.home')}</Link>
                  </li>
                  <li className={isActive('/about') ? 'active' : ''}>
                    <Link to='/about'>{t('homepage.navigation.aboutUs')}</Link>
                  </li>
                  <li className={isActive('/classes') ? 'active' : ''}>
                    <Link to='/classes'>{t('homepage.navigation.classes')}</Link>
                  </li>
                  <li className={isActive('/services') ? 'active' : ''}>
                    <Link to='/services'>{t('homepage.navigation.services')}</Link>
                  </li>
                  <li className={isActive('/team') ? 'active' : ''}>
                    <Link to='/team'>{t('homepage.navigation.ourTeam')}</Link>
                  </li>
                  <li className={isActive('/contact') ? 'active' : ''}>
                    <Link to='/contact'>{t('homepage.navigation.contact')}</Link>
                  </li>
                </ul>
              </nav>
            </div>
            <div className='w-full lg:w-1/4'>
              <div className='flex items-center justify-end gap-4 flex-nowrap'>
                <div
                  className='to-search search-switch cursor-pointer p-2 rounded-full bg-white/10 border border-white/20 flex items-center justify-center w-10 h-10'
                  onClick={handleSearchClick}
                  style={{
                    transform: searchIconClicked ? 'scale(0.9)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <i className='fa fa-search text-white text-base'></i>
                </div>
                <div
                  className='notification-icon-btn cursor-pointer p-2 rounded-full bg-white/10 border border-white/20 flex items-center justify-center w-10 h-10 relative'
                  onClick={toggleNotification}
                  style={{
                    transform: isNotificationOpen ? 'scale(0.9)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <i className='fa fa-bell text-white text-base'></i>
                  <span className='notification-badge'>3</span>
                </div>
                <div className='language-selector-wrapper'>
                  <LanguageSelector />
                </div>
                <div className='to-login'>
                  <Link to='/auth' className='login-btn' onClick={handleLoginClick}>
                    {isLoginLoading ? (
                      <ButtonLoading />
                    ) : (
                      <>
                        <i className='fa fa-user'></i> {t('homepage.header.login')}
                      </>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.closeModal} />
    </>
  );
};

