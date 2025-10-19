import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Activity, Calendar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import trainerBackground from '../../assets/images/trainerhome-background.jpg';
import { useSidebar } from '../../context/SidebarContext';
import { userService } from '../../services/user.service';

gsap.registerPlugin(ScrollTrigger);

interface TrainerStats {
  totalClasses: number;
  totalStudents: number;
  rating: number;
  completedSessions: number;
  upcomingClasses: number;
  monthlyRevenue: number;
  achievements: number;
  goalsCompleted: number;
}

export default function TrainerHomePage() {
  const navigate = useNavigate();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<TrainerStats>({
    totalClasses: 0,
    totalStudents: 0,
    rating: 0,
    completedSessions: 0,
    upcomingClasses: 0,
    monthlyRevenue: 0,
    achievements: 0,
    goalsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);

  // GSAP Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchTrainerStats();
  }, []);

  // GSAP Animations
  useEffect(() => {
    if (loading) return;

    const tl = gsap.timeline({ delay: 0.3 });

    // Initial setup - no movement animations
    gsap.set(titleRef.current, {
      opacity: 0,
    });

    gsap.set(subtitleRef.current, {
      opacity: 0,
    });

    gsap.set(buttonsRef.current, {
      opacity: 0,
    });

    // Simple fade in animations
    tl.to(titleRef.current, {
      opacity: 1,
      duration: 1,
      ease: 'power3.out',
    })
      .to(
        subtitleRef.current,
        {
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
        },
        '-=0.5'
      )
      .to(
        buttonsRef.current,
        {
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
        },
        '-=0.3'
      );

    // Gradient sweep animation for title text
    const titleText = titleRef.current?.querySelector('span');
    if (titleText) {
      // Initial setup for gradient sweep
      gsap.set(titleText, {
        backgroundPosition: '200% center',
        backgroundSize: '300% 100%',
      });

      // Create gradient sweep effect that fills the text
      gsap.to(titleText, {
        backgroundPosition: '-200% center',
        duration: 3,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true,
      });
    }

    // Gradient border animation for buttons
    const buttonSpans = buttonsRef.current?.querySelectorAll('span');
    if (buttonSpans) {
      buttonSpans.forEach(span => {
        gsap.to(span, {
          backgroundPosition: 'center, -200% center',
          duration: 2.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        });
      });
    }

    return () => {
      tl.kill();
    };
  }, [loading]);

  const fetchUserProfile = async () => {
    try {
      const response = await userService.getProfile();
      if (response.success) {
        setUser(response.data);
        console.log('User profile:', response.data);
        console.log('User role:', response.data.user.role);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchTrainerStats = async () => {
    try {
      // Fetch real trainer stats from API
      console.log('Fetching trainer stats...');
      const response = await userService.getTrainerStats();
      console.log('Trainer stats response:', response);
      if (response.success) {
        setStats(response.data);
        console.log('Stats set:', response.data);
      } else {
        // Fallback to default values if API fails
        setStats({
          totalClasses: 0,
          totalStudents: 0,
          rating: 0,
          completedSessions: 0,
          upcomingClasses: 0,
          monthlyRevenue: 0,
          achievements: 0,
          goalsCompleted: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      // Fallback to default values on error
      setStats({
        totalClasses: 0,
        totalStudents: 0,
        rating: 0,
        completedSessions: 0,
        upcomingClasses: 0,
        monthlyRevenue: 0,
        achievements: 0,
        goalsCompleted: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500'></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 h-screen w-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900 overflow-hidden transition-all duration-300 ${
        isExpanded || isHovered ? 'lg:ml-[280px]' : 'lg:ml-[80px]'
      } ${isMobileOpen ? 'ml-0' : ''}`}
    >
      {/* Header with Video */}
      <motion.div
        className='relative overflow-hidden h-full w-full flex items-center'
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background Image */}
        <div
          className='absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat'
          style={{
            backgroundImage: `url(${trainerBackground})`,
          }}
        >
          <div className='absolute inset-0 bg-gradient-to-r from-orange-900/50 to-amber-800/40'></div>
        </div>

        {/* Content Overlay */}
        <div className='relative z-10 w-full px-2 sm:px-3 py-4 h-full flex items-center'>
          <div className='max-w-6xl mx-auto w-full'>
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className='text-white'
            >
              <h1
                ref={titleRef}
                className={`font-bold mb-3 text-white drop-shadow-2xl ${
                  isExpanded || isHovered
                    ? 'text-xl lg:text-3xl'
                    : 'text-lg lg:text-2xl xl:text-3xl'
                }`}
                style={{
                  fontFamily:
                    "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Chào mừng trở lại,
                <br />
                <span
                  className='text-transparent bg-clip-text drop-shadow-xl'
                  style={{
                    backgroundSize: '300% 100%',
                    backgroundPosition: '200% center',
                    backgroundImage:
                      'linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {user?.fullName || 'Trainer'}
                </span>
              </h1>
              <p
                ref={subtitleRef}
                className={`text-white/90 mb-4 drop-shadow-lg ${
                  isExpanded || isHovered
                    ? 'text-sm lg:text-base'
                    : 'text-xs lg:text-sm xl:text-base'
                }`}
                style={{
                  fontFamily:
                    "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                Hôm nay bạn có{' '}
                <span
                  className='inline-flex items-center justify-center px-2 py-1 mx-1 text-orange-400 font-bold bg-white/20 rounded-lg border border-orange-300/50 shadow-lg backdrop-blur-sm'
                  style={{
                    fontSize: isExpanded || isHovered ? '16px' : '14px',
                    fontFamily:
                      "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(251, 146, 60, 0.5)',
                  }}
                >
                  {stats.totalClasses}
                </span>{' '}
                lớp học sắp tới. Hãy chuẩn bị thật tốt nhé!
              </p>
              <div
                ref={buttonsRef}
                className={`flex flex-wrap gap-4 ${
                  isExpanded || isHovered ? 'flex-col sm:flex-row' : 'flex-row'
                }`}
                style={{
                  fontFamily:
                    "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                }}
              >
                {/* 3D Flip Button 1 */}
                <div
                  className='relative cursor-pointer'
                  style={{
                    width: isExpanded || isHovered ? '180px' : '150px',
                    height: isExpanded || isHovered ? '45px' : '40px',
                    transition: '4s',
                    transformStyle: 'preserve-3d',
                    transform: 'perspective(1000px) rotateX(0deg)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(360deg)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg)';
                  }}
                  onClick={() => navigate('/dashboard/calendar')}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(360deg) translateZ(12px)',
                    }}
                  >
                    <Calendar className='mr-1.5 w-3 h-3' />
                    Xem lịch dạy
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(270deg) translateZ(12px)',
                    }}
                  >
                    <Calendar className='mr-1.5 w-3 h-3' />
                    Xem lịch dạy
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(180deg) translateZ(12px)',
                    }}
                  >
                    <Calendar className='mr-1.5 w-3 h-3' />
                    Xem lịch dạy
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(90deg) translateZ(12px)',
                    }}
                  >
                    <Calendar className='mr-1.5 w-3 h-3' />
                    Xem lịch dạy
                  </span>
                </div>

                {/* 3D Flip Button 2 */}
                <div
                  className='relative cursor-pointer'
                  style={{
                    width: isExpanded || isHovered ? '180px' : '150px',
                    height: isExpanded || isHovered ? '45px' : '40px',
                    transition: '4s',
                    transformStyle: 'preserve-3d',
                    transform: 'perspective(1000px) rotateX(0deg)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(360deg)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg)';
                  }}
                  onClick={() => navigate('/dashboard/classes')}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(360deg) translateZ(12px)',
                    }}
                  >
                    <Activity className='mr-1.5 w-3 h-3' />
                    Quản lý lớp
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(270deg) translateZ(12px)',
                    }}
                  >
                    <Activity className='mr-1.5 w-3 h-3' />
                    Quản lý lớp
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(180deg) translateZ(12px)',
                    }}
                  >
                    <Activity className='mr-1.5 w-3 h-3' />
                    Quản lý lớp
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      background: 'rgba(15, 15, 15, 0.8)',
                      fontFamily:
                        "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: isExpanded || isHovered ? '13px' : '14px',
                      fontWeight: 'bold',
                      letterSpacing: '1px',
                      transition: '0.5s',
                      border: '2px solid transparent',
                      backgroundImage:
                        'linear-gradient(#f06f05, #f06f05), linear-gradient(90deg, #f06f05, #fbbf24, #fd8d47, #fbbf24, #f06f05)',
                      backgroundSize: '100% 100%, 300% 100%',
                      backgroundPosition: 'center, 200% center',
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      boxSizing: 'border-box',
                      borderRadius: '0px',
                      transform: 'rotateX(90deg) translateZ(12px)',
                    }}
                  >
                    <Activity className='mr-1.5 w-3 h-3' />
                    Quản lý lớp
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
