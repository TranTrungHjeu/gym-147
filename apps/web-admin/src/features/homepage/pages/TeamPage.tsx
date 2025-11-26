import React from 'react';
import { Link } from 'react-router-dom';
import heroImg2 from '../../../assets/images/hero/hero-2.jpg';
import teamImg1 from '../../../assets/images/team/team-1.jpg';
import teamImg2 from '../../../assets/images/team/team-2.jpg';
import teamImg3 from '../../../assets/images/team/team-3.jpg';
import teamImg4 from '../../../assets/images/team/team-4.jpg';
import teamImg5 from '../../../assets/images/team/team-5.jpg';
import teamImg6 from '../../../assets/images/team/team-6.jpg';
import { LandingLayout } from '../components/LandingLayout';
import { OwlCarousel } from '../../../components/OwlCarousel';
import { useTranslation } from '../../../hooks/useTranslation';

const TeamPage: React.FC = () => {
  const { t } = useTranslation();

  const trainers = [
    { id: 1, image: teamImg1, nameKey: 'teamPage.trainers.name1', specialization: 'teamPage.trainers.specialization1' },
    { id: 2, image: teamImg2, nameKey: 'teamPage.trainers.name2', specialization: 'teamPage.trainers.specialization2' },
    { id: 3, image: teamImg3, nameKey: 'teamPage.trainers.name3', specialization: 'teamPage.trainers.specialization3' },
    { id: 4, image: teamImg4, nameKey: 'teamPage.trainers.name4', specialization: 'teamPage.trainers.specialization4' },
    { id: 5, image: teamImg5, nameKey: 'teamPage.trainers.name5', specialization: 'teamPage.trainers.specialization5' },
    { id: 6, image: teamImg6, nameKey: 'teamPage.trainers.name6', specialization: 'teamPage.trainers.specialization6' },
  ];

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className='hero-section set-bg' style={{ backgroundImage: `url(${heroImg2})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='hs-text'>
            <h2>
              <span>{t('teamPage.hero.span')}</span>
              <span style={{ color: '#f36100' }}>{t('teamPage.hero.title')}</span>
            </h2>
            <p className='text-white text-lg mb-6'>{t('teamPage.hero.subtitle')}</p>
            <Link to='/contact' className='primary-btn'>
              {t('teamPage.hero.button')}
            </Link>
          </div>
        </div>
      </section>

      {/* Team Grid Section */}
      <section className='team-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='team-title flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-20'>
                <div className='section-title'>
                  <span>{t('teamPage.team.title')}</span>
                  <h2>{t('teamPage.team.subtitle')}</h2>
                </div>
                <Link to='/contact' className='primary-btn btn-normal appoinment-btn'>
                  {t('teamPage.team.appointment')}
                </Link>
              </div>
            </div>
          </div>
          <div className='w-full relative z-10 mt-8'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {trainers.map(trainer => (
                <div key={trainer.id}>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${trainer.image})` }}>
                    <div className='ts_text'>
                      <h4>{t(trainer.nameKey)}</h4>
                      <span>{t('homepage.team.trainer')}</span>
                      <p className='text-sm mt-2'>{t(trainer.specialization)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-12'>
              <span>{t('teamPage.testimonials.span')}</span>
              <h2>{t('teamPage.testimonials.title')}</h2>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {[1, 2, 3].map(index => (
                <div key={index} className='bg-[#0a0a0a] rounded-lg p-6 border border-[#f36100]/20'>
                  <div className='flex items-center mb-4'>
                    <div className='text-[#f36100] text-2xl mr-2'>★★★★★</div>
                  </div>
                  <p className='text-white mb-4 italic'>
                    {t(`teamPage.testimonials.testimonial${index}`)}
                  </p>
                  <div className='flex items-center'>
                    <div className='w-10 h-10 bg-[#f36100] rounded-full flex items-center justify-center text-white font-bold mr-3'>
                      {index}
                    </div>
                    <div>
                      <h5 className='font-bold text-white'>{t(`teamPage.testimonials.client${index}`)}</h5>
                      <p className='text-sm text-white/80'>
                        {t('teamPage.testimonials.member')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='banner-section set-bg bg-[#0a0a0a]'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full text-center'>
            <div className='bs-text'>
              <h2>{t('teamPage.cta.title')}</h2>
              <div className='bt-tips'>{t('teamPage.cta.subtitle')}</div>
              <Link to='/contact' className='primary-btn btn-normal'>
                {t('teamPage.cta.button')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default TeamPage;

