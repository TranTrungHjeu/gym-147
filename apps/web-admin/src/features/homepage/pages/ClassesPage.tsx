import React from 'react';
import { Link } from 'react-router-dom';
import classImg1 from '../../../assets/images/classes/class-1.jpg';
import classImg2 from '../../../assets/images/classes/class-2.jpg';
import classImg3 from '../../../assets/images/classes/class-3.jpg';
import classImg4 from '../../../assets/images/classes/class-4.jpg';
import classImg5 from '../../../assets/images/classes/class-5.jpg';
import heroImg2 from '../../../assets/images/hero/hero-2.jpg';
import { LandingLayout } from '../components/LandingLayout';
import { useTranslation } from '../../../hooks/useTranslation';

const ClassesPage: React.FC = () => {
  const { t } = useTranslation();

  const classes = [
    {
      id: 1,
      image: classImg1,
      category: 'strength',
      name: 'weightlifting',
      description: 'classesPage.classes.weightliftingDesc',
    },
    {
      id: 2,
      image: classImg2,
      category: 'cardio',
      name: 'indoorCycling',
      description: 'classesPage.classes.indoorCyclingDesc',
    },
    {
      id: 3,
      image: classImg3,
      category: 'strength',
      name: 'kettlebellPower',
      description: 'classesPage.classes.kettlebellPowerDesc',
    },
    {
      id: 4,
      image: classImg4,
      category: 'cardio',
      name: 'indoorCycling',
      description: 'classesPage.classes.indoorCyclingDesc',
    },
    {
      id: 5,
      image: classImg5,
      category: 'training',
      name: 'boxing',
      description: 'classesPage.classes.boxingDesc',
    },
  ];

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className='hero-section set-bg' style={{ backgroundImage: `url(${heroImg2})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='hs-text'>
            <h2>
              <span>{t('classesPage.hero.span')}</span>
              <span style={{ color: '#f36100' }}>{t('classesPage.hero.title')}</span>
            </h2>
            <p className='text-white text-lg mb-6'>{t('classesPage.hero.subtitle')}</p>
            <Link to='/auth' className='primary-btn'>
              {t('classesPage.hero.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Classes Grid Section */}
      <section className='classes-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='section-title'>
                <span>{t('classesPage.classes.title')}</span>
                <h2>{t('classesPage.classes.subtitle')}</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {classes.map(classItem => (
              <div key={classItem.id} className='w-full'>
                <div className='class-item'>
                  <div className='ci-pic'>
                    <img src={classItem.image} alt={t(`homepage.classes.${classItem.name}`)} />
                  </div>
                  <div className='ci-text'>
                    <span>{t(`homepage.classes.${classItem.category}`)}</span>
                    <h5>{t(`homepage.classes.${classItem.name}`)}</h5>
                    <p className='text-sm text-white/80 mt-2 mb-4'>
                      {t(classItem.description)}
                    </p>
                    <Link to='/auth' className='primary-btn'>
                      {t('classesPage.classes.register')}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-12'>
              <span>{t('classesPage.schedule.span')}</span>
              <h2>{t('classesPage.schedule.title')}</h2>
            </div>
            <div className='bg-[#0a0a0a] rounded-lg border border-[#f36100]/20 p-8'>
              <p className='text-center text-white mb-6'>
                {t('classesPage.schedule.description')}
              </p>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-center'>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                  <div key={day} className='p-4 bg-[#1a1a1a] rounded border border-[#f36100]/10'>
                    <h4 className='font-bold mb-2 text-white'>{t(`classesPage.schedule.${day}`)}</h4>
                    <p className='text-sm text-white/80'>
                      {t('classesPage.schedule.time')}
                    </p>
                  </div>
                ))}
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
              <h2>{t('classesPage.cta.title')}</h2>
              <div className='bt-tips'>{t('classesPage.cta.subtitle')}</div>
              <Link to='/auth' className='primary-btn btn-normal'>
                {t('classesPage.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default ClassesPage;

