import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GymClass } from '../../services/schedule.service';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<GymClass>) => Promise<void>;
  gymClass?: GymClass | null;
}

const CLASS_CATEGORIES = [
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'STRENGTH', label: 'Sức mạnh' },
  { value: 'YOGA', label: 'Yoga' },
  { value: 'PILATES', label: 'Pilates' },
  { value: 'DANCE', label: 'Khiêu vũ' },
  { value: 'MARTIAL_ARTS', label: 'Võ thuật' },
  { value: 'AQUA', label: 'Bơi lội' },
  { value: 'FUNCTIONAL', label: 'Chức năng' },
  { value: 'RECOVERY', label: 'Phục hồi' },
  { value: 'SPECIALIZED', label: 'Chuyên biệt' },
];

const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Người mới bắt đầu' },
  { value: 'INTERMEDIATE', label: 'Trung bình' },
  { value: 'ADVANCED', label: 'Nâng cao' },
  { value: 'ALL_LEVELS', label: 'Tất cả cấp độ' },
];

const ClassFormModal: React.FC<ClassFormModalProps> = ({ isOpen, onClose, onSave, gymClass }) => {
  const [formData, setFormData] = useState<Partial<GymClass>>({
    name: '',
    description: '',
    category: 'CARDIO',
    duration: 60,
    max_capacity: 20,
    difficulty: 'BEGINNER',
    price: 0,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (gymClass) {
        setFormData({
          name: gymClass.name || '',
          description: gymClass.description || '',
          category: gymClass.category || 'CARDIO',
          duration: gymClass.duration || 60,
          max_capacity: gymClass.max_capacity || 20,
          difficulty: gymClass.difficulty || 'BEGINNER',
          price: gymClass.price || 0,
          is_active: gymClass.is_active !== undefined ? gymClass.is_active : true,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          category: 'CARDIO',
          duration: 60,
          max_capacity: 20,
          difficulty: 'BEGINNER',
          price: 0,
          is_active: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, gymClass]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Tên lớp học là bắt buộc';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tên lớp học không được quá 100 ký tự';
    }

    if (!formData.category) {
      newErrors.category = 'Danh mục là bắt buộc';
    }

    if (!formData.difficulty) {
      newErrors.difficulty = 'Cấp độ là bắt buộc';
    }

    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = 'Thời lượng phải ít nhất 15 phút';
    } else if (formData.duration > 180) {
      newErrors.duration = 'Thời lượng không được quá 180 phút';
    }

    if (!formData.max_capacity || formData.max_capacity < 1) {
      newErrors.max_capacity = 'Sức chứa phải ít nhất 1 người';
    } else if (formData.max_capacity > 100) {
      newErrors.max_capacity = 'Sức chứa không được quá 100 người';
    }

    if (formData.price === undefined || formData.price < 0) {
      newErrors.price = 'Giá không được âm';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Mô tả không được quá 500 ký tự';
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
    setErrors({}); // Clear previous errors
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = 'Có lỗi xảy ra khi lưu lớp học';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Extract detailed errors if available
      if (error.response?.data?.data?.errors && Array.isArray(error.response.data.data.errors)) {
        const errorDetails = error.response.data.data.errors.join('\n• ');
        errorMessage += `\n\nChi tiết lỗi:\n• ${errorDetails}`;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof GymClass, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear submit error when user starts editing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={gymClass ? 'Chỉnh sửa Lớp học' : 'Thêm Lớp học Mới'}
      size='md'
      footer={
        <div className='flex justify-end gap-3'>
          <button
            type='button'
            onClick={onClose}
            disabled={isLoading}
            className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          >
            Hủy
          </button>
          <button
            type='submit'
            onClick={handleSubmit}
            disabled={isLoading}
            className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
          >
            {isLoading ? (
              <>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                Đang lưu...
              </>
            ) : (
              <>
                <Save className='w-4 h-4' />
                {gymClass ? 'Cập nhật' : 'Tạo mới'}
              </>
            )}
          </button>
        </div>
      }
    >
      <motion.form
        onSubmit={handleSubmit}
        className='space-y-3'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
            Tên lớp học *
          </label>
          <input
            type='text'
            value={formData.name || ''}
            onChange={e => handleInputChange('name', e.target.value)}
            placeholder='Nhập tên lớp học'
            className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
              errors.name
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          />
          {errors.name && (
            <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
              {errors.name}
            </p>
          )}
        </motion.div>

        <motion.div
          className='grid grid-cols-2 gap-3'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
        >
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Danh mục *
            </label>
            <CustomSelect
              options={CLASS_CATEGORIES}
              value={formData.category || 'CARDIO'}
              onChange={value => handleInputChange('category', value)}
              placeholder='Chọn danh mục'
              className={errors.category ? 'border-red-500 dark:border-red-500' : ''}
            />
            {errors.category && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.category}
              </p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Cấp độ *
            </label>
            <CustomSelect
              options={DIFFICULTIES}
              value={formData.difficulty || 'BEGINNER'}
              onChange={value => handleInputChange('difficulty', value)}
              placeholder='Chọn cấp độ'
              className={errors.difficulty ? 'border-red-500 dark:border-red-500' : ''}
            />
            {errors.difficulty && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.difficulty}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          className='grid grid-cols-3 gap-3'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2 }}
        >
          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Thời lượng (phút) *
            </label>
            <input
              type='number'
              min='15'
              max='180'
              value={formData.duration?.toString() || '60'}
              onChange={e => handleInputChange('duration', parseInt(e.target.value) || 60)}
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.duration
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.duration && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.duration}
              </p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Sức chứa *
            </label>
            <input
              type='number'
              min='1'
              max='100'
              value={formData.max_capacity?.toString() || '20'}
              onChange={e => handleInputChange('max_capacity', parseInt(e.target.value) || 20)}
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.max_capacity
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.max_capacity && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.max_capacity}
              </p>
            )}
          </div>

          <div>
            <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
              Giá (VNĐ) *
            </label>
            <input
              type='number'
              min='0'
              value={formData.price?.toString() || '0'}
              onChange={e => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                errors.price
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            />
            {errors.price && (
              <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                {errors.price}
              </p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.2 }}
        >
          <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
            Mô tả
          </label>
          <textarea
            value={formData.description || ''}
            onChange={e => handleInputChange('description', e.target.value)}
            rows={4}
            placeholder='Nhập mô tả lớp học (tùy chọn)'
            className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
              errors.description
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          />
          {errors.description && (
            <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
              {errors.description}
            </p>
          )}
        </motion.div>

        <motion.div
          className='flex items-center gap-2'
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.2 }}
        >
          <input
            type='checkbox'
            id='is_active'
            checked={formData.is_active !== undefined ? formData.is_active : true}
            onChange={e => handleInputChange('is_active', e.target.checked)}
            className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 focus:ring-2 focus:ring-offset-0 dark:bg-gray-900'
          />
          <label
            htmlFor='is_active'
            className='text-theme-xs font-medium text-gray-700 dark:text-gray-300 font-inter cursor-pointer'
          >
            Kích hoạt lớp học
          </label>
        </motion.div>

        {/* Submit Error */}
        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className='flex items-start p-3 border rounded-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          >
            <div className='flex-1'>
              <div className='text-[11px] font-medium font-inter text-red-600 dark:text-red-400 whitespace-pre-line'>
                {errors.submit.split('\n').map((line, index) => (
                  <div key={index} className={index > 0 ? 'mt-1' : ''}>
                    {line.startsWith('•') || line.startsWith('Chi tiết') ? (
                      <span className='text-gray-600 dark:text-gray-400 font-normal'>{line}</span>
                    ) : (
                      <span>{line}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.form>
    </AdminModal>
  );
};

export default ClassFormModal;
