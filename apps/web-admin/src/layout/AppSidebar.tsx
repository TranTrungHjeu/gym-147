import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';

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
import {
  Calendar,
  ChevronDown,
  Grid3X3,
  LayoutDashboard,
  List,
  PieChart,
  Table,
  User,
  FileText,
  Shield,
} from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import SidebarWidget from './SidebarWidget';

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
    subItems: [{ name: 'Ecommerce', path: '/dashboard', pro: false }],
  },
  {
    icon: <Calendar className='w-5 h-5' />,
    name: 'Calendar',
    path: '/dashboard/calendar',
  },
  {
    icon: <User className='w-5 h-5' />,
    name: 'User Profile',
    path: '/dashboard/profile',
  },
  {
    name: 'Forms',
    icon: <List className='w-5 h-5' />,
    subItems: [{ name: 'Form Elements', path: '/dashboard/form-elements', pro: false }],
  },
  {
    name: 'Tables',
    icon: <Table className='w-5 h-5' />,
    subItems: [{ name: 'Basic Tables', path: '/dashboard/basic-tables', pro: false }],
  },
  {
    name: 'Pages',
    icon: <FileText className='w-5 h-5' />,
    subItems: [
      { name: 'Blank Page', path: '/dashboard/blank', pro: false },
      { name: '404 Error', path: '/error-404', pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
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
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { setIsNavigating } = useNavigation();
  const location = useLocation();

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
    <ul className='flex flex-col gap-2'>
      {items.map((nav, index) => (
        <li
          key={nav.name}
          className={`transform transition-all duration-300 ease-out ${
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
              className={`group flex items-center rounded-xl transition-all duration-200 ease-out relative ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-[1.02]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-md hover:transform hover:scale-[1.02]'
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? 'justify-center py-2'
                  : 'justify-start px-3 py-2.5 gap-3'
              }`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                }`}
              >
                {nav.icon}
              </div>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className='font-semibold text-sm font-inter text-gray-900 dark:text-gray-100'>
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
                className={`group flex items-center rounded-xl transition-all duration-200 ease-out relative ${
                  isActive(nav.path)
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-[1.02]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-md hover:transform hover:scale-[1.02]'
                } ${
                  !isExpanded && !isHovered
                    ? 'justify-center py-2'
                    : 'justify-start px-3 py-2.5 gap-3'
                }`}
              >
                <div
                  className={`w-5 h-5 flex items-center justify-center ${
                    isActive(nav.path)
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
                  }`}
                >
                  {nav.icon}
                </div>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className='font-semibold text-sm font-inter text-gray-900 dark:text-gray-100'>
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
              <ul className={`mt-2 space-y-1 ${!isExpanded && !isHovered ? 'ml-0' : 'ml-6'}`}>
                {nav.subItems.map(subItem => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      onClick={() => handleNavigation(subItem.path)}
                      className={`group flex items-center rounded-lg transition-all duration-200 ease-out relative ${
                        isActive(subItem.path)
                          ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-500/30 dark:to-orange-600/30 text-orange-700 dark:text-orange-200 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-500/20 dark:hover:to-orange-600/20 hover:text-orange-600 dark:hover:text-orange-400 hover:shadow-sm hover:transform hover:scale-[1.01]'
                      } ${!isExpanded && !isHovered ? 'justify-center py-2' : 'gap-3 px-3 py-2'}`}
                    >
                      {!isExpanded && !isHovered ? (
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
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-0 left-0 bg-white/95 backdrop-blur-sm dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 dark:border-gray-700 shadow-xl
        ${isExpanded || isMobileOpen ? 'w-[280px]' : isHovered ? 'w-[280px]' : 'w-[80px]'}  
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 overflow-x-hidden`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`py-6 px-6 flex justify-center`}>
        <Link
          to='/dashboard'
          onClick={() => handleNavigation('/dashboard')}
          className='flex items-center gap-3 group'
        >
          {isExpanded || isHovered || isMobileOpen ? (
            <div className='flex h-16 w-48 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-out group-hover:scale-105 group-hover:shadow-xl'>
              <img
                src='/src/assets/images/logo-text-2.png'
                alt='GYM 147'
                className='h-12 w-40 object-contain transition-all duration-200 group-hover:scale-105'
              />
            </div>
          ) : (
            <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-gray-800 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-xl'>
              <img
                src='/src/assets/images/logo.png'
                alt='GYM 147'
                className='h-7 w-7 object-contain transition-all duration-200 group-hover:scale-110'
              />
            </div>
          )}
        </Link>
      </div>
      <div
        className={`flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar ${
          !isExpanded && !isHovered ? 'px-2' : 'px-6'
        }`}
      >
        <nav className='mb-6'>
          <div className='flex flex-col gap-2'>
            <div>
              <h2
                className={`mb-3 text-sm font-bold flex items-center leading-6 text-orange-600 dark:text-orange-400 font-space-grotesk ${
                  !isExpanded && !isHovered ? 'justify-center' : 'justify-start'
                }`}
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
            <div className=''>
              <h2
                className={`mb-3 text-sm font-bold flex items-center leading-6 text-orange-600 dark:text-orange-400 font-space-grotesk ${
                  !isExpanded && !isHovered ? 'justify-center' : 'justify-start'
                }`}
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
