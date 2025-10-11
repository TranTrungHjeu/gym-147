import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageLoading, ButtonLoading } from '../../../components/ui/AppLoading';
import { useNavigation } from '../../../context/NavigationContext';
import { HeroSlider } from '../components/HeroSlider';
import { ImagePopup } from '../../../components/ImagePopup';
import { OwlCarousel } from '../../../components/OwlCarousel';
import { SearchModal } from '../../../components/SearchModal';
import { useHomepageReact } from '../../../hooks/useHomepageReact';
import '../styles/homepage.css';
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

const Homepage: React.FC = () => {
  const { searchModal, searchIconClicked, handleSearchClick } = useHomepageReact();
  const { setIsNavigating } = useNavigation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [isLoginLoading, setIsLoginLoading] = useState<boolean>(false);

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
              <i className='fa fa-exclamation-triangle'></i> Thông báo hệ thống
            </h3>
            <button className='error-close' onClick={closeNotification}>
              <i className='fa fa-times'></i>
            </button>
          </div>
          <div className='error-notification-content'>
            <div className='error-item error-warning'>
              <i className='fa fa-warning'></i>
              <span>Hệ thống đang bảo trì từ 02:00 - 04:00 ngày 15/12/2024</span>
            </div>
            <div className='error-item error-info'>
              <i className='fa fa-info-circle'></i>
              <span>Cập nhật tính năng mới: AI Coaching cá nhân</span>
            </div>
            <div className='error-item error-success'>
              <i className='fa fa-check-circle'></i>
              <span>Hệ thống hoạt động bình thường</span>
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
                    <Link to='/'>Home</Link>
                  </li>
                  <li>
                    <Link to='/about'>About Us</Link>
                  </li>
                  <li>
                    <Link to='/classes'>Classes</Link>
                  </li>
                  <li>
                    <Link to='/services'>Services</Link>
                  </li>
                  <li>
                    <Link to='/team'>Our Team</Link>
                  </li>
                  <li>
                    <Link to='/contact'>Contact</Link>
                  </li>
                </ul>
              </nav>
            </div>
            <div className='w-full lg:w-1/4'>
              <div className='flex items-center justify-end gap-4'>
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
                <div className='to-login'>
                  <Link to='/auth' className='login-btn' onClick={handleLoginClick}>
                    {isLoginLoading ? (
                      <ButtonLoading />
                    ) : (
                      <>
                        <i className='fa fa-user'></i> Đăng nhập
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
              span: 'HỆ THỐNG GYM 147',
              title: '<span style = "color: #f36100;">CẢI THIỆN</span><br/>SỨC MẠNH',
              buttonText: 'Trải nghiệm ngay',
              buttonLink: '/auth',
            },
            {
              backgroundImage: heroImg2,
              span: 'Thiết bị chuyên nghiệp',
              title: '<span style = "color: #f36100;">TẬP LUYỆN</span> LIÊN TỤC',
              buttonText: 'Khám phá ngay',
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
                <span>Why chose us?</span>
                <h2>CÔNG NGHỆ TIÊN TIẾN CHO PHÒNG GYM</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-034-stationary-bike'></span>
                <h4>Thiết bị IoT thông minh</h4>
                <p>
                  Hệ thống theo dõi thiết bị tự động, cảnh báo bảo trì và tối ưu hóa hiệu suất máy
                  tập.
                </p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-033-juice'></span>
                <h4>AI Coaching cá nhân</h4>
                <p>
                  Hướng dẫn tập luyện thông minh dựa trên dữ liệu cá nhân và mục tiêu của từng thành
                  viên.
                </p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-002-dumbell'></span>
                <h4>Quản lý thông minh</h4>
                <p>Hệ thống quản lý toàn diện từ thành viên, lịch tập đến thanh toán và báo cáo.</p>
              </div>
            </div>
            <div className='w-full'>
              <div className='cs-item'>
                <span className='flaticon-014-heart-beat'></span>
                <h4>Bảo mật cao</h4>
                <p>
                  Kiểm soát ra vào bằng RFID, QR Code và nhận diện khuôn mặt đảm bảo an toàn tuyệt
                  đối.
                </p>
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
                <span>Our Classes</span>
                <h2>WHAT WE CAN OFFER</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg1} alt='Weightlifting' />
                </div>
                <div className='ci-text'>
                  <span>STRENGTH</span>
                  <h5>Weightlifting</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg2} alt='Indoor cycling' />
                </div>
                <div className='ci-text'>
                  <span>Cardio</span>
                  <h5>Indoor cycling</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg3} alt='Kettlebell power' />
                </div>
                <div className='ci-text'>
                  <span>STRENGTH</span>
                  <h5>Kettlebell power</h5>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-1'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg4} alt='Indoor cycling' />
                </div>
                <div className='ci-text'>
                  <span>Cardio</span>
                  <h4>Indoor cycling</h4>
                  <Link to='/classes'>
                    <i className='fa fa-angle-right'></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-1'>
              <div className='class-item'>
                <div className='ci-pic'>
                  <img src={classImg5} alt='Boxing' />
                </div>
                <div className='ci-text'>
                  <span>Training</span>
                  <h4>Boxing</h4>
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
                <h2>registration now to get more deals</h2>
                <div className='bt-tips'>Where health, beauty and fitness meet.</div>
                <Link to='/auth' className='primary-btn btn-normal'>
                  Appointment
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
                <span>Our Plan</span>
                <h2>Choose your pricing plan</h2>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center'>
            <div className='w-full max-w-sm'>
              <div className='ps-item'>
                <h3>Class drop-in</h3>
                <div className='pi-price'>
                  <h2>$ 39.0</h2>
                  <span>SINGLE CLASS</span>
                </div>
                <ul>
                  <li>Free riding</li>
                  <li>Unlimited equipments</li>
                  <li>Personal trainer</li>
                  <li>Weight losing classes</li>
                  <li>Month to mouth</li>
                  <li>No time restriction</li>
                </ul>
                <Link to='/auth' className='primary-btn pricing-btn'>
                  Enroll now
                </Link>
                <a href='#' className='thumb-icon'>
                  <i className='fa fa-picture-o'></i>
                </a>
              </div>
            </div>
            <div className='w-full max-w-sm'>
              <div className='ps-item'>
                <h3>12 Month unlimited</h3>
                <div className='pi-price'>
                  <h2>$ 99.0</h2>
                  <span>SINGLE CLASS</span>
                </div>
                <ul>
                  <li>Free riding</li>
                  <li>Unlimited equipments</li>
                  <li>Personal trainer</li>
                  <li>Weight losing classes</li>
                  <li>Month to mouth</li>
                  <li>No time restriction</li>
                </ul>
                <Link to='/auth' className='primary-btn pricing-btn'>
                  Enroll now
                </Link>
                <a href='#' className='thumb-icon'>
                  <i className='fa fa-picture-o'></i>
                </a>
              </div>
            </div>
            <div className='w-full max-w-sm'>
              <div className='ps-item'>
                <h3>6 Month unlimited</h3>
                <div className='pi-price'>
                  <h2>$ 59.0</h2>
                  <span>SINGLE CLASS</span>
                </div>
                <ul>
                  <li>Free riding</li>
                  <li>Unlimited equipments</li>
                  <li>Personal trainer</li>
                  <li>Weight losing classes</li>
                  <li>Month to mouth</li>
                  <li>No time restriction</li>
                </ul>
                <Link to='/auth' className='primary-btn pricing-btn'>
                  Enroll now
                </Link>
                <a href='#' className='thumb-icon'>
                  <i className='fa fa-picture-o'></i>
                </a>
              </div>
            </div>
          </div>
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
                  <span>Our Team</span>
                  <h2>TRAIN WITH EXPERTS</h2>
                </div>
                <Link to='/team' className='primary-btn btn-normal appoinment-btn'>
                  appointment
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
                      <span>Gym Trainer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg2})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>Gym Trainer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg3})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>Gym Trainer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg4})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>Gym Trainer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg5})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>Gym Trainer</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className='ts-item set-bg' style={{ backgroundImage: `url(${teamImg6})` }}>
                    <div className='ts_text'>
                      <h4>Athart Rachel</h4>
                      <span>Gym Trainer</span>
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
                <p>
                  333 Middle Winchendon Rd, Rindge,
                  <br /> NH 03461
                </p>
              </div>
            </div>
            <div className='w-full'>
              <div className='gt-text'>
                <i className='fa fa-mobile'></i>
                <ul>
                  <li>125-711-811</li>
                  <li>125-668-886</li>
                </ul>
              </div>
            </div>
            <div className='w-full'>
              <div className='gt-text email'>
                <i className='fa fa-envelope'></i>
                <p>Support.gymcenter@gmail.com</p>
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
                <p>
                  GYM 147 - Hệ thống quản lý phòng gym thông minh với công nghệ IoT tiên tiến, mang
                  đến trải nghiệm tập luyện hiện đại và hiệu quả nhất.
                </p>
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
                <h4>Liên kết hữu ích</h4>
                <ul>
                  <li>
                    <Link to='/about'>Giới thiệu</Link>
                  </li>
                  <li>
                    <Link to='/classes'>Lớp học</Link>
                  </li>
                  <li>
                    <Link to='/services'>Dịch vụ</Link>
                  </li>
                  <li>
                    <Link to='/contact'>Liên hệ</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full'>
              <div className='fs-widget'>
                <h4>Hỗ trợ</h4>
                <ul>
                  <li>
                    <Link to='/auth'>Đăng nhập</Link>
                  </li>
                  <li>
                    <a href='#'>Tài khoản</a>
                  </li>
                  <li>
                    <a href='#'>Đăng ký</a>
                  </li>
                  <li>
                    <Link to='/contact'>Liên hệ</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className='w-full md:col-span-2 lg:col-span-2'>
              <div className='fs-widget'>
                <h4>Công nghệ & Hướng dẫn</h4>
                <div className='fw-recent'>
                  <h6>
                    <a href='#'>Hệ thống IoT giúp tối ưu hóa việc tập luyện</a>
                  </h6>
                  <ul>
                    <li>3 phút đọc</li>
                    <li>20 Bình luận</li>
                  </ul>
                </div>
                <div className='fw-recent'>
                  <h6>
                    <a href='#'>AI Coaching: Tương lai của việc tập gym</a>
                  </h6>
                  <ul>
                    <li>5 phút đọc</li>
                    <li>15 Bình luận</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className='w-full'>
            <div className='w-full text-center'>
              <div className='copyright-text'>
                <p>Copyright &copy; {new Date().getFullYear()} GYM 147. All rights reserved.</p>
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
