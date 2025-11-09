import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Clock,
  CreditCard,
  Dumbbell,
  GraduationCap,
  Grid3X3,
  LayoutDashboard,
  PieChart,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoText from '../assets/images/logo-text-2.png';
import logo from '../assets/images/logo.png';
import { useNavigation } from '../context/NavigationContext';
import { useSidebar } from '../context/SidebarContext';
import { getCurrentUser, getDashboardPath } from '../utils/auth';
import SidebarWidget from './SidebarWidget';

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

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { setIsNavigating } = useNavigation();
  const location = useLocation();

  // Get dashboard path dynamically based on current user
  const getDashboardPathForCurrentUser = useCallback(() => {
    const user = getCurrentUser();
    return getDashboardPath(user?.role || 'MEMBER');
  }, []);

  // Create nav items with dynamic dashboard path - memoized to prevent re-creation on every render
  const navItems: NavItem[] = useMemo(() => {
    const dashboardPath = getDashboardPathForCurrentUser();
    return [
      {
        icon: <LayoutDashboard className='w-5 h-5' />,
        name: 'Dashboard',
        path: dashboardPath,
      },
      {
        icon: <Users className='w-5 h-5' />,
        name: 'Thành viên',
        path: '/management/members',
      },
      {
        icon: <Dumbbell className='w-5 h-5' />,
        name: 'Thiết bị',
        path: '/management/equipment',
      },
      {
        icon: <GraduationCap className='w-5 h-5' />,
        name: 'Huấn luyện viên',
        path: '/management/trainers',
      },
      {
        icon: <BookOpen className='w-5 h-5' />,
        name: 'Lớp học',
        path: '/management/classes',
      },
      {
        icon: <Building2 className='w-5 h-5' />,
        name: 'Phòng tập',
        path: '/management/rooms',
      },
      {
        icon: <Clock className='w-5 h-5' />,
        name: 'Lịch tập',
        path: '/management/schedules',
      },
      {
        icon: <CreditCard className='w-5 h-5' />,
        name: 'Thanh toán',
        path: '/management/billing',
      },
      {
        icon: <BarChart3 className='w-5 h-5' />,
        name: 'Báo cáo',
        path: '/management/reports',
      },
      {
        icon: <Settings className='w-5 h-5' />,
        name: 'Cài đặt',
        path: '/management/settings',
      },
    ];
  }, [getDashboardPathForCurrentUser]);

  const othersItems: NavItem[] = useMemo(
    () => [
      {
        icon: <PieChart className='w-5 h-5' />,
        name: 'Charts',
        subItems: [
          { name: 'Line Chart', path: '/dashboard/line-chart', pro: false },
          { name: 'Bar Chart', path: '/dashboard/bar-chart', pro: false },
        ],
      },
      {
        icon: <Grid3X3 className='w-5 h-5' />,
        name: 'UI Elements',
        subItems: [
          { name: 'Alerts', path: '/dashboard/alerts', pro: false },
          { name: 'Avatar', path: '/dashboard/avatars', pro: false },
          { name: 'Badge', path: '/dashboard/badge', pro: false },
          { name: 'Buttons', path: '/dashboard/buttons', pro: false },
          { name: 'Images', path: '/dashboard/images', pro: false },
          { name: 'Videos', path: '/dashboard/videos', pro: false },
        ],
      },
      {
        icon: <Shield className='w-5 h-5' />,
        name: 'Authentication',
        subItems: [
          { name: 'Sign In', path: '/auth', pro: false },
          { name: 'Sign Up', path: '/signup', pro: false },
        ],
      },
    ],
    []
  );

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
    <ul className={`flex flex-col gap-2 w-full ${
      !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
    }`}>
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
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className='font-semibold text-sm font-space-grotesk text-gray-900 dark:text-gray-100'>
                  {nav.name}
                </span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDown
                  className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? 'rotate-180 text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
              )}
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
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className='font-semibold text-sm font-space-grotesk text-gray-900 dark:text-gray-100'>
                    {nav.name}
                  </span>
                )}
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
                      {!isExpanded && !isHovered && !isMobileOpen ? (
                        <span className='w-5 h-5 flex items-center justify-center'>
                          <span className='w-1.5 h-1.5 rounded-full bg-current opacity-60'></span>
                        </span>
                      ) : (
                        <>
                          <span className='w-1.5 h-1.5 rounded-full bg-current opacity-60'></span>
                          <span className='text-sm font-semibold font-space-grotesk text-gray-800 dark:text-gray-200'>
                            {subItem.name}
                          </span>
                          <span className='flex items-center gap-1 ml-auto'>
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
                        </>
                      )}
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
        <nav className={`mb-6 w-full flex flex-col ${
          !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
        }`}>
          <div className={`flex flex-col gap-2 w-full ${
            !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
          }`}>
            <div className={`w-full flex flex-col ${
              !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
            }`}>
              <h2
                className={`mb-3 text-sm font-bold flex items-center leading-6 text-orange-600 dark:text-orange-400 font-space-grotesk ${
                  !isExpanded && !isHovered && !isMobileOpen ? 'justify-center' : 'justify-start'
                } w-full`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  'Main Menu'
                ) : (
                  <span className='w-5 h-5 flex items-center justify-center text-orange-600 dark:text-orange-400'>
                    <span className='text-xs font-bold leading-none font-inter'>...</span>
                  </span>
                )}
              </h2>
              {renderMenuItems(navItems, 'main')}
            </div>
            <div className={`w-full flex flex-col ${
              !isExpanded && !isHovered && !isMobileOpen ? 'items-center' : 'items-start'
            }`}>
              <h2
                className={`mb-3 text-sm font-bold flex items-center leading-6 text-orange-600 dark:text-orange-400 font-space-grotesk ${
                  !isExpanded && !isHovered && !isMobileOpen ? 'justify-center' : 'justify-start'
                } w-full`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  'Other'
                ) : (
                  <span className='w-5 h-5 flex items-center justify-center text-orange-600 dark:text-orange-400'>
                    <span className='text-xs font-bold leading-none font-inter'>...</span>
                  </span>
                )}
              </h2>
              {renderMenuItems(othersItems, 'others')}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
