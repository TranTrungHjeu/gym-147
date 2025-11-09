import React, { useState, useEffect } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal';
import CustomSelect from '../common/CustomSelect';
import { Trainer, trainerService } from '../../services/trainer.service';
import { useToast } from '../../context/ToastContext';

interface TrainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Trainer>) => Promise<void>;
  trainer?: Trainer | null;
}


const TrainerFormModal: React.FC<TrainerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  trainer,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<Trainer>>({
    full_name: '',
    email: '',
    phone: '',
    specializations: [],
    bio: '',
    experience_years: 0,
    hourly_rate: undefined,
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (trainer) {
        setFormData({
          full_name: trainer.full_name || '',
          email: trainer.email || '',
          phone: trainer.phone || '',
          specializations: trainer.specializations || [],
          bio: trainer.bio || '',
          experience_years: trainer.experience_years || 0,
          hourly_rate: trainer.hourly_rate || undefined,
          status: trainer.status || 'ACTIVE',
        });
      } else {
          setFormData({
          full_name: '',
          email: '',
          phone: '',
          specializations: [],
          bio: '',
          experience_years: 0,
          hourly_rate: undefined,
          status: 'ACTIVE',
        });
      }
      setErrors({});
    }
  }, [isOpen, trainer]);


  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name || formData.full_name.trim().length === 0) {
      newErrors.full_name = 'Tên đầy đủ là bắt buộc';
    } else if (formData.full_name.length < 2) {
      newErrors.full_name = 'Tên phải có ít nhất 2 ký tự';
    } else if (formData.full_name.length > 100) {
      newErrors.full_name = 'Tên không được quá 100 ký tự';
    }

    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.phone && !/^(0[3|5|7|8|9])[0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 và có 10 số';
    }

    if (formData.experience_years < 0) {
      newErrors.experience_years = 'Số năm kinh nghiệm không được âm';
    }

    if (formData.hourly_rate !== undefined && formData.hourly_rate < 0) {
      newErrors.hourly_rate = 'Giá theo giờ không được âm';
    }

    if (formData.bio && formData.bio.length > 1000) {
      newErrors.bio = 'Tiểu sử không được quá 1000 ký tự';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      // Remove specializations from formData before saving
      // Specializations are managed by trainers through certifications
      const { specializations, ...dataToSave } = formData;
      await onSave(dataToSave);
      showToast({
        message: 'Cập nhật huấn luyện viên thành công',
        type: 'success',
        duration: 3000,
      });
      // Delay close để toast có thời gian hiển thị
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error: any) {
      console.error('Error saving trainer:', error);
      showToast({
        message: error.message || 'Không thể cập nhật huấn luyện viên',
        type: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Trainer, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };


  const handleCreateNew = () => {
    onClose();
    navigate('/create-trainer');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-[900px] m-4'>
      <div className='relative w-full max-w-[900px] rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl max-h-[75vh] flex flex-col'>
        {/* Header */}
        <div className='flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700 px-6 py-4 rounded-t-2xl'>
          <h2 className='text-lg font-semibold font-heading text-gray-900 dark:text-white'>
            {trainer ? 'Chỉnh sửa Huấn luyện viên' : 'Thêm Huấn luyện viên Mới'}
          </h2>
        </div>

        {/* Form Content */}
        <form
          onSubmit={handleSubmit}
          className='flex-1 overflow-y-auto p-5'
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db transparent',
          }}
        >
          <style>{`
            form::-webkit-scrollbar {
              width: 4px;
            }
            form::-webkit-scrollbar-track {
              background: transparent;
            }
            form::-webkit-scrollbar-thumb {
              background-color: #d1d5db;
              border-radius: 2px;
            }
            form::-webkit-scrollbar-thumb:hover {
              background-color: #9ca3af;
            }
            .dark form::-webkit-scrollbar-thumb {
              background-color: #4b5563;
            }
            .dark form::-webkit-scrollbar-thumb:hover {
              background-color: #6b7280;
            }
          `}</style>
          {!trainer ? (
            <div className='text-center py-8'>
              <p className='text-theme-xs text-gray-600 dark:text-gray-400 mb-4 font-inter'>
                Để tạo huấn luyện viên mới, bạn cần tạo tài khoản người dùng trước.
              </p>
              <button
                onClick={handleCreateNew}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
              >
                <UserPlus className='w-4 h-4' />
                Tạo tài khoản huấn luyện viên
              </button>
            </div>
          ) : (
            <div className='space-y-3'>
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Tên đầy đủ *
              </label>
              <input
                type='text'
                value={formData.full_name || ''}
                onChange={e => handleInputChange('full_name', e.target.value)}
                placeholder='Nhập tên đầy đủ'
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.full_name
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.full_name && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.full_name}
                </p>
              )}
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Email *
              </label>
              <input
                type='email'
                value={formData.email || ''}
                onChange={e => handleInputChange('email', e.target.value)}
                placeholder='email@example.com'
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.email
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.email && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Số điện thoại
              </label>
              <input
                type='text'
                value={formData.phone || ''}
                onChange={e => handleInputChange('phone', e.target.value)}
                placeholder='0123456789'
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.phone
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.phone && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Kinh nghiệm (năm) *
              </label>
              <input
                type='number'
                min='0'
                value={formData.experience_years?.toString() || '0'}
                onChange={e => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                  errors.experience_years
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
              />
              {errors.experience_years && (
                <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                  {errors.experience_years}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Giá theo giờ (VNĐ)
            </label>
            <input
              type='number'
              min='0'
              value={formData.hourly_rate?.toString() || ''}
              onChange={e =>
                handleInputChange('hourly_rate', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder='Nhập giá theo giờ'
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.hourly_rate
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.hourly_rate && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.hourly_rate}
              </p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Tiểu sử
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={e => handleInputChange('bio', e.target.value)}
              rows={4}
              placeholder='Nhập tiểu sử (tùy chọn)'
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.bio
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.bio && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.bio}
              </p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Trạng thái
            </label>
            <CustomSelect
              options={[
                { value: 'ACTIVE', label: 'Hoạt động' },
                { value: 'INACTIVE', label: 'Không hoạt động' },
                { value: 'ON_LEAVE', label: 'Nghỉ phép' },
                { value: 'TERMINATED', label: 'Đã chấm dứt' },
              ]}
              value={formData.status || 'ACTIVE'}
              onChange={value => handleInputChange('status', value as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED')}
              placeholder='Chọn trạng thái'
              className='font-inter'
            />
            {errors.status && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.status}
              </p>
            )}
          </div>
            </div>
          )}
        </form>

        {/* Footer */}
        {trainer && (
          <div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-b-2xl'>
            <div className='flex justify-end gap-3'>
              <button
                type='button'
                onClick={onClose}
                disabled={isLoading}
                className='px-5 py-2.5 text-theme-xs font-semibold font-inter text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                Hủy
              </button>
              <button
                type='submit'
                onClick={handleSubmit}
                disabled={isLoading}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-inter text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                {isLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4' />
                    Cập nhật
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TrainerFormModal;

