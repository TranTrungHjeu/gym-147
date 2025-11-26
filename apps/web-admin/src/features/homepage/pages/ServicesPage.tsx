import React from 'react';
import { Link } from 'react-router-dom';
import heroImg1 from '../../../assets/images/hero/hero-1.jpg';
import { LandingLayout } from '../components/LandingLayout';
import { useTranslation } from '../../../hooks/useTranslation';

const ServicesPage: React.FC = () => {
  const { t } = useTranslation();

  const services = [
    {
      id: 1,
      icon: 'flaticon-034-stationary-bike',
      title: 'iot',
      description: 'iotDescription',
      details: 'servicesPage.services.iotDetails',
    },
    {
      id: 2,
      icon: 'flaticon-033-juice',
      title: 'ai',
      description: 'aiDescription',
      details: 'servicesPage.services.aiDetails',
    },
    {
      id: 3,
      icon: 'flaticon-002-dumbell',
      title: 'management',
      description: 'managementDescription',
      details: 'servicesPage.services.managementDetails',
    },
    {
      id: 4,
      icon: 'flaticon-014-heart-beat',
      title: 'security',
      description: 'securityDescription',
      details: 'servicesPage.services.securityDetails',
    },
  ];

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className='hero-section set-bg' style={{ backgroundImage: `url(${heroImg1})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='hs-text'>
            <h2>
              <span>{t('servicesPage.hero.span')}</span>
              <span style={{ color: '#f36100' }}>{t('servicesPage.hero.title')}</span>
            </h2>
            <p className='text-white text-lg mb-6'>{t('servicesPage.hero.subtitle')}</p>
            <Link to='/contact' className='primary-btn'>
              {t('servicesPage.hero.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className='choseus-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='section-title'>
                <span>{t('servicesPage.services.span')}</span>
                <h2>{t('servicesPage.services.title')}</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            {services.map(service => (
              <div key={service.id} className='w-full'>
                <div className='cs-item'>
                  <span className={service.icon}></span>
                  <h4>{t(`homepage.features.${service.title}`)}</h4>
                  <p>{t(`homepage.features.${service.description}`)}</p>
                  <div className='mt-4 pt-4 border-t border-white/10'>
                    <p className='text-sm text-white/80'>
                      {t(service.details)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Link Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full text-center'>
            <div className='section-title mb-8'>
              <span>{t('servicesPage.pricing.span')}</span>
              <h2>{t('servicesPage.pricing.title')}</h2>
            </div>
            <p className='text-white mb-6 max-w-2xl mx-auto'>
              {t('servicesPage.pricing.description')}
            </p>
            <Link to='/' className='primary-btn btn-normal'>
              {t('servicesPage.pricing.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='banner-section set-bg bg-[#0a0a0a]'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full text-center'>
            <div className='bs-text'>
              <h2>{t('servicesPage.cta.title')}</h2>
              <div className='bt-tips'>{t('servicesPage.cta.subtitle')}</div>
              <Link to='/contact' className='primary-btn btn-normal'>
                {t('servicesPage.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default ServicesPage;

