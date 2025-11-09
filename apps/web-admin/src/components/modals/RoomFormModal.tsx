import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Save,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';

interface Room {
  id: string;
  name: string;
  capacity: number;
  area_sqm?: number;
  equipment: string[];
  amenities: string[];
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING' | 'RESERVED';
  maintenance_notes?: string;
}

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Room>) => Promise<void>;
  room?: Room | null;
}

const ROOM_STATUSES = [
  { value: 'AVAILABLE', label: 'Sẵn sàng' },
  { value: 'OCCUPIED', label: 'Đang sử dụng' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'CLEANING', label: 'Đang dọn dẹp' },
  { value: 'RESERVED', label: 'Đã đặt' },
];

const AMENITIES = [
  { value: 'MIRRORS', label: 'Gương' },
  { value: 'PROJECTOR', label: 'Máy chiếu' },
  { value: 'SOUND_SYSTEM', label: 'Hệ thống âm thanh' },
  { value: 'AIR_CONDITIONING', label: 'Điều hòa' },
  { value: 'VENTILATION', label: 'Thông gió' },
  { value: 'LIGHTING', label: 'Ánh sáng' },
  { value: 'FLOORING', label: 'Sàn chuyên dụng' },
];

const RoomFormModal: React.FC<RoomFormModalProps> = ({ isOpen, onClose, onSave, room }) => {
  const [formData, setFormData] = useState<Partial<Room>>({
    name: '',
    capacity: 20,
    area_sqm: undefined,
    equipment: [],
    amenities: [],
    status: 'AVAILABLE',
    maintenance_notes: '',
  });
  const [equipmentInput, setEquipmentInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number>(1);

  useEffect(() => {
    if (isOpen) {
      if (room) {
        setFormData({
          name: room.name || '',
          capacity: room.capacity || 20,
          area_sqm: room.area_sqm || undefined,
          equipment: room.equipment || [],
          amenities: room.amenities || [],
          status: room.status || 'AVAILABLE',
          maintenance_notes: room.maintenance_notes || '',
        });
        // Edit mode: start at step 1 (same as create mode)
        setCurrentStep(1);
      } else {
        setFormData({
          name: '',
          capacity: 20,
          area_sqm: undefined,
          equipment: [],
          amenities: [],
          status: 'AVAILABLE',
          maintenance_notes: '',
        });
        // Create mode: start at step 1
        setCurrentStep(1);
      }
      setEquipmentInput('');
      setErrors({});
      prevStepRef.current = 1;
    }
  }, [isOpen, room]);

  // GSAP step transition animation
  useEffect(() => {
    if (!isOpen) return;

    const prevStep = prevStepRef.current;
    const isForward = currentStep > prevStep;

    // Get refs for current and previous steps
    const currentRef = currentStep === 1 ? step1Ref : step2Ref;
    const prevRef = prevStep === 1 ? step1Ref : step2Ref;

    if (currentRef.current && prevRef.current && prevStep !== currentStep) {
      const tl = gsap.timeline();

      // Exit previous step
      tl.to(prevRef.current, {
        opacity: 0,
        x: isForward ? -40 : 40,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          if (prevRef.current) prevRef.current.style.display = 'none';
        },
      });

      // Enter current step
      if (currentRef.current) {
        currentRef.current.style.display = 'block';
        gsap.set(currentRef.current, {
          opacity: 0,
          x: isForward ? 40 : -40,
          scale: 0.95,
        });

        tl.to(
          currentRef.current,
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.35,
            ease: 'power3.out',
          },
          '-=0.15'
        );
      }
    } else if (currentRef.current && prevStep === currentStep) {
      // First render
      if (currentRef.current) {
        currentRef.current.style.display = 'block';
        gsap.fromTo(
          currentRef.current,
          {
            opacity: 0,
            x: 30,
            scale: 0.98,
          },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power3.out',
          }
        );
      }
    }

    prevStepRef.current = currentStep;
  }, [currentStep, isOpen]);

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Tên phòng là bắt buộc';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tên phòng không được quá 100 ký tự';
    }

    if (!formData.capacity || formData.capacity < 1) {
      newErrors.capacity = 'Sức chứa phải ít nhất 1 người';
    } else if (formData.capacity > 500) {
      newErrors.capacity = 'Sức chứa không được quá 500 người';
    }

    if (formData.area_sqm !== undefined && formData.area_sqm < 0) {
      newErrors.area_sqm = 'Diện tích không được âm';
    }

    if (!formData.status) {
      newErrors.status = 'Trạng thái là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = (): boolean => {
    return validateStep1();
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
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
      let errorMessage = 'Có lỗi xảy ra khi lưu phòng';
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

  const handleInputChange = (field: keyof Room, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear submit error when user starts editing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const handleAddEquipment = () => {
    if (equipmentInput.trim()) {
      const equipment = formData.equipment || [];
      if (!equipment.includes(equipmentInput.trim())) {
        handleInputChange('equipment', [...equipment, equipmentInput.trim()]);
        setEquipmentInput('');
      }
    }
  };

  const handleRemoveEquipment = (item: string) => {
    const equipment = formData.equipment || [];
    handleInputChange(
      'equipment',
      equipment.filter(e => e !== item)
    );
  };

  const handleAmenityToggle = (amenity: string) => {
    const amenities = formData.amenities || [];
    const updated = amenities.includes(amenity)
      ? amenities.filter(a => a !== amenity)
      : [...amenities, amenity];
    handleInputChange('amenities', updated);
  };

  // Both edit and create modes use 2-step navigation
  const isEditMode = !!room;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={room ? 'Chỉnh sửa Phòng tập' : 'Thêm Phòng tập Mới'}
      size='lg'
      footer={
        <div className='flex justify-between items-center'>
          {/* Progress Indicator */}
          <div className='flex items-center gap-2'>
            <div className='flex gap-1.5'>
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  currentStep >= 1
                    ? 'bg-orange-600 dark:bg-orange-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <div
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  currentStep >= 2
                    ? 'bg-orange-600 dark:bg-orange-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            </div>
            <span className='text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
              Bước {currentStep}/2
            </span>
          </div>
          <div className='flex gap-3 ml-auto'>
            {currentStep === 2 && (
              <button
                type='button'
                onClick={handleBack}
                disabled={isLoading}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                <ChevronLeft className='w-4 h-4' />
                Quay lại
              </button>
            )}
            <button
              type='button'
              onClick={onClose}
              disabled={isLoading}
              className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
            >
              Hủy
            </button>
            {currentStep === 1 ? (
              <button
                type='button'
                onClick={handleNext}
                disabled={isLoading}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                Tiếp theo
                <ChevronRight className='w-4 h-4' />
              </button>
            ) : (
              <button
                type='button'
                onClick={handleSubmit}
                disabled={isLoading}
                className='inline-flex items-center gap-2 px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
              >
                {isLoading ? (
                  <>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Save className='w-4 h-4' />
                    {room ? 'Cập nhật' : 'Tạo mới'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className='relative'>
        <div className='min-h-[450px] w-full'>
          {/* Step 1: Basic Information */}
          <div
            ref={step1Ref}
            style={{ display: currentStep === 1 ? 'block' : 'none' }}
            className='w-full'
          >
            <div className='space-y-4'>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
              >
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <Building2 className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  Tên phòng *
                </label>
                <input
                  type='text'
                  value={formData.name || ''}
                  onChange={e => handleInputChange('name', e.target.value)}
                  placeholder='Nhập tên phòng'
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
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                    <Users className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                    Sức chứa *
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='500'
                    value={formData.capacity?.toString() || '20'}
                    onChange={e => handleInputChange('capacity', parseInt(e.target.value) || 20)}
                    className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.capacity
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  {errors.capacity && (
                    <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                      {errors.capacity}
                    </p>
                  )}
                </div>

                <div>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                    <Ruler className='w-4 h-4 text-green-600 dark:text-green-400' />
                    Diện tích (m²)
                  </label>
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    value={formData.area_sqm?.toString() || ''}
                    onChange={e =>
                      handleInputChange(
                        'area_sqm',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder='Nhập diện tích'
                    className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.area_sqm
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  {errors.area_sqm && (
                    <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                      {errors.area_sqm}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2 }}
              >
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <CheckCircle2 className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                  Trạng thái *
                </label>
                <CustomSelect
                  options={ROOM_STATUSES}
                  value={formData.status || 'AVAILABLE'}
                  onChange={value => handleInputChange('status', value as Room['status'])}
                  placeholder='Chọn trạng thái'
                  className={errors.status ? 'border-red-500 dark:border-red-500' : ''}
                />
                {errors.status && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.status}
                  </p>
                )}
              </motion.div>
            </div>
          </div>

          {/* Step 2: Equipment & Amenities */}
          <div
            ref={step2Ref}
            style={{ display: currentStep === 2 ? 'block' : 'none' }}
            className='w-full'
          >
            <div className='space-y-4'>
              {/* Equipment Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
                className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'
              >
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                  <Wrench className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  Thiết bị
                </label>
                <div className='flex gap-2 mb-3'>
                  <input
                    type='text'
                    value={equipmentInput}
                    onChange={e => setEquipmentInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEquipment();
                      }
                    }}
                    placeholder='Nhập tên thiết bị và nhấn Enter'
                    className='flex-1 px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
                  />
                  <button
                    type='button'
                    onClick={handleAddEquipment}
                    className='px-5 py-2.5 text-theme-xs font-semibold font-heading text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95'
                  >
                    Thêm
                  </button>
                </div>
                {formData.equipment && formData.equipment.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {formData.equipment.map((item, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-theme-xs font-inter border border-orange-200 dark:border-orange-800'
                      >
                        {item}
                        <button
                          type='button'
                          onClick={() => handleRemoveEquipment(item)}
                          className='text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 transition-colors duration-200 text-sm leading-none font-inter'
                          aria-label='Xóa thiết bị'
                        >
                          ×
                        </button>
                      </motion.span>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Amenities Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.2 }}
                className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'
              >
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                  <Sparkles className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                  Tiện ích
                </label>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-2.5'>
                  {AMENITIES.map((amenity, index) => (
                    <motion.label
                      key={amenity.value}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + index * 0.02, duration: 0.2 }}
                      className='flex items-center gap-2.5 p-3 border border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-gray-900 hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-200 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md'
                    >
                      <input
                        type='checkbox'
                        checked={(formData.amenities || []).includes(amenity.value)}
                        onChange={() => handleAmenityToggle(amenity.value)}
                        className='w-4 h-4 rounded accent-orange-600 focus:ring-orange-500 focus:ring-2 focus:ring-offset-0 dark:bg-gray-900 cursor-pointer'
                      />
                      <span className='text-theme-xs text-gray-700 dark:text-gray-300 font-inter font-medium'>
                        {amenity.label}
                      </span>
                    </motion.label>
                  ))}
                </div>
              </motion.div>

              {formData.status === 'MAINTENANCE' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className='p-2.5 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800'
                >
                  <label className='block text-[10px] font-semibold font-heading text-gray-900 dark:text-white mb-1 flex items-center gap-1'>
                    <AlertCircle className='w-3 h-3 text-warning-600 dark:text-warning-400' />
                    Ghi chú bảo trì
                  </label>
                  <textarea
                    value={formData.maintenance_notes || ''}
                    onChange={e => handleInputChange('maintenance_notes', e.target.value)}
                    rows={2}
                    placeholder='Nhập ghi chú bảo trì...'
                    className='w-full px-2.5 py-1.5 text-[10px] border border-warning-300 dark:border-warning-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-warning-500/30 focus:border-warning-500 dark:focus:border-warning-500 transition-all duration-200 font-inter resize-none shadow-sm'
                  />
                </motion.div>
              )}

              {/* Submit Error */}
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className='flex items-start gap-3 p-4 border rounded-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                >
                  <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <div className='text-[11px] font-medium font-inter text-red-600 dark:text-red-400 whitespace-pre-line'>
                      {errors.submit.split('\n').map((line, index) => (
                        <div key={index} className={index > 0 ? 'mt-1' : ''}>
                          {line.startsWith('•') || line.startsWith('Chi tiết') ? (
                            <span className='text-gray-600 dark:text-gray-400 font-normal'>
                              {line}
                            </span>
                          ) : (
                            <span>{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </form>
    </AdminModal>
  );
};

export default RoomFormModal;
