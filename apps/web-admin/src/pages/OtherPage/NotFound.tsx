import GridShape from '../../components/common/GridShape';
import { Link } from 'react-router-dom';
import useTranslation from '../../hooks/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className='relative min-h-screen overflow-hidden bg-[var(--color-gray-50)] dark:bg-[var(--color-gray-900)]'>
      <div className='absolute inset-0 pointer-events-none opacity-70'>
        <GridShape />
      </div>

      <div className='relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6'>
        <div className='w-full max-w-2xl border border-[var(--color-gray-200)] bg-[var(--color-white)] p-6 text-center shadow-sm dark:border-[var(--color-gray-700)] dark:bg-[var(--color-gray-800)] sm:p-8 rounded-none'>
          <p className='mx-auto mb-3 inline-flex items-center border border-[var(--color-orange-200)] bg-[var(--color-orange-50)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-orange-700)] dark:border-[var(--color-orange-700)] dark:bg-[var(--color-orange-900)]/20 dark:text-[var(--color-orange-300)] rounded-none font-heading'>
            {t('notFound.error')}
          </p>

          <h1 className='text-5xl font-bold leading-none text-[var(--color-gray-900)] dark:text-[var(--color-white)] sm:text-6xl font-heading'>
            404
          </h1>

          <p className='mx-auto mt-4 max-w-xl text-sm text-[var(--color-gray-600)] dark:text-[var(--color-gray-400)] sm:text-base font-sans'>
            {t('notFound.message')}
          </p>

          <div className='my-6 border-t border-[var(--color-gray-200)] dark:border-[var(--color-gray-700)]' />

          <Link
            to='/'
            className='inline-flex min-h-[34px] items-center justify-center rounded-none border border-[var(--color-orange-500)] bg-[var(--color-orange-600)] px-4 py-1.5 text-xs font-medium text-[var(--color-white)] transition-colors hover:bg-[var(--color-orange-700)] dark:border-[var(--color-orange-500)] dark:bg-[var(--color-orange-500)] dark:hover:bg-[var(--color-orange-600)] font-heading'
          >
            {t('notFound.backToHome')}
          </Link>

        </div>
      </div>
    </div>
  );
}
