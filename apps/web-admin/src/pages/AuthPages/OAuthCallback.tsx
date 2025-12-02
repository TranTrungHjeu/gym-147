import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');
    const isNewUser = searchParams.get('isNewUser') === 'true';

    if (error) {
      showToast(`OAuth authentication failed: ${error}`, 'error');
      navigate('/auth');
      return;
    }

    if (token && refreshToken) {
      // Store tokens
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('isLoggedIn', 'true');

      // Get user profile
      fetch(`${import.meta.env.VITE_IDENTITY_SERVICE_URL || 'http://localhost:3001'}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            localStorage.setItem('user', JSON.stringify(data.data));
            
            // Navigate based on role
            const userRole = data.data.role;
            if (userRole === 'SUPER_ADMIN') {
              navigate('/super-admin-dashboard');
            } else if (userRole === 'ADMIN') {
              navigate('/admin-dashboard');
            } else if (userRole === 'TRAINER') {
              navigate('/trainerdashboard/homepage');
            } else {
              navigate('/member-dashboard');
            }

            if (isNewUser) {
              showToast('Welcome! Please complete your profile.', 'success');
            } else {
              showToast('Login successful!', 'success');
            }
          } else {
            throw new Error('Failed to get user profile');
          }
        })
        .catch(error => {
          console.error('Error fetching user profile:', error);
          showToast('Failed to complete authentication', 'error');
          navigate('/auth');
        });
    } else {
      showToast('OAuth authentication failed', 'error');
      navigate('/auth');
    }
  }, [searchParams, navigate, showToast]);

  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div className='text-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto'></div>
        <p className='mt-4 text-gray-600 dark:text-gray-400'>Completing authentication...</p>
      </div>
    </div>
  );
}


