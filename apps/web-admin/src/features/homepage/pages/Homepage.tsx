import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import bannerBg from '../../../assets/images/banner-bg.jpg';
import classImg1 from '../../../assets/images/classes/class-1.jpg';
import classImg2 from '../../../assets/images/classes/class-2.jpg';
import classImg3 from '../../../assets/images/classes/class-3.jpg';
import classImg4 from '../../../assets/images/classes/class-4.jpg';
import classImg5 from '../../../assets/images/classes/class-5.jpg';
import galleryImg1 from '../../../assets/images/gallery/gallery-1.jpg';
import galleryImg2 from '../../../assets/images/gallery/gallery-2.jpg';
import galleryImg3 from '../../../assets/images/gallery/gallery-3.jpg';
import galleryImg4 from '../../../assets/images/gallery/gallery-4.jpg';
import galleryImg5 from '../../../assets/images/gallery/gallery-5.jpg';
import galleryImg6 from '../../../assets/images/gallery/gallery-6.jpg';
import heroImg1 from '../../../assets/images/hero/hero-1.jpg';
import heroImg2 from '../../../assets/images/hero/hero-2.jpg';
import logoImg from '../../../assets/images/logo-text.png';
import teamImg1 from '../../../assets/images/team/team-1.jpg';
import teamImg2 from '../../../assets/images/team/team-2.jpg';
import teamImg3 from '../../../assets/images/team/team-3.jpg';
import teamImg4 from '../../../assets/images/team/team-4.jpg';
import teamImg5 from '../../../assets/images/team/team-5.jpg';
import teamImg6 from '../../../assets/images/team/team-6.jpg';
import { ImagePopup } from '../../../components/ImagePopup';
import { OwlCarousel } from '../../../components/OwlCarousel';
import { SearchModal } from '../../../components/SearchModal';
import LanguageSelector from '../../../components/common/LanguageSelector';
import { ButtonLoading, PageLoading } from '../../../components/ui/AppLoading';
import { useNavigation } from '../../../context/NavigationContext';
import { useHomepageReact } from '../../../hooks/useHomepageReact';
import { useTranslation } from '../../../hooks/useTranslation';
import type { MembershipPlan } from '../../../services/billing.service';
import { billingService } from '../../../services/billing.service';
import { PlanCard } from '../components';
import { HeroSlider } from '../components/HeroSlider';
import '../styles/homepage.css';

const Homepage: React.FC = () => {
  const { searchModal, searchIconClicked, handleSearchClick } = useHomepageReact();
  const { setIsNavigating } = useNavigation();
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState<boolean>(false);
  const [plansError, setPlansError] = useState<string | null>(null);

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

  // Fetch plans from API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setPlansLoading(true);
        setPlansError(null);
        const response = await billingService.getActivePlans();
        if (response.success && response.data) {
          // Transform plans to ensure compatibility
          const transformedPlans = response.data.map((plan: any) => {
            // Convert benefits array to features if needed
            let features = plan.features || [];
            if (plan.benefits && Array.isArray(plan.benefits)) {
              features = plan.benefits;
            }

            return {
              ...plan,
              duration_days:
                plan.duration_days ||
                (plan.duration_months ? plan.duration_months * 30 : undefined),
              features: features,
            };
          });
          setPlans(transformedPlans);
        } else {
          setPlansError(t('homepage.pricing.error'));
        }
      } catch (error: any) {
        console.error('Error loading plans:', error);
        
        // Handle specific error types
        if (error.code === 'ERR_CONNECTION_REFUSED' || error.isConnectionRefused) {
          setPlansError(
            'Không thể kết nối đến server. Vui lòng kiểm tra xem server có đang chạy không hoặc thử lại sau.'
          );
        } else if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.isBlocked) {
          setPlansError(
            'Request bị chặn bởi trình chặn quảng cáo. Vui lòng tắt ad blocker cho localhost:8080 hoặc thử lại.'
          );
        } else if (error.code === 'ERR_CORS' || error.isCorsError) {
          setPlansError(
            'Request bị chặn bởi CORS policy. Vui lòng kiểm tra cấu hình CORS trên server.'
          );
        } else if (error.code === 'ERR_FORBIDDEN' || error.status === 403) {
          setPlansError(
            'Truy cập bị từ chối. Vui lòng kiểm tra quyền truy cập hoặc đăng nhập lại.'
          );
        } else if (error.code === 'ERR_NETWORK' || error.isNetworkError) {
          setPlansError(
            'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'
          );
        } else {
          setPlansError(t('homepage.pricing.error'));
        }
      } finally {
        setPlansLoading(false);
      }
    };

    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const openImagePopup = (imageSrc: string) => {
    setSelectedImage(imageSrc);
  };

  const closeImagePopup = () => {
    setSelectedImage(null);
  };

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

  return (
    <div className='homepage-wrapper'>
      {/* Page Preloder */}
      <div id='preloder'>
        <PageLoading />
      </div>

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
                  <li className='active'>
                    <Link to='/'>{t('homepage.navigation.home')}</Link>
                  </li>
                  <li>
                    <Link to='/about'>{t('homepage.navigation.aboutUs')}</Link>
                  </li>
                  <li>
                    <Link to='/classes'>{t('homepage.navigation.classes')}</Link>
                  </li>
                  <li>
                    <Link to='/services'>{t('homepage.navigation.services')}</Link>
                  </li>
                  <li>
                    <Link to='/team'>{t('homepage.navigation.ourTeam')}</Link>
                  </li>
                  <li>
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

      {/* Hero Section Begin */}
      <section className='hero-section'>
        <HeroSlider
          autoplay={true}
          autoplayTimeout={5000}
          slides={[
            {
              backgroundImage: heroImg1,
              span: t('homepage.hero.title'),
              title: `<span style = "color: #f36100;">${t(
                'homepage.hero.subtitlePart1'
              )}</span><br/>${t('homepage.hero.subtitlePart2')}`,
              buttonText: t('homepage.hero.button'),
              buttonLink: '/auth',
            },
            {
              backgroundImage: heroImg2,
              span: t('homepage.hero.equipment'),
              title: `<span style = "color: #f36100;">${t('homepage.hero.training')}</span>`,
              buttonText: t('homepage.hero.explore'),
              buttonLink: '/auth',
            },
          ]}
        />
      </section>

      {/* ChoseUs Section Begin */}
      <section className='choseus-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='section-title'>
                <span>{t('homepage.features.subtitle')}</span>
                <h2>{t('homepage.features.title')}</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-034-stationary-bike'></span>
                <h4>{t('homepage.features.iot')}</h4>
                <p>{t('homepage.features.iotDescription')}</p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-033-juice'></span>
                <h4>{t('homepage.features.ai')}</h4>
                <p>{t('homepage.features.aiDescription')}</p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-002-dumbell'></span>
                <h4>{t('homepage.features.management')}</h4>
                <p>{t('homepage.features.managementDescription')}</p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-014-heart-beat'></span>
                <h4>{t('homepage.features.security')}</h4>
                <p>{t('homepage.features.securityDescription')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section Begin */}
      <section className='classes-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='section-title'>
                <span>{t('homepage.classes.title')}</span>
                <h2>{t('homepage.classes.subtitle')}</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg1} alt={t('homepage.classes.weightlifting')} />
                </div>
                <div className='ci-text'>
                  <span>{t('homepage.classes.strength')}</span>
                  <h5>{t('homepage.classes.weightlifting')}</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg2} alt={t('homepage.classes.indoorCycling')} />
                </div>
                <div className='ci-text'>
                  <span>{t('homepage.classes.cardio')}</span>
                  <h5>{t('homepage.classes.indoorCycling')}</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg3} alt={t('homepage.classes.kettlebellPower')} />
                </div>
                <div className='ci-text'>
                  <span>{t('homepage.classes.strength')}</span>
                  <h5>{t('homepage.classes.kettlebellPower')}</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-1'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg4} alt={t('homepage.classes.indoorCycling')} />
                </div>
                <div className='ci-text'>
                  <span>{t('homepage.classes.cardio')}</span>
                  <h4>{t('homepage.classes.indoorCycling')}</h4>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-1'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg5} alt={t('homepage.classes.boxing')} />
                </div>
                <div className='ci-text'>
                  <span>{t('homepage.classes.training')}</span>
                  <h4>{t('homepage.classes.boxing')}</h4>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Banner Section Begin */}
      <section className='banner-section set-bg' style={{ backgroundImage: `url(${bannerBg})` }}>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full text-center'>
              <div className='bs-text'>
                <h2>{t('homepage.banner.title')}</h2>
                <div className='bt-tips'>{t('homepage.banner.subtitle')}</div>
                <Link to='/auth' className='primary-btn btn-normal'>
                  {t('homepage.banner.button')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section Begin */}
      <section className='pricing-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='section-title'>
                <span>{t('homepage.pricing.subtitle')}</span>
                <h2>{t('homepage.pricing.title')}</h2>
              </div>
            </div>
          </div>
          {plansLoading ? (
            <div className='flex justify-center items-center py-12'>
              <div className='text-center'>
                <PageLoading />
                <p className='mt-4 text-gray-600'>{t('homepage.pricing.loading')}</p>
              </div>
            </div>
          ) : plansError ? (
            <div className='flex justify-center items-center py-12'>
              <div className='text-center'>
                <p className='text-red-600 mb-4'>{plansError}</p>
                <button
                  onClick={() => {
                    setPlansError(null);
                    setPlansLoading(true);
                    billingService
                      .getActivePlans()
                      .then(response => {
                        if (response.success && response.data) {
                          const transformedPlans = response.data.map((plan: any) => {
                            let features = plan.features || [];
                            if (plan.benefits && Array.isArray(plan.benefits)) {
                              features = plan.benefits;
                            }
                            return {
                              ...plan,
                              duration_days:
                                plan.duration_days ||
                                (plan.duration_months ? plan.duration_months * 30 : undefined),
                              features: features,
                            };
                          });
                          setPlans(transformedPlans);
                        } else {
                          setPlansError(t('homepage.pricing.error'));
                        }
                      })
                      .catch((error: any) => {
                        console.error('Error loading plans:', error);
                        if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.isBlocked) {
                          setPlansError(
                            'Request bị chặn bởi trình chặn quảng cáo. Vui lòng tắt ad blocker cho localhost:8080 hoặc thử lại.'
                          );
                        } else if (error.code === 'ERR_NETWORK' || error.isNetworkError) {
                          setPlansError(
                            'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'
                          );
                        } else {
                          setPlansError(t('homepage.pricing.error'));
                        }
                      })
                      .finally(() => {
                        setPlansLoading(false);
                      });
                  }}
                  className='px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors'
                >
                  <i className='fa fa-refresh mr-2'></i>
                  Thử lại
                </button>
              </div>
            </div>
          ) : plans.length === 0 ? (
            <div className='flex justify-center items-center py-12'>
              <div className='text-center text-gray-600'>
                <p>{t('homepage.pricing.noPlans')}</p>
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center'>
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery Section Begin */}
      <div className='gallery-section'>
        <div className='gallery'>
          <div className='grid-sizer'></div>
          <div
            className='gs-item grid-wide set-bg'
            style={{ backgroundImage: `url(${galleryImg1})` }}
          >
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg1)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
          <div className='gs-item set-bg' style={{ backgroundImage: `url(${galleryImg2})` }}>
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg2)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
          <div className='gs-item set-bg' style={{ backgroundImage: `url(${galleryImg3})` }}>
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg3)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
          <div className='gs-item set-bg' style={{ backgroundImage: `url(${galleryImg4})` }}>
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg4)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
          <div className='gs-item set-bg' style={{ backgroundImage: `url(${galleryImg5})` }}>
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg5)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
          <div
            className='gs-item grid-wide set-bg'
            style={{ backgroundImage: `url(${galleryImg6})` }}
          >
            <div className='thumb-icon image-popup' onClick={() => openImagePopup(galleryImg6)}>
              <i className='fa fa-picture-o'></i>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section Begin */}
      <section className='team-section spad'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='w-full'>
            <div className='w-full'>
              <div className='team-title flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-20'>
                <div className='section-title'>
                  <span>{t('homepage.team.title')}</span>
                  <h2>{t('homepage.team.subtitle')}</h2>
                </div>
                <Link to='/team' className='primary-btn btn-normal appoinment-btn'>
                  {t('homepage.team.appointment')}
                </Link>
              </div>
            </div>
          </div>
          <div className='w-full relative z-10 mt-8'>
            <div className='row'>
              <OwlCarousel
                autoplay={true}
                autoplayTimeout={5000}
                loop={true}
                nav={false}
                dots={true}
                className='ts-slider'
                smartSpeed={1200}
                items={3}
                dotsEach={2}
                responsive={{
                  320: { items: 1 },
                  768: { items: 2 },
                  992: { items: 3 },
                }}
              >
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg1})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg2})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg3})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg4})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg5})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg6})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>{t('homepage.team.trainer')}</span>
                    </div>
                  </div>
                </div>
              </OwlCarousel>
            </div>
          </div>
        </div>
      </section>

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

      {/* Search Modal */}
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.closeModal} />

      {/* Image Popup */}
      <ImagePopup src={selectedImage || ''} isOpen={!!selectedImage} onClose={closeImagePopup} />
    </div>
  );
};

export default Homepage;
