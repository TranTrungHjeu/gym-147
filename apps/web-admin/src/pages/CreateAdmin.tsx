import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '../components/common/SuccessModal';
import useTranslation from '../hooks/useTranslation';
import { authService } from '../services/auth.service';

const CreateAdmin: React.FC = () => {
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
        if (!value) return t('createAdmin.validation.emailRequired');
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
          return t('createAdmin.validation.emailInvalid');
        if (value.length > 100) return t('createAdmin.validation.emailMaxLength');
        return '';
      case 'password':
        if (!value) return t('createAdmin.validation.passwordRequired');
        if (value.length < 8) return t('createAdmin.validation.passwordMinLength');
        if (value.length > 50) return t('createAdmin.validation.passwordMaxLength');
        if (!/(?=.*[a-z])/.test(value)) return t('createAdmin.validation.passwordLowercase');
        if (!/(?=.*[A-Z])/.test(value)) return t('createAdmin.validation.passwordUppercase');
        if (!/(?=.*\d)/.test(value)) return t('createAdmin.validation.passwordNumber');
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value))
          return t('createAdmin.validation.passwordSpecial');
        return '';
      case 'firstName':
        if (!value) return t('createAdmin.validation.firstNameRequired');
        if (value.length < 2) return t('createAdmin.validation.firstNameMinLength');
        if (value.length > 50) return t('createAdmin.validation.firstNameMaxLength');
        // Allow Unicode letters (including Vietnamese), spaces, hyphens, and apostrophes
        if (!/^[\p{L}\s'-]+$/u.test(value.trim()))
          return t('createAdmin.validation.firstNameInvalid');
        return '';
      case 'lastName':
        if (!value) return t('createAdmin.validation.lastNameRequired');
        if (value.length < 2) return t('createAdmin.validation.lastNameMinLength');
        if (value.length > 50) return t('createAdmin.validation.lastNameMaxLength');
        // Allow Unicode letters (including Vietnamese), spaces, hyphens, and apostrophes
        if (!/^[\p{L}\s'-]+$/u.test(value.trim()))
          return t('createAdmin.validation.lastNameInvalid');
        return '';
      case 'phone':
        if (value && !/^0[35789][0-9]{8}$/.test(value))
          return t('createAdmin.validation.phoneInvalid');
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
    console.log('Form submitted!', formData);
    setIsLoading(true);

    // Validate all fields
    const errors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) errors[key] = error;
    });

    console.log('Validation errors:', errors);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log('Form has validation errors, stopping submission');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Calling registerAdmin API...');
      const response = await authService.registerAdmin({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        role: 'ADMIN',
      });
      console.log('API Response:', response);

      if (response.success) {
        if (window.showToast) {
          window.showToast({
            type: 'success',
            message: t('createAdmin.messages.createSuccess'),
            duration: 5000,
          });
        }

        // Show success modal
        setCreatedUser(response.data.user);
        setShowSuccessModal(true);
      } else {
        if (window.showToast) {
          window.showToast({
            type: 'error',
            message: response.message || t('createAdmin.messages.createError'),
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Create admin error:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: t('createAdmin.messages.createErrorRetry'),
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/super-admin-dashboard');
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
            {t('createAdmin.title')}
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>{t('createAdmin.subtitle')}</p>
        </div>

        {/* Form */}
        <div className='max-w-xs mx-auto'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700'>
            <form onSubmit={handleSubmit} className='space-y-3'>
              {/* Email */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createAdmin.form.email')}
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
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
                  placeholder={t('createAdmin.form.emailPlaceholder')}
                />
                {fieldErrors.email && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.email}</p>
                )}
              </div>

              {/* First Name and Last Name */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                    {t('createAdmin.form.lastName')}
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
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
                    placeholder={t('createAdmin.form.lastNamePlaceholder')}
                  />
                  {fieldErrors.lastName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                    {t('createAdmin.form.firstName')}
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
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
                    placeholder={t('createAdmin.form.firstNamePlaceholder')}
                  />
                  {fieldErrors.firstName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.firstName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createAdmin.form.phone')}
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
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
                  placeholder={t('createAdmin.form.phonePlaceholder')}
                />
                {fieldErrors.phone && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className='block text-gray-700 dark:text-gray-300 text-xs font-medium mb-1'>
                  {t('createAdmin.form.password')}
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
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent`}
                  placeholder={t('createAdmin.form.passwordPlaceholder')}
                />
                {fieldErrors.password && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={isLoading}
                className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors duration-200 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <div className='flex items-center justify-center'>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    {t('createAdmin.form.creating')}
                  </div>
                ) : (
                  t('createAdmin.form.submit')
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
            navigate('/super-admin-dashboard');
          }}
          title={t('createAdmin.successModal.title')}
          user={createdUser}
        />
      )}
    </div>
  );
};

export default CreateAdmin;
