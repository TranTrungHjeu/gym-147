import {
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React from 'react';
import { cn } from '../../../../utils/cn';
import { Badge } from '../../ui/Badge/Badge';

interface MainLayoutProps {
  children: React.ReactNode;
  user?: any;
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home, gradient: 'from-blue-500 to-purple-600' },
  { name: 'Thành viên', href: '/members', icon: Users, gradient: 'from-green-500 to-teal-600' },
  { name: 'Gói tập', href: '/packages', icon: Package, gradient: 'from-orange-500 to-red-600' },
  { name: 'Lịch tập', href: '/schedule', icon: Calendar, gradient: 'from-pink-500 to-rose-600' },
  {
    name: 'Thanh toán',
    href: '/billing',
    icon: CreditCard,
    gradient: 'from-indigo-500 to-blue-600',
  },
  { name: 'Báo cáo', href: '/reports', icon: BarChart3, gradient: 'from-purple-500 to-indigo-600' },
  { name: 'Cài đặt', href: '/settings', icon: Settings, gradient: 'from-gray-500 to-gray-600' },
];

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  user,
  currentPath = '/',
  onNavigate,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleNavigation = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    }
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/auth';
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
      {/* Background Effects */}
      <div className='fixed inset-0 opacity-20'>
        <div className='h-full w-full bg-gradient-to-br from-purple-900/20 to-blue-900/20' />
        <div className='absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]' />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className='fixed inset-0 z-40 lg:hidden' onClick={() => setSidebarOpen(false)}>
          <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
        </div>
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex h-full flex-col glass-card modern-sidebar'>
          {/* Mobile Header */}
          <div className='flex items-center justify-between h-16 px-6 border-b border-white/10'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'>
                <Dumbbell className='h-5 w-5 text-white' />
              </div>
              <div>
                <span className='text-lg font-bold text-white'>GYM 147</span>
                <div className='flex items-center gap-1'>
                  <Sparkles className='h-3 w-3 text-purple-400' />
                  <span className='text-xs text-purple-300'>Pro</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className='p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className='flex-1 px-4 py-6 space-y-2'>
            {navigation.map((item, index) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 animate-slide-in-left',
                  currentPath === item.href
                    ? 'glass-nav active text-white shadow-lg'
                    : 'glass-nav text-white/70 hover:text-white'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    'mr-3 h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-r transition-transform group-hover:scale-110',
                    item.gradient
                  )}
                >
                  <item.icon className='h-4 w-4 text-white' />
                </div>
                {item.name}
              </button>
            ))}
          </nav>

          {/* Mobile User Section */}
          <div className='p-4 border-t border-white/10'>
            <div className='flex items-center gap-3 p-3 rounded-xl glass-nav'>
              <div className='h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center'>
                <User className='h-5 w-5 text-white' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-white truncate'>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className='text-xs text-white/60 truncate'>{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className='p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors'
              >
                <LogOut className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col'>
        <div className='flex flex-col flex-grow glass-card modern-sidebar'>
          {/* Desktop Logo */}
          <div className='flex items-center h-20 px-6 border-b border-white/10'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg'>
                <Dumbbell className='h-6 w-6 text-white' />
              </div>
              <div>
                <span className='text-xl font-bold text-white'>GYM 147</span>
                <div className='flex items-center gap-2'>
                  <Sparkles className='h-3 w-3 text-purple-400' />
                  <span className='text-xs text-purple-300 font-medium'>Management Pro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className='flex-1 px-4 py-8 space-y-2'>
            {navigation.map((item, index) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  'group flex w-full items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 animate-fade-in-up',
                  currentPath === item.href
                    ? 'glass-nav active text-white shadow-lg'
                    : 'glass-nav text-white/70 hover:text-white'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={cn(
                    'mr-4 h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-r transition-all duration-200 group-hover:scale-110',
                    item.gradient,
                    currentPath === item.href ? 'shadow-lg' : ''
                  )}
                >
                  <item.icon className='h-5 w-5 text-white' />
                </div>
                <span className='font-medium'>{item.name}</span>
                {currentPath === item.href && (
                  <div className='ml-auto h-2 w-2 rounded-full bg-white animate-pulse' />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop User Section */}
          <div className='p-4 border-t border-white/10'>
            <div className='flex items-center gap-4 p-4 rounded-xl glass-nav hover:bg-white/10 transition-colors'>
              <div className='h-12 w-12 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center shadow-lg'>
                <User className='h-6 w-6 text-white' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-white truncate'>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className='text-xs text-white/60 truncate'>{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className='p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors'
                title='Đăng xuất'
              >
                <LogOut className='h-4 w-4' />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='lg:pl-72 flex flex-col flex-1'>
        {/* Top header */}
        <header className='glass-card border-b border-white/10'>
          <div className='flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8'>
            <div className='flex items-center gap-4'>
              <button
                onClick={() => setSidebarOpen(true)}
                className='p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors lg:hidden'
              >
                <Menu className='h-5 w-5' />
              </button>

              {/* Modern Search */}
              <div className='hidden sm:block'>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Search className='h-4 w-4 text-white/40' />
                  </div>
                  <input
                    type='text'
                    placeholder='Tìm kiếm thành viên, lớp học...'
                    className='block w-80 pl-10 pr-4 py-2 glass-card border-white/20 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all'
                  />
                </div>
              </div>
            </div>

            <div className='flex items-center gap-4'>
              {/* Status Indicator */}
              <div className='hidden md:flex items-center gap-2 px-3 py-1.5 glass-nav rounded-full'>
                <Zap className='h-3 w-3 text-green-400' />
                <span className='text-xs font-medium text-white/80'>Hệ thống hoạt động</span>
              </div>

              {/* Notifications */}
              <button className='relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors'>
                <Bell className='h-5 w-5' />
                <Badge
                  variant='error'
                  size='sm'
                  className='absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-gradient-to-r from-pink-500 to-red-500 border-0'
                >
                  3
                </Badge>
              </button>

              {/* User menu */}
              <div className='hidden lg:flex items-center gap-3 px-3 py-2 glass-nav rounded-xl hover:bg-white/10 transition-colors cursor-pointer'>
                <div className='h-8 w-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center'>
                  <User className='h-4 w-4 text-white' />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-white'>{user?.firstName}</span>
                  <ChevronDown className='h-4 w-4 text-white/60' />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 p-4 sm:p-6 lg:p-8'>
          <div className='animate-fade-in-up'>{children}</div>
        </main>
      </div>
    </div>
  );
};
