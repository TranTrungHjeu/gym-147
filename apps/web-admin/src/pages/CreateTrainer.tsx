import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '../components/common/SuccessModal';
import { authService } from '../services/auth.service';

const CreateTrainer: React.FC = () => {
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
        if (!value) return 'Email là bắt buộc';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value))
          return 'Email phải có định dạng hợp lệ';
        if (value.length > 100) return 'Email không được quá 100 ký tự';
        return '';
      case 'password':
        if (!value) return 'Mật khẩu là bắt buộc';
        if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
        if (value.length > 50) return 'Mật khẩu không được quá 50 ký tự';
        if (!/(?=.*[a-z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ thường';
        if (!/(?=.*[A-Z])/.test(value)) return 'Mật khẩu phải có ít nhất 1 chữ hoa';
        if (!/(?=.*\d)/.test(value)) return 'Mật khẩu phải có ít nhất 1 số';
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value))
          return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt';
        return '';
      case 'firstName':
        if (!value) return 'Tên là bắt buộc';
        if (value.length < 2) return 'Tên phải có ít nhất 2 ký tự';
        if (
          !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s]+$/.test(
            value
          )
        )
          return 'Tên chỉ được chứa chữ cái và khoảng trắng';
        return '';
      case 'lastName':
        if (!value) return 'Họ là bắt buộc';
        if (value.length < 2) return 'Họ phải có ít nhất 2 ký tự';
        if (
          !/^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ\s]+$/.test(
            value
          )
        )
          return 'Họ chỉ được chứa chữ cái và khoảng trắng';
        return '';
      case 'phone':
        if (value && !/^(0[3|5|7|8|9])[0-9]{8}$/.test(value))
          return 'Số điện thoại phải bắt đầu bằng 0 và có 10 số';
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
              message: 'Tạo trainer thành công! Tài khoản đã được kích hoạt và có thể đăng nhập ngay.',
              duration: 5000,
            });
          } else {
            window.showToast({
              type: 'warning',
              message: 'Tạo trainer thành công nhưng chưa được tạo trong schedule-service. Vui lòng kiểm tra logs.',
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
            message: response.message || 'Có lỗi xảy ra khi tạo trainer',
            duration: 5000,
          });
        }
      }
    } catch (error: any) {
      console.error('Create trainer error:', error);
      if (window.showToast) {
        window.showToast({
          type: 'error',
          message: 'Có lỗi xảy ra khi tạo trainer. Vui lòng thử lại.',
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
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-8'>
          <button
            onClick={handleBack}
            className='mb-4 text-gray-600 hover:text-gray-800 transition-colors duration-200'
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
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Tạo Trainer Mới</h1>
          <p className='text-gray-600'>Tạo tài khoản huấn luyện viên mới cho hệ thống</p>
        </div>

        {/* Form */}
        <div className='max-w-xs mx-auto'>
          <div className='bg-white rounded-lg shadow-sm p-4 border'>
            <form onSubmit={handleSubmit} className='space-y-3'>
              {/* Email */}
              <div>
                <label className='block text-gray-700 text-xs font-medium mb-1'>Email *</label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent`}
                  placeholder='trainer@example.com'
                />
                {fieldErrors.email && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.email}</p>
                )}
              </div>

              {/* First Name and Last Name */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-gray-700 text-xs font-medium mb-1'>Họ *</label>
                  <input
                    type='text'
                    name='lastName'
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1.5 text-sm rounded border ${
                      fieldErrors.lastName ? 'border-red-500' : 'border-gray-300'
                    } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent`}
                    placeholder='Nguyễn'
                  />
                  {fieldErrors.lastName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className='block text-gray-700 text-xs font-medium mb-1'>Tên *</label>
                  <input
                    type='text'
                    name='firstName'
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-2 py-1.5 text-sm rounded border ${
                      fieldErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent`}
                    placeholder='Văn A'
                  />
                  {fieldErrors.firstName && (
                    <p className='text-red-500 text-xs mt-1'>{fieldErrors.firstName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className='block text-gray-700 text-xs font-medium mb-1'>
                  Số điện thoại
                </label>
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent`}
                  placeholder='0123456789'
                />
                {fieldErrors.phone && (
                  <p className='text-red-500 text-xs mt-1'>{fieldErrors.phone}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className='block text-gray-700 text-xs font-medium mb-1'>Mật khẩu *</label>
                <input
                  type='password'
                  name='password'
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-2 py-1.5 text-sm rounded border ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                  } text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent`}
                  placeholder='Mật khẩu mạnh'
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
                    Đang tạo...
                  </div>
                ) : (
                  'Tạo Trainer'
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
          title='Tài khoản Trainer đã được tạo thành công!'
          user={createdUser}
        />
      )}
    </div>
  );
};

export default CreateTrainer;
