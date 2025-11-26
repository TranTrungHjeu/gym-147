import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../../../assets/images/logo-text.png';
import { useTranslation } from '../../../hooks/useTranslation';

export const LandingFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* Get In Touch Section Begin */}
      <div className='gettouch-section'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='grid grid-cols-1 md:grid-cols-3 '>
            <div className='w-full'>
              <div className='gt-text'>
                <i className='fa fa-map-marker'></i>
                <p>{t('homepage.contact.address')}</p>
              </div>
            </div>
            <div className='w-full'>
              <div className='gt-text'>
                <i className='fa fa-mobile'></i>
                <ul>
                  <li>{t('homepage.contact.phone1')}</li>
                  <li>{t('homepage.contact.phone2')}</li>
                </ul>
              </div>
            </div>
            <div className='w-full'>
              <div className='gt-text email'>
                <i className='fa fa-envelope'></i>
                <p>{t('homepage.contact.email')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section Begin */}
      <section className='footer-section'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6'>
            <div className='lg:col-span-2'>
              <div className='fs-about'>
                <div className='fa-logo flex items-center'>
                  <Link to='/'>
                    <img
                      src={logoImg}
                      alt='GYM 147'
                      style={{
                        maxHeight: '60px',
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                      }}
                      className='max-w-full h-auto'
                    />
                  </Link>
                </div>
                <p>{t('homepage.footer.description')}</p>
                <div className='fa-social'>
                  <a href='#'>
                    <i className='fa fa-facebook'></i>
                  </a>
                  <a href='#'>
                    <i className='fa fa-twitter'></i>
                  </a>
                  <a href='#'>
                    <i className='fa fa-youtube-play'></i>
                  </a>
                  <a href='#'>
                    <i className='fa fa-instagram'></i>
                  </a>
                  <a href='#'>
                    <i className='fa fa-envelope-o'></i>
                  </a>
                </div>
              </div>
            </div>
            <div className='w-full'>
              <div className='fs-widget'>
                <h4>{t('homepage.footer.usefulLinks')}</h4>
                <ul>
                  <li>
                    <Link to='/about'>{t('homepage.footer.about')}</Link>
                  </li>
                  <li>
                    <Link to='/classes'>{t('homepage.footer.classes')}</Link>
                  </li>
                  <li>
                    <Link to='/services'>{t('homepage.footer.services')}</Link>
                  </li>
                  <li>
                    <Link to='/contact'>{t('homepage.footer.contact')}</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full'>
              <div className='fs-widget'>
                <h4>{t('homepage.footer.support')}</h4>
                <ul>
                  <li>
                    <Link to='/auth'>{t('homepage.footer.login')}</Link>
                  </li>
                  <li>
                    <a href='#'>{t('homepage.footer.account')}</a>
                  </li>
                  <li>
                    <a href='#'>{t('homepage.footer.signup')}</a>
                  </li>
                  <li>
                    <Link to='/contact'>{t('homepage.footer.contact')}</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-2'>
              <div className='fs-widget'>
                <h4>{t('homepage.footer.technology')}</h4>
                <div className='fw-recent'>
                  <h6>
                    <a href='#'>{t('homepage.footer.iotArticle')}</a>
                  </h6>
                  <ul>
                    <li>{t('homepage.footer.readTime', { count: 3 })}</li>
                    <li>{t('homepage.footer.comments', { count: 20 })}</li>
                  </ul>
                </div>
                <div className='fw-recent'>
                  <h6>
                    <a href='#'>{t('homepage.footer.aiArticle')}</a>
                  </h6>
                  <ul>
                    <li>{t('homepage.footer.readTime', { count: 5 })}</li>
                    <li>{t('homepage.footer.comments', { count: 15 })}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className='w-full'>
            <div className='w-full text-center'>
              <div className='copyright-text'>
                <p>{t('homepage.footer.copyright', { year: new Date().getFullYear() })}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

