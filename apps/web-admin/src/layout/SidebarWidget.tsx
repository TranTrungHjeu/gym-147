import { getDashboardPath } from '../utils/auth';

export default function SidebarWidget() {
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
    return '/dashboard'; // fallback
  };

  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className='mb-2 font-semibold text-gray-900 dark:text-white font-space-grotesk'>
        GYM 147
      </h3>
      <p className='mb-4 text-gray-500 text-theme-sm dark:text-gray-400 font-inter'>
        Complete gym management system with member tracking, class scheduling, and analytics.
      </p>
      <a
        href={getDashboardPathForCurrentUser()}
        className='flex items-center justify-center p-3 font-medium text-white rounded-lg bg-orange-500 text-theme-sm hover:bg-orange-600 font-inter'
      >
        Go to Dashboard
      </a>
    </div>
  );
}
