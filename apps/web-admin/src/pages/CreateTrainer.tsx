import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '../components/common/SuccessModal';
import useTranslation from '../hooks/useTranslation';
import { authService } from '../services/auth.service';

const CreateTrainer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value) return t('createTrainer.validation.emailRequired');
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
          return t('createTrainer.validation.emailInvalid');
        if (value.length > 100) return t('createTrainer.validation.emailMaxLength');
        return '';
      case 'password':
        if (!value) return t('createTrainer.validation.passwordRequired');
        if (value.length < 8) return t('createTrainer.validation.passwordMinLength');
        if (value.length > 50) return t('createTrainer.validation.passwordMaxLength');
        if (!/(?=.*[a-z])/.test(value)) return t('createTrainer.validation.passwordLowercase');
        if (!/(?=.*[A-Z])/.test(value)) return t('createTrainer.validation.passwordUppercase');
        if (!/(?=.*\d)/.test(value)) return t('createTrainer.validation.passwordNumber');
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value))
          return t('createTrainer.validation.passwordSpecial');
        return '';
      case 'firstName':
        if (!value) return t('createTrainer.validation.firstNameRequired');
        if (value.length < 2) return t('createTrainer.validation.firstNameMinLength');
        if (value.length > 50) return t('createTrainer.validation.firstNameMaxLength');
        // Allow Unicode letters (including Vietnamese), spaces, hyphens, and apostrophes
        if (!/^[\p{L}\s'-]+$/u.test(value.trim()))
          return t('createTrainer.validation.firstNameInvalid');
        return '';
      case 'lastName':
        if (!value) return t('createTrainer.validation.lastNameRequired');
        if (value.length < 2) return t('createTrainer.validation.lastNameMinLength');
        if (value.length > 50) return t('createTrainer.validation.lastNameMaxLength');
        // Allow Unicode letters (including Vietnamese), spaces, hyphens, and apostrophes
        if (!/^[\p{L}\s'-]+$/u.test(value.trim()))
          return t('createTrainer.validation.lastNameInvalid');
        return '';
      case 'phone':
        if (value && !/^0[35789][0-9]{8}$/.test(value))
          return t('createTrainer.validation.phoneInvalid');
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time validation
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Trainer form submitted!', formData);
    setIsLoading(true);

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) errors[key] = error;
    });

    console.log('Trainer validation errors:', errors);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('Trainer form has validation errors, stopping submission');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Calling registerAdmin API for trainer...');
      const response = await authService.registerAdmin({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        role: 'TRAINER',
      });
      console.log('Trainer API Response:', response);

      if (response.success) {
        // Check if trainer was created in schedule-service
        const scheduleServiceCreated = response.data?.scheduleServiceCreated !== false;

        if (window.showToast) {
          if (scheduleServiceCreated) {
            window.showToast({
              type: 'success',
              message: t('createTrainer.messages.createSuccess'),
              duration: 5000,
            });
          } else {
            window.showToast({
              type: 'warning',
              message: t('createTrainer.messages.createSuccessButScheduleWarning'),
              duration: 7000,
            });
            console.warn('Schedule service error:', response.data?.scheduleServiceError);
          }
        }

        // Show success modal
        setCreatedUser(response.data.user);
        setShowSuccessModal(true);
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || t('createTrainer.messages.createError'),
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Create trainer error:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('createTrainer.messages.createErrorRetry'),
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const userRole = localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user')!).role
      : 'MEMBER';
    if (userRole === 'SUPER_ADMIN') {
      navigate('/super-admin-dashboard');
    } else {
      navigate('/admin-dashboard');
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-8'>
          <button
            onClick={handleBack}
            className='mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200'
          >
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
            {t('createTrainer.title')}
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>{t('createTrainer.subtitle')}</p>
        </div>

        {/* Form */}
        <div className='max-w-xs mx-auto'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700'>
            <form onSubmit={handleSubmit} className='space-y-3'>
              {/* Email */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createTrainer.form.email')}
                </label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.email
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent`}
                  placeholder={t('createTrainer.form.emailPlaceholder')}
                />
                {fieldErrors.email && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.email}</p>
                )}
              </div>

              {/* First Name and Last Name */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                    {t('createTrainer.form.lastName')}
                  </label>
                  <input
                    type='text'
                    name='lastName'
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1.5 text-sm rounded border ${
                      fieldErrors.lastName
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent`}
                    placeholder={t('createTrainer.form.lastNamePlaceholder')}
                  />
                  {fieldErrors.lastName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                    {t('createTrainer.form.firstName')}
                  </label>
                  <input
                    type='text'
                    name='firstName'
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1.5 text-sm rounded border ${
                      fieldErrors.firstName
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent`}
                    placeholder={t('createTrainer.form.firstNamePlaceholder')}
                  />
                  {fieldErrors.firstName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.firstName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createTrainer.form.phone')}
                </label>
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.phone
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent`}
                  placeholder={t('createTrainer.form.phonePlaceholder')}
                />
                {fieldErrors.phone && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createTrainer.form.password')}
                </label>
                <input
                  type='password'
                  name='password'
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.password
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent`}
                  placeholder={t('createTrainer.form.passwordPlaceholder')}
                />
                {fieldErrors.password && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={isLoading}
                className='w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors duration-200 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <div className='flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    {t('createTrainer.form.creating')}
                  </div>
                ) : (
                  t('createTrainer.form.submit')
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {createdUser && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            // Navigate back based on user role
            const userRole = localStorage.getItem('user')
              ? JSON.parse(localStorage.getItem('user')!).role
              : 'MEMBER';
            if (userRole === 'SUPER_ADMIN') {
              navigate('/super-admin-dashboard');
            } else {
              navigate('/admin-dashboard');
            }
          }}
          title={t('createTrainer.successModal.title')}
          user={createdUser}
        />
      )}
    </div>
  );
};

export default CreateTrainer;
