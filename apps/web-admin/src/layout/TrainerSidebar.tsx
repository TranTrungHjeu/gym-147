import {
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  Star,
  User,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoText from '../assets/images/logo-text-2.png';
import logo from '../assets/images/logo.png';
import { useNavigation } from '../context/NavigationContext';
import { useSidebar } from '../context/SidebarContext';
import { getDashboardPath } from '../utils/auth';
import TrainerSidebarWidget from './TrainerSidebarWidget';

// Add CSS keyframes for animations (only once)
if (!document.getElementById('sidebar-animations')) {
  const style = document.createElement('style');
  style.id = 'sidebar-animations';
  style.textContent = `
      @keyframes slideInFromLeft {
        0% {
          transform: translateX(-20px);
          opacity: 0;
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes bounceIn {
        0% {
          transform: scale(0.3);
          opacity: 0;
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      @keyframes ripple {
        0% {
          transform: scale(0);
          opacity: 1;
        }
        100% {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 5px rgba(249, 115, 22, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.6), 0 0 30px rgba(249, 115, 22, 0.4);
        }
      }
    `;
  document.head.appendChild(style);
}

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className='w-5 h-5' />,
    name: 'Dashboard',
    subItems: [{ name: 'Trang chủ', path: '/trainerdashboard/homepage', pro: false }],
  },
  {
    icon: <Calendar className='w-5 h-5' />,
    name: 'Lịch dạy',
    path: '/trainerdashboard/calendar',
  },
  {
    icon: <User className='w-5 h-5' />,
    name: 'Thông tin cá nhân',
    path: '/trainerdashboard/profile',
  },
  {
    name: 'Lớp học',
    icon: <Users className='w-5 h-5' />,
    subItems: [
      { name: 'Danh sách lớp', path: '/trainerdashboard/classes', pro: false },
      { name: 'Lịch dạy chi tiết', path: '/trainerdashboard/schedule', pro: false },
    ],
  },
  {
    name: 'Chứng chỉ',
    icon: <Award className='w-5 h-5' />,
    path: '/trainerdashboard/certifications',
  },
  {
    name: 'Điểm danh',
    icon: <ClipboardList className='w-5 h-5' />,
    subItems: [
      { name: 'Điểm danh học viên', path: '/trainerdashboard/attendance', pro: false },
      { name: 'Danh sách đăng ký', path: '/trainerdashboard/bookings', pro: false },
    ],
  },
  {
    name: 'Đánh giá',
    icon: <Star className='w-5 h-5' />,
    subItems: [
      { name: 'Đánh giá của học viên', path: '/trainerdashboard/ratings', pro: false },
      { name: 'Feedback lớp học', path: '/trainerdashboard/feedback', pro: false },
    ],
  },
  {
    name: 'Thống kê',
    icon: <BarChart3 className='w-5 h-5' />,
    subItems: [
      { name: 'Thống kê cá nhân', path: '/trainerdashboard/trainer-stats', pro: false },
      { name: 'Báo cáo hiệu suất', path: '/trainerdashboard/performance', pro: false },
    ],
  },
  {
    name: 'Lương',
    icon: <DollarSign className='w-5 h-5' />,
    path: '/trainerdashboard/salary',
  },
];

// Trainer không cần othersItems, để trống
const othersItems: NavItem[] = [];

const TrainerSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { setIsNavigating } = useNavigation();
  const location = useLocation();

  // Get dashboard path based on user role
  const getDashboardPathForCurrentUser = () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return getDashboardPath(userData.role);
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
    return '/trainerdashboard/homepage'; // fallback for trainer
  };

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: 'main' | 'others';
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle navigation with loading
  const handleNavigation = (path: string | undefined) => {
    if (path && location.pathname !== path) {
      setIsNavigating(true);
    }
  };

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  useEffect(() => {
    let submenuMatched = false;
    ['main', 'others'].forEach(menuType => {
      const items = menuType === 'main' ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as 'main' | 'others',
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight(prevHeights => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: 'main' | 'others') => {
    setOpenSubmenu(prevOpenSubmenu => {
      if (prevOpenSubmenu && prevOpenSubmenu.type === menuType && prevOpenSubmenu.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: 'main' | 'others') => (
    <ul
      className={`flex flex-col gap-2 w-full ${
      !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
      }`}
    >
      {items.map((nav, index) => (
        <li
          key={nav.name}
          className={`transform transition-all duration-300 ease-out ${
            !isExpanded && !isHovered && !isMobileOpen ? 'w-auto' : 'w-full'
          } ${
            isExpanded || isHovered || isMobileOpen
              ? 'translate-x-0 opacity-100'
              : 'translate-x-0 opacity-100'
          }`}
          style={{
            transitionDelay: `${index * 50}ms`,
          }}
        >
          {nav.subItems ? (
            <a
              href='#'
              onClick={e => {
                e.preventDefault();
                handleSubmenuToggle(index, menuType);
              }}
              className={`group flex items-center transition-all duration-200 ease-out relative rounded-lg ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-md'
              } cursor-pointer ${
                !isExpanded && !isHovered && !isMobileOpen
                  ? 'justify-center py-2 px-2 w-auto'
                  : 'justify-start px-3 py-2.5 gap-3 w-full'
              }`}
            >
              <div
                className={`w-5 h-5 flex items-center ${
                  !isExpanded && !isHovered && !isMobileOpen ? 'justify-center' : 'justify-start'
                } flex-shrink-0 ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                }`}
              >
                {nav.icon}
              </div>
              <span
                className={`font-semibold text-sm font-space-grotesk text-gray-900 dark:text-gray-100 whitespace-nowrap transition-all duration-300 ${
                isExpanded || isHovered || isMobileOpen
                  ? 'opacity-100 max-w-[200px]'
                  : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                {nav.name}
              </span>
              <ChevronDown
                className={`ml-auto w-4 h-4 transition-all duration-300 ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'rotate-180 text-white'
                    : 'text-gray-500 dark:text-gray-400'
                } ${
                  isExpanded || isHovered || isMobileOpen
                    ? 'opacity-100 max-w-[16px]'
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              />
            </a>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                onClick={() => handleNavigation(nav.path)}
                className={`group flex items-center transition-all duration-200 ease-out relative rounded-lg ${
                  isActive(nav.path)
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-md'
                } ${
                  !isExpanded && !isHovered && !isMobileOpen
                    ? 'justify-center py-2 px-2 w-auto'
                    : 'justify-start px-3 py-2.5 gap-3 w-full'
                }`}
              >
                <div
                  className={`w-5 h-5 flex items-center ${
                    !isExpanded && !isHovered && !isMobileOpen ? 'justify-center' : 'justify-start'
                  } flex-shrink-0 ${
                    isActive(nav.path)
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                  }`}
                >
                  {nav.icon}
                </div>
                <span
                  className={`font-semibold text-sm font-space-grotesk text-gray-900 dark:text-gray-100 whitespace-nowrap transition-all duration-300 ${
                  isExpanded || isHovered || isMobileOpen
                    ? 'opacity-100 max-w-[200px]'
                    : 'opacity-0 max-w-0 overflow-hidden'
                  }`}
                >
                  {nav.name}
                </span>
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={el => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className='overflow-hidden transition-all duration-300 ease-out'
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : '0px',
              }}
            >
              <ul
                className={`mt-2 space-y-1 ${
                  !isExpanded && !isHovered && !isMobileOpen ? 'ml-0' : 'ml-6'
                }`}
              >
                {nav.subItems.map(subItem => (
                  <li key={subItem.name} className='w-full'>
                    <Link
                      to={subItem.path}
                      onClick={() => handleNavigation(subItem.path)}
                      className={`group flex items-center transition-all duration-200 ease-out relative rounded-lg ${
                        isActive(subItem.path)
                          ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-500/30 dark:to-orange-600/30 text-orange-700 dark:text-orange-200 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-sm'
                      } ${
                        !isExpanded && !isHovered && !isMobileOpen
                          ? 'justify-center py-2 px-2 w-auto'
                          : 'justify-start gap-3 px-3 py-2 w-full'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center flex-shrink-0 ${
                        !isExpanded && !isHovered && !isMobileOpen ? 'w-5 h-5' : 'w-1.5 h-1.5'
                        }`}
                      >
                        <span className='w-1.5 h-1.5 rounded-full bg-current opacity-60'></span>
                      </span>
                      <span
                        className={`text-sm font-semibold font-space-grotesk text-gray-800 dark:text-gray-200 whitespace-nowrap transition-all duration-300 ${
                        isExpanded || isHovered || isMobileOpen
                          ? 'opacity-100 max-w-[200px]'
                          : 'opacity-0 max-w-0 overflow-hidden'
                        }`}
                      >
                        {subItem.name}
                      </span>
                      <span
                        className={`flex items-center gap-1 ml-auto transition-all duration-300 ${
                        isExpanded || isHovered || isMobileOpen
                          ? 'opacity-100 max-w-[100px]'
                          : 'opacity-0 max-w-0 overflow-hidden'
                        }`}
                      >
                        {subItem.new && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium font-space-grotesk ${
                              isActive(subItem.path)
                                ? 'bg-orange-200 dark:bg-orange-600 text-orange-800 dark:text-orange-200'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-medium font-space-grotesk ${
                              isActive(subItem.path)
                                ? 'bg-orange-200 dark:bg-orange-600 text-orange-800 dark:text-orange-200'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-0 left-0 bg-white/95 backdrop-blur-sm dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-700 shadow-xl no-scrollbar ${
        !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
      }
        ${isExpanded || isMobileOpen ? 'w-[280px]' : isHovered ? 'w-[280px]' : 'w-[80px]'}  
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 overflow-y-auto overflow-x-visible`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-6 flex ${
          !isExpanded && !isHovered && !isMobileOpen ? 'justify-center px-2' : 'justify-center px-6'
        } items-center w-full`}
      >
        <Link
          to={getDashboardPathForCurrentUser()}
          onClick={() => handleNavigation(getDashboardPathForCurrentUser())}
          className='flex items-center gap-3 group'
        >
          {isExpanded || isHovered || isMobileOpen ? (
            <div className='flex h-16 w-48 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-lg border-2 border-orange-500 dark:border-orange-600 transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-xl group-hover:border-orange-600 dark:group-hover:border-orange-500'>
              <img
                src={logoText}
                alt='GYM 147'
                className='h-12 w-40 object-contain transition-all duration-200 group-hover:scale-105'
              />
            </div>
          ) : (
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-lg border-2 border-orange-500 dark:border-orange-600 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-xl group-hover:border-orange-600 dark:group-hover:border-orange-500'>
              <img
                src={logo}
                alt='GYM 147'
                className='h-7 w-7 object-contain transition-all duration-200 group-hover:scale-110'
              />
            </div>
          )}
        </Link>
      </div>
      <div
        className={`flex flex-col overflow-y-auto overflow-x-visible duration-300 ease-linear no-scrollbar w-full ${
          !isExpanded && !isHovered && !isMobileOpen ? 'items-center px-2' : 'items-start px-6'
        }`}
      >
        <nav
          className={`mb-6 w-full flex flex-col ${
            !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
          }`}
        >
          <div
            className={`flex flex-col gap-2 w-full ${
              !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
            }`}
          >
            <div
              className={`w-full flex flex-col ${
                !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
              }`}
            >
              <h2
                className={`mb-3 text-sm font-bold flex items-center leading-6 text-orange-600 dark:text-orange-400 font-space-grotesk transition-all duration-300 ${
                  !isExpanded && !isHovered && !isMobileOpen ? 'justify-center' : 'justify-start'
                } w-full overflow-hidden`}
              >
                <span
                  className={`transition-all duration-300 ${
                  isExpanded || isHovered || isMobileOpen
                    ? 'opacity-100 max-w-[200px]'
                    : 'opacity-0 max-w-0'
                  }`}
                >
                  Trainer Menu
                </span>
                <span
                  className={`w-5 h-5 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-all duration-300 absolute ${
                    !isExpanded && !isHovered && !isMobileOpen ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className='text-xs font-bold leading-none font-space-grotesk'>...</span>
                </span>
              </h2>
              {renderMenuItems(navItems, 'main')}
            </div>
            {/* Trainer không cần othersItems */}
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <TrainerSidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default TrainerSidebar;
