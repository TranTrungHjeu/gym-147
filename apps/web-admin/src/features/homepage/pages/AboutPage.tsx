import React from 'react';
import { Link } from 'react-router-dom';
import heroImg1 from '../../../assets/images/hero/hero-1.jpg';
import { LandingLayout } from '../components/LandingLayout';
import { useTranslation } from '../../../hooks/useTranslation';

const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className='hero-section set-bg' style={{ backgroundImage: `url(${heroImg1})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='hs-text'>
            <h2>
              <span>{t('aboutPage.hero.span')}</span>
              <span style={{ color: '#f36100' }}>{t('aboutPage.hero.title')}</span>
            </h2>
            <p className='text-white text-lg mb-6'>{t('aboutPage.hero.subtitle')}</p>
            <Link to='/contact' className='primary-btn'>
              {t('aboutPage.hero.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-12'>
              <span>{t('aboutPage.about.span')}</span>
              <h2>{t('aboutPage.about.title')}</h2>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
              <div>
                <p className='text-white mb-4 leading-relaxed'>
                  {t('aboutPage.about.description1')}
                </p>
                <p className='text-white mb-4 leading-relaxed'>
                  {t('aboutPage.about.description2')}
                </p>
                <p className='text-white leading-relaxed'>
                  {t('aboutPage.about.description3')}
                </p>
              </div>
              <div className='relative'>
                <div className='bg-[#0a0a0a] rounded-lg p-8 border border-[#f36100]/20'>
                  <h3 className='text-2xl font-bold text-[#f36100] mb-4'>
                    {t('aboutPage.about.missionTitle')}
                  </h3>
                  <p className='text-white leading-relaxed'>
                    {t('aboutPage.about.mission')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-12'>
              <span>{t('aboutPage.technology.span')}</span>
              <h2>{t('aboutPage.technology.title')}</h2>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              <div className='text-center'>
                <div className='bg-[#f36100] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <i className='fa fa-microchip text-white text-3xl'></i>
                </div>
                <h4 className='font-bold mb-2 text-white'>{t('aboutPage.technology.iot')}</h4>
                <p className='text-white/80 text-sm'>
                  {t('aboutPage.technology.iotDesc')}
                </p>
              </div>
              <div className='text-center'>
                <div className='bg-[#f36100] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <i className='fa fa-robot text-white text-3xl'></i>
                </div>
                <h4 className='font-bold mb-2 text-white'>{t('aboutPage.technology.ai')}</h4>
                <p className='text-white/80 text-sm'>
                  {t('aboutPage.technology.aiDesc')}
                </p>
              </div>
              <div className='text-center'>
                <div className='bg-[#f36100] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <i className='fa fa-database text-white text-3xl'></i>
                </div>
                <h4 className='font-bold mb-2 text-white'>{t('aboutPage.technology.data')}</h4>
                <p className='text-white/80 text-sm'>
                  {t('aboutPage.technology.dataDesc')}
                </p>
              </div>
              <div className='text-center'>
                <div className='bg-[#f36100] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <i className='fa fa-shield-alt text-white text-3xl'></i>
                </div>
                <h4 className='font-bold mb-2 text-white'>{t('aboutPage.technology.security')}</h4>
                <p className='text-white/80 text-sm'>
                  {t('aboutPage.technology.securityDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-12'>
              <span>{t('aboutPage.values.span')}</span>
              <h2>{t('aboutPage.values.title')}</h2>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
              <div className='text-center'>
                <div className='mb-4'>
                  <i className='fa fa-heart text-[#f36100] text-5xl'></i>
                </div>
                <h3 className='text-xl font-bold mb-3 text-white'>{t('aboutPage.values.value1Title')}</h3>
                <p className='text-white/80'>
                  {t('aboutPage.values.value1Desc')}
                </p>
              </div>
              <div className='text-center'>
                <div className='mb-4'>
                  <i className='fa fa-star text-[#f36100] text-5xl'></i>
                </div>
                <h3 className='text-xl font-bold mb-3 text-white'>{t('aboutPage.values.value2Title')}</h3>
                <p className='text-white/80'>
                  {t('aboutPage.values.value2Desc')}
                </p>
              </div>
              <div className='text-center'>
                <div className='mb-4'>
                  <i className='fa fa-lightbulb text-[#f36100] text-5xl'></i>
                </div>
                <h3 className='text-xl font-bold mb-3 text-white'>{t('aboutPage.values.value3Title')}</h3>
                <p className='text-white/80'>
                  {t('aboutPage.values.value3Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='banner-section set-bg bg-[#0a0a0a]'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full text-center'>
            <div className='bs-text'>
              <h2>{t('aboutPage.cta.title')}</h2>
              <div className='bt-tips'>{t('aboutPage.cta.subtitle')}</div>
              <Link to='/contact' className='primary-btn btn-normal'>
                {t('aboutPage.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default AboutPage;

