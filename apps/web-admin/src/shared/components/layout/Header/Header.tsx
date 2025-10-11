import { Bell, Clock3, Crown, LogOut, Settings } from 'lucide-react';
import React from 'react';
import { authService } from '../../../../services/auth.service';
import { IconBadge } from '../../ui';

interface HeaderProps {
  user?: any;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/auth';
  };

  const currentTime = new Date().toLocaleString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className='relative z-20 border-b border-white/10 bg-surface-900/70 px-8 py-6 backdrop-blur-xl'>
      <div className='absolute inset-0 -z-10 bg-grid-glow [background-size:52px_52px] opacity-5' />
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-6'>
          <div className='flex items-center gap-4'>
            <IconBadge icon={Crown} tone='brand' size='lg' />
            <div>
              <h1 className='text-2xl font-semibold tracking-wide text-brand-50'>
                Smart Gym Management
              </h1>
              <p className='text-sm text-ink-400'>Trung tâm điều hành phòng gym của bạn</p>
            </div>
          </div>

          <div className='hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-200 shadow-surface lg:flex lg:items-center lg:gap-2'>
            <Clock3 className='h-4 w-4 text-brand-400' strokeWidth={1.8} />
            <span>{currentTime}</span>
          </div>
        </div>

        <div className='flex items-center gap-5'>
          <div className='hidden items-center gap-3 md:flex'>
            <button className='group relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-200 transition-all duration-200 hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-50'>
              <Bell className='h-5 w-5' strokeWidth={1.6} />
              <span className='absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-white shadow-brand'>
                3
              </span>
            </button>
            <button className='inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-200 transition-all duration-200 hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-50'>
              <Settings className='h-5 w-5' strokeWidth={1.6} />
            </button>
          </div>

          {user && (
            <div className='flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-surface'>
              <div className='relative'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/50 bg-gradient-to-br from-brand-500/80 via-brand-500/90 to-brand-700/70 text-lg font-semibold text-white shadow-brand'>
                  {(user.firstName || user.email)?.charAt(0)?.toUpperCase()}
                </div>
                <span className='absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-surface-900 bg-emerald-500' />
              </div>
              <div className='text-right'>
                <p className='text-base font-semibold text-brand-50'>
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.email}
                </p>
                <div className='flex items-center justify-end gap-2 text-xs text-ink-300'>
                  <Crown className='h-4 w-4 text-brand-400' strokeWidth={1.8} />
                  <span>Administrator</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className='inline-flex items-center gap-2 rounded-2xl border border-brand-500/30 bg-brand-500/20 px-5 py-3 text-sm font-semibold text-brand-50 shadow-brand transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-500/30'
          >
            <LogOut className='h-5 w-5' strokeWidth={1.6} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
