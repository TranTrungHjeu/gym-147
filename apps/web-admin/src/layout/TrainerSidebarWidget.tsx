import { Link } from 'react-router-dom';
import { getDashboardPath } from '../utils/auth';
import { User as UserType } from '../services/user.service';
import { useEffect, useState } from 'react';
import { Trainer } from '../services/trainer.service';

export default function TrainerSidebarWidget() {
  const [user, setUser] = useState<UserType | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);

  useEffect(() => {
    // Get user data from localStorage
    const loadUserData = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    // Load initial user data
    loadUserData();

    // Fetch trainer profile photo if user is a trainer (same as UserInfoCard)
    const fetchTrainerAvatar = async (userId: string) => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const scheduleServiceUrl = 'http://localhost:3003';
        const response = await fetch(`${scheduleServiceUrl}/trainers/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const profilePhoto = data.data?.trainer?.profile_photo || data.data?.profile_photo || null;
          if (profilePhoto) {
            setTrainer({ profile_photo: profilePhoto } as Trainer);
          } else {
            setTrainer(null);
          }
        } else {
          setTrainer(null);
        }
      } catch (error) {
        // Silently fail for 404 or network errors
        setTrainer(null);
      }
    };

    // Load trainer avatar if user is a trainer
    const loadTrainerAvatar = () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.role === 'TRAINER' && parsedUser.id) {
            fetchTrainerAvatar(parsedUser.id);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
    };

    loadTrainerAvatar();

    // Listen for storage changes (when user data is updated from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          setUser(updatedUser);
          // Refetch trainer avatar if user is a trainer
          if (updatedUser.role === 'TRAINER' && updatedUser.id) {
            fetchTrainerAvatar(updatedUser.id);
          } else {
            setTrainer(null);
          }
        } catch (error) {
          console.error('Error parsing updated user data:', error);
        }
      }
    };

    // Listen for custom user data update events (from same tab)
    const handleUserDataUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setUser(e.detail);
        // Refetch trainer avatar if user is a trainer
        if (e.detail.role === 'TRAINER' && e.detail.id) {
          fetchTrainerAvatar(e.detail.id);
        } else {
          setTrainer(null);
        }
      }
    };

    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

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

  // Function to generate avatar based on name
  const generateAvatar = (firstName: string, lastName: string) => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || '';
    const initials = firstInitial + lastInitial;

    // Generate a consistent color based on name
    const colors = [
      'bg-orange-500',
      'bg-orange-600',
      'bg-orange-700',
      'bg-orange-800',
      'bg-gray-600',
      'bg-gray-700',
      'bg-gray-800',
      'bg-gray-900',
    ];
    const colorIndex = (firstName + lastName).length % colors.length;

    return (
      <div
        className={`w-full h-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm font-space-grotesk`}
      >
        {initials}
      </div>
    );
  };

  const firstName = user?.firstName || user?.first_name || '';
  const lastName = user?.lastName || user?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Trainer';
  const email = user?.email || '';

  return (
    <div className='mx-auto mb-6 w-full max-w-[220px] rounded-2xl bg-gray-50 dark:bg-white/[0.03] px-4 py-5 text-center border border-gray-200 dark:border-gray-700'>
      {/* Avatar */}
      <div className='flex justify-center mb-3'>
        <div className='relative w-16 h-16 rounded-full overflow-hidden border-2 border-orange-200 dark:border-orange-700 shadow-sm'>
          {trainer?.profile_photo ? (
            <>
              <img
                src={trainer.profile_photo}
                alt={fullName}
                className='w-full h-full object-cover'
                onError={e => {
                  // Hide image and show fallback
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                    fallback.classList.add('flex');
                  }
                }}
              />
              <div className='hidden w-full h-full'>
                {generateAvatar(firstName || 'T', lastName || 'R')}
              </div>
            </>
          ) : (
            <div className='w-full h-full flex'>
              {generateAvatar(firstName || 'T', lastName || 'R')}
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className='mb-1 font-semibold text-gray-900 dark:text-white font-space-grotesk text-sm'>
        {fullName}
      </h3>

      {/* Email */}
      {email && (
        <p className='mb-4 text-gray-500 text-xs dark:text-gray-400 font-inter truncate' title={email}>
          {email}
        </p>
      )}

      {/* Link to Profile */}
      <Link
        to='/trainerdashboard/profile'
        className='flex items-center justify-center p-2.5 font-medium text-white rounded-lg bg-orange-500 hover:bg-orange-600 text-xs transition-colors duration-200 font-inter'
      >
        Xem hồ sơ
      </Link>
    </div>
  );
}

