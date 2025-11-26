import React, { useState } from 'react';
import heroImg1 from '../../../assets/images/hero/hero-1.jpg';
import { LandingLayout } from '../components/LandingLayout';
import { useTranslation } from '../../../hooks/useTranslation';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }, 1000);
  };

  return (
    <LandingLayout>
      {/* Hero Section */}
      <section className='hero-section set-bg' style={{ backgroundImage: `url(${heroImg1})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='hs-text'>
            <h2>
              <span>{t('contactPage.hero.span')}</span>
              <span style={{ color: '#f36100' }}>{t('contactPage.hero.title')}</span>
            </h2>
            <p className='text-white text-lg mb-6'>{t('contactPage.hero.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Contact Information & Form Section */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            {/* Contact Information */}
            <div>
              <div className='section-title mb-8'>
                <span>{t('contactPage.info.span')}</span>
                <h2>{t('contactPage.info.title')}</h2>
              </div>
              <div className='space-y-6'>
                <div className='flex items-start'>
                  <div className='bg-[#f36100] w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4'>
                    <i className='fa fa-map-marker text-white'></i>
                  </div>
                  <div>
                    <h4 className='font-bold mb-2 text-white'>{t('contactPage.info.addressTitle')}</h4>
                    <p className='text-white/80'>{t('homepage.contact.address')}</p>
                  </div>
                </div>
                <div className='flex items-start'>
                  <div className='bg-[#f36100] w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4'>
                    <i className='fa fa-mobile text-white text-xl'></i>
                  </div>
                  <div>
                    <h4 className='font-bold mb-2 text-white'>{t('contactPage.info.phoneTitle')}</h4>
                    <p className='text-white/80'>
                      {t('homepage.contact.phone1')}
                      <br />
                      {t('homepage.contact.phone2')}
                    </p>
                  </div>
                </div>
                <div className='flex items-start'>
                  <div className='bg-[#f36100] w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 mr-4'>
                    <i className='fa fa-envelope text-white'></i>
                  </div>
                  <div>
                    <h4 className='font-bold mb-2 text-white'>{t('contactPage.info.emailTitle')}</h4>
                    <p className='text-white/80'>{t('homepage.contact.email')}</p>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className='mt-8 p-6 bg-[#0a0a0a] rounded-lg border border-[#f36100]/20'>
                <h4 className='font-bold mb-4 text-white'>{t('contactPage.info.hoursTitle')}</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between text-white'>
                    <span>{t('contactPage.info.weekdays')}</span>
                    <span className='font-semibold'>{t('contactPage.info.weekdaysTime')}</span>
                  </div>
                  <div className='flex justify-between text-white'>
                    <span>{t('contactPage.info.weekend')}</span>
                    <span className='font-semibold'>{t('contactPage.info.weekendTime')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className='section-title mb-8'>
                <span>{t('contactPage.form.span')}</span>
                <h2>{t('contactPage.form.title')}</h2>
              </div>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div>
                  <label htmlFor='name' className='block text-sm font-medium mb-2 text-white'>
                    {t('contactPage.form.name')}
                  </label>
                  <input
                    type='text'
                    id='name'
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className='w-full px-4 py-2 border border-white/20 bg-[#0a0a0a] rounded-lg focus:ring-2 focus:ring-[#f36100] focus:border-transparent text-white'
                  />
                </div>
                <div>
                  <label htmlFor='email' className='block text-sm font-medium mb-2 text-white'>
                    {t('contactPage.form.email')}
                  </label>
                  <input
                    type='email'
                    id='email'
                    name='email'
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className='w-full px-4 py-2 border border-white/20 bg-[#0a0a0a] rounded-lg focus:ring-2 focus:ring-[#f36100] focus:border-transparent text-white'
                  />
                </div>
                <div>
                  <label htmlFor='phone' className='block text-sm font-medium mb-2 text-white'>
                    {t('contactPage.form.phone')}
                  </label>
                  <input
                    type='tel'
                    id='phone'
                    name='phone'
                    value={formData.phone}
                    onChange={handleInputChange}
                    className='w-full px-4 py-2 border border-white/20 bg-[#0a0a0a] rounded-lg focus:ring-2 focus:ring-[#f36100] focus:border-transparent text-white'
                  />
                </div>
                <div>
                  <label htmlFor='message' className='block text-sm font-medium mb-2 text-white'>
                    {t('contactPage.form.message')}
                  </label>
                  <textarea
                    id='message'
                    name='message'
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className='w-full px-4 py-2 border border-white/20 bg-[#0a0a0a] rounded-lg focus:ring-2 focus:ring-[#f36100] focus:border-transparent text-white'
                  />
                </div>
                {submitStatus === 'success' && (
                  <div className='p-4 bg-green-900/50 border border-green-500/50 text-green-200 rounded-lg'>
                    {t('contactPage.form.success')}
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className='p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg'>
                    {t('contactPage.form.error')}
                  </div>
                )}
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='w-full primary-btn'
                >
                  {isSubmitting ? t('contactPage.form.submitting') : t('contactPage.form.submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className='spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='section-title text-center mb-8'>
              <span>{t('contactPage.map.span')}</span>
              <h2>{t('contactPage.map.title')}</h2>
            </div>
            <div className='bg-[#0a0a0a] rounded-lg border border-[#f36100]/20 h-96 flex items-center justify-center'>
              <p className='text-white/60'>{t('contactPage.map.placeholder')}</p>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
};

export default ContactPage;

