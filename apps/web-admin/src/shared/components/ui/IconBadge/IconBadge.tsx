import { LucideIcon } from 'lucide-react';

export type IconBadgeTone = 'brand' | 'success' | 'warning' | 'info' | 'neutral';

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const toneClasses: Record<IconBadgeTone, string> = {
  brand: 'from-brand-500/90 via-brand-400/90 to-brand-600/90 text-white',
  success: 'from-emerald-500/90 via-emerald-400/90 to-emerald-600/90 text-white',
  warning: 'from-amber-500/90 via-amber-400/90 to-amber-600/90 text-white',
  info: 'from-sky-500/90 via-sky-400/90 to-sky-600/90 text-white',
  neutral: 'from-surface-600/90 via-surface-500/90 to-surface-600/90 text-brand-100',
};

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-10 h-10 text-[18px]',
  md: 'w-12 h-12 text-[20px]',
  lg: 'w-14 h-14 text-[24px]',
};

export function IconBadge({
  icon: Icon,
  tone = 'brand',
  size = 'md',
  className = '',
}: IconBadgeProps) {
  const classes = [
    'relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br shadow-brand transition-transform duration-300 hover:scale-105',
    toneClasses[tone],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <img src={Icon} alt='Badge' className='h-[1.1em] w-[1.1em]' />
      <span className='absolute inset-0 rounded-2xl border border-white/10 mix-blend-screen' />
    </div>
  );
}

export default IconBadge;
