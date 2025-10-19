import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { scheduleService } from '../../services/schedule.service';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

interface FormData {
  category: string;
  difficulty: string;
  class_name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id: string;
  max_capacity: number;
  special_notes: string;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: string;
}

interface Certification {
  category: string;
  certification_level: string;
  certification_name: string;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
}) => {
  const [formData, setFormData] = useState<FormData>({
    category: '',
    difficulty: '',
    class_name: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    room_id: '',
    max_capacity: 1,
    special_notes: '',
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [datePicker, setDatePicker] = useState<flatpickr.Instance | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Load initial data
  useEffect(() => {
    if (isOpen && userId) {
      loadInitialData();
      setCurrentStep(1); // Reset to step 1 when opening
    }
  }, [isOpen, userId]);

  // Initialize date picker
  useEffect(() => {
    if (isOpen && !datePicker) {
      const fp = flatpickr('#schedule-date', {
        dateFormat: 'Y-m-d',
        minDate: 'today',
        onChange: selectedDates => {
          if (selectedDates.length > 0) {
            setFormData(prev => ({
              ...prev,
              date: selectedDates[0].toISOString().split('T')[0],
            }));
          }
        },
      });
      setDatePicker(Array.isArray(fp) ? fp[0] : fp);
    }

    return () => {
      if (datePicker && !Array.isArray(datePicker)) {
        datePicker.destroy();
        setDatePicker(null);
      }
    };
  }, [isOpen, datePicker]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load certifications and available categories
      const [certificationsRes, categoriesRes] = await Promise.all([
        scheduleService.getTrainerCertifications(userId),
        scheduleService.getAvailableCategories(userId),
      ]);

      if (certificationsRes.success) {
        setCertifications(certificationsRes.data);
      }

      if (categoriesRes.success) {
        setAvailableCategories(categoriesRes.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableRooms = async () => {
    if (!formData.date || !formData.start_time || !formData.end_time) {
      setAvailableRooms([]);
      return;
    }

    try {
      // Fix date format - convert DD/MM/YYYY to YYYY-MM-DD
      const dateStr = formData.date;
      const [day, month, year] = dateStr.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const startDateTime = `${isoDate}T${formData.start_time}:00.000Z`;
      const endDateTime = `${isoDate}T${formData.end_time}:00.000Z`;

      console.log('Loading rooms for:', { startDateTime, endDateTime });
      const response = await scheduleService.getAvailableRooms(startDateTime, endDateTime);
      console.log('Available rooms response:', response);

      if (response.success) {
        setAvailableRooms(response.data || []);
      } else {
        console.error('Failed to load rooms:', response.message);
        // Fallback: Load all rooms if API fails
        await loadAllRooms();
      }
    } catch (error) {
      console.error('Error loading available rooms:', error);
      // Fallback: Load all rooms if API fails
      await loadAllRooms();
    }
  };

  const loadAllRooms = async () => {
    try {
      // Fallback: Get all rooms from the general rooms endpoint
      const response = await fetch('http://localhost:3003/rooms');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.rooms) {
          setAvailableRooms(data.data.rooms.filter((room: any) => room.status === 'AVAILABLE'));
        }
      }
    } catch (error) {
      console.error('Error loading all rooms:', error);
      // Final fallback: Mock rooms for testing
      setAvailableRooms([
        { id: 'room1', name: 'Phòng Yoga 1', capacity: 20, status: 'AVAILABLE' },
        { id: 'room2', name: 'Phòng Gym 1', capacity: 30, status: 'AVAILABLE' },
        { id: 'room3', name: 'Phòng Aerobic', capacity: 25, status: 'AVAILABLE' },
      ]);
    }
  };

  // Load rooms when time changes
  useEffect(() => {
    if (formData.date && formData.start_time && formData.end_time) {
      loadAvailableRooms();
    }
  }, [formData.date, formData.start_time, formData.end_time]);

  const getAvailableDifficulties = (category: string): string[] => {
    const categoryCert = certifications.find(cert => cert.category === category);
    if (!categoryCert) return [];

    const level = categoryCert.certification_level;
    const difficultyMap: Record<string, string[]> = {
      BASIC: ['BEGINNER'],
      INTERMEDIATE: ['BEGINNER', 'INTERMEDIATE'],
      ADVANCED: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      EXPERT: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'],
    };

    return difficultyMap[level] || [];
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) newErrors.category = 'Vui lòng chọn môn học';
    if (!formData.difficulty) newErrors.difficulty = 'Vui lòng chọn cấp độ';
    if (!formData.class_name.trim()) newErrors.class_name = 'Vui lòng nhập tên lớp';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'Vui lòng chọn ngày';
    if (!formData.start_time) newErrors.start_time = 'Vui lòng chọn giờ bắt đầu';
    if (!formData.end_time) newErrors.end_time = 'Vui lòng chọn giờ kết thúc';
    if (!formData.room_id) newErrors.room_id = 'Vui lòng chọn phòng';
    if (!formData.max_capacity || formData.max_capacity < 1) {
      newErrors.max_capacity = 'Số lượng học viên phải lớn hơn 0';
    }

    // Time validation
    if (formData.start_time && formData.end_time) {
      const startTime = new Date(`2000-01-01T${formData.start_time}`);
      const endTime = new Date(`2000-01-01T${formData.end_time}`);

      if (startTime >= endTime) {
        newErrors.end_time = 'Giờ kết thúc phải sau giờ bắt đầu';
      }
    }

    // Room capacity validation
    const selectedRoom = availableRooms.find(room => room.id === formData.room_id);
    if (selectedRoom && formData.max_capacity > selectedRoom.capacity) {
      newErrors.max_capacity = `Số lượng học viên không được vượt quá sức chứa phòng (${selectedRoom.capacity})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep1() && validateStep2();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare form data with proper date format - convert DD/MM/YYYY to YYYY-MM-DD
      const [day, month, year] = formData.date.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const submitData = {
        ...formData,
        start_time: `${isoDate}T${formData.start_time}:00.000Z`,
        end_time: `${isoDate}T${formData.end_time}:00.000Z`,
      };

      console.log('Submitting schedule data:', submitData);
      const response = await scheduleService.createTrainerSchedule(userId, submitData);
      console.log('Create schedule response:', response);

      if (response.success) {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          category: '',
          difficulty: '',
          class_name: '',
          description: '',
          date: '',
          start_time: '',
          end_time: '',
          room_id: '',
          max_capacity: 1,
          special_notes: '',
        });
        setErrors({});
      } else {
        setErrors({ submit: response.message || 'Có lỗi xảy ra khi tạo lịch dạy' });
      }
    } catch (error: any) {
      console.error('Error creating schedule:', error);

      // Handle specific error cases
      if (error.message?.includes('403')) {
        setErrors({
          submit: 'Bạn chưa có chứng chỉ để dạy môn này hoặc chứng chỉ không đủ cấp độ',
        });
      } else if (error.message?.includes('409')) {
        setErrors({ submit: 'Đã có lịch dạy trùng giờ hoặc phòng đã được sử dụng' });
      } else {
        setErrors({ submit: error.message || 'Có lỗi xảy ra khi tạo lịch dạy' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Reset difficulty when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, difficulty: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm animate-in fade-in duration-300'>
      <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b border-gray-200'>
          <div>
            <h2 className='text-lg font-heading font-semibold text-gray-900'>Mở Lớp Học Mới</h2>
            <p className='text-xs text-gray-600 mt-1'>
              Bước {currentStep}/2: {currentStep === 1 ? 'Thông tin lớp học' : 'Lịch trình & Phòng'}
            </p>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600 transition-colors'>
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className='px-4 py-2 bg-gray-50'>
          <div className='flex items-center space-x-2'>
            <div
              className={`w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-orange-500' : 'bg-gray-300'}`}
            ></div>
            <div
              className={`flex-1 h-1 rounded-full ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-300'}`}
            ></div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-4 space-y-4'>
          {/* Step 1: Class Information */}
          {currentStep === 1 && (
            <div className='space-y-4'>
              {/* Category and Difficulty */}
              <div className='grid grid-cols-1 gap-3'>
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <BookOpen size={14} className='inline mr-1' />
                    Môn học *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => handleInputChange('category', e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value=''>Chọn môn học</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className='text-xs text-red-500 mt-1'>{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>Cấp độ *</label>
                  <select
                    value={formData.difficulty}
                    onChange={e => handleInputChange('difficulty', e.target.value)}
                    disabled={!formData.category}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.difficulty ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.category ? 'bg-gray-100' : ''}`}
                  >
                    <option value=''>Chọn cấp độ</option>
                    {getAvailableDifficulties(formData.category).map(difficulty => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                  {errors.difficulty && (
                    <p className='text-xs text-red-500 mt-1'>{errors.difficulty}</p>
                  )}
                </div>
              </div>

              {/* Class Name */}
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-2'>
                  Tên lớp học *
                </label>
                <input
                  type='text'
                  value={formData.class_name}
                  onChange={e => handleInputChange('class_name', e.target.value)}
                  placeholder='Nhập tên lớp học'
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                    errors.class_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.class_name && (
                  <p className='text-xs text-red-500 mt-1'>{errors.class_name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-2'>
                  Mô tả lớp học
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  placeholder='Mô tả về lớp học (tùy chọn)'
                  rows={2}
                  className='w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500'
                />
              </div>
            </div>
          )}

          {/* Step 2: Schedule and Room */}
          {currentStep === 2 && (
            <div className='space-y-4'>
              {/* Date and Time */}
              <div className='grid grid-cols-3 gap-2'>
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <Calendar size={14} className='inline mr-1' />
                    Ngày *
                  </label>
                  <input
                    id='schedule-date'
                    type='text'
                    value={formData.date}
                    onChange={e => handleInputChange('date', e.target.value)}
                    placeholder='Chọn ngày'
                    className={`w-full px-2 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && <p className='text-xs text-red-500 mt-1'>{errors.date}</p>}
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <Clock size={14} className='inline mr-1' />
                    Bắt đầu *
                  </label>
                  <input
                    type='time'
                    value={formData.start_time}
                    onChange={e => handleInputChange('start_time', e.target.value)}
                    className={`w-full px-2 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.start_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_time && (
                    <p className='text-xs text-red-500 mt-1'>{errors.start_time}</p>
                  )}
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <Clock size={14} className='inline mr-1' />
                    Kết thúc *
                  </label>
                  <input
                    type='time'
                    value={formData.end_time}
                    onChange={e => handleInputChange('end_time', e.target.value)}
                    className={`w-full px-2 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.end_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.end_time && (
                    <p className='text-xs text-red-500 mt-1'>{errors.end_time}</p>
                  )}
                </div>
              </div>

              {/* Room and Capacity */}
              <div className='grid grid-cols-1 gap-3'>
                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <MapPin size={14} className='inline mr-1' />
                    Phòng học *
                  </label>
                  <select
                    value={formData.room_id}
                    onChange={e => handleInputChange('room_id', e.target.value)}
                    disabled={!formData.date || !formData.start_time || !formData.end_time}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.room_id ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.date || !formData.start_time || !formData.end_time ? 'bg-gray-100' : ''}`}
                  >
                    <option value=''>
                      {!formData.date || !formData.start_time || !formData.end_time
                        ? 'Chọn ngày và giờ trước'
                        : availableRooms.length === 0
                          ? 'Đang tải phòng...'
                          : `Chọn phòng (${availableRooms.length} phòng có sẵn)`}
                    </option>
                    {availableRooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name} (Sức chứa: {room.capacity})
                      </option>
                    ))}
                  </select>
                  {errors.room_id && <p className='text-xs text-red-500 mt-1'>{errors.room_id}</p>}
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 mb-2'>
                    <Users size={14} className='inline mr-1' />
                    Số lượng học viên *
                  </label>
                  <input
                    type='number'
                    min='1'
                    value={formData.max_capacity}
                    onChange={e => handleInputChange('max_capacity', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                      errors.max_capacity ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.max_capacity && (
                    <p className='text-xs text-red-500 mt-1'>{errors.max_capacity}</p>
                  )}
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-2'>
                  Ghi chú đặc biệt
                </label>
                <textarea
                  value={formData.special_notes}
                  onChange={e => handleInputChange('special_notes', e.target.value)}
                  placeholder='Ghi chú đặc biệt cho lớp học (tùy chọn)'
                  rows={2}
                  className='w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500'
                />
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className='flex items-center p-3 bg-red-50 border border-red-200 rounded-lg'>
              <AlertCircle size={16} className='text-red-500 mr-2' />
              <p className='text-xs text-red-600'>{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex justify-between pt-4 border-t border-gray-200'>
            <div>
              {currentStep === 2 && (
                <button
                  type='button'
                  onClick={handlePrevious}
                  className='flex items-center px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors'
                >
                  <ChevronLeft size={14} className='mr-1' />
                  Quay lại
                </button>
              )}
            </div>

            <div className='flex space-x-2'>
              <button
                type='button'
                onClick={onClose}
                className='px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors'
              >
                Hủy
              </button>

              {currentStep === 1 ? (
                <button
                  type='button'
                  onClick={handleNext}
                  className='flex items-center px-3 py-2 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors'
                >
                  Tiếp theo
                  <ChevronRight size={14} className='ml-1' />
                </button>
              ) : (
                <button
                  type='submit'
                  disabled={loading}
                  className='px-3 py-2 text-xs font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  {loading ? 'Đang tạo...' : 'Tạo lịch dạy'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScheduleModal;
