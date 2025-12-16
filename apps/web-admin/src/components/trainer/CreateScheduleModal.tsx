import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Save,
  Calendar,
  Eye,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { scheduleService } from '../../services/schedule.service';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';
import DatePicker from '../common/DatePicker';
import Button from '../ui/Button/Button';
import { scheduleApi } from '@/services/api';

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
  minimum_participants: number | null;
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
    minimum_participants: null,
    special_notes: '',
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showRoomScheduleModal, setShowRoomScheduleModal] = useState(false);
  const [roomSchedules, setRoomSchedules] = useState<any[]>([]);
  const [loadingRoomSchedules, setLoadingRoomSchedules] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isOpen && userId) {
      loadInitialData();
      setCurrentStep(1); // Reset to step 1 when opening
      // Reset form when opening
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
        minimum_participants: null,
        special_notes: '',
      });
      setErrors({});
    }
  }, [isOpen, userId]);

  // Calculate minimum date (at least 3 days from now)
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

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
      // formData.date is now in YYYY-MM-DD format from flatpickr
      let isoDate: string;
      if (formData.date.includes('/')) {
        // Manual input format DD/MM/YYYY
        const [day, month, year] = formData.date.split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        // Already in YYYY-MM-DD format (from date picker)
        isoDate = formData.date;
      }

      const startDateTime = `${isoDate}T${formData.start_time}:00.000Z`;
      const endDateTime = `${isoDate}T${formData.end_time}:00.000Z`;

      const response = await scheduleService.getAvailableRooms(startDateTime, endDateTime);

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

  // Load room schedules for viewing
  const loadRoomSchedules = async () => {
    if (!formData.date) {
      setRoomSchedules([]);
      return;
    }

    try {
      setLoadingRoomSchedules(true);

      // Get all rooms with their schedules for the selected date
      const allRoomsResponse = await scheduleService.getAllRooms();
      if (!allRoomsResponse.success) {
        setRoomSchedules([]);
        return;
      }

      const rooms = Array.isArray(allRoomsResponse.data)
        ? allRoomsResponse.data
        : allRoomsResponse.data?.rooms || [];

      // Load schedules for each room
      const schedulesPromises = rooms.map(async (room: Room) => {
        try {
          const roomResponse = await scheduleService.getRoomById(room.id);
          if (roomResponse.success && roomResponse.data?.room?.schedules) {
            const schedules = roomResponse.data.room.schedules;

            // Filter schedules by selected date if date is provided
            let filteredSchedules = schedules;
            if (formData.date) {
              const selectedDate = new Date(formData.date);
              filteredSchedules = schedules.filter((schedule: any) => {
                const scheduleDate = new Date(schedule.start_time || schedule.date);
                return (
                  scheduleDate.getFullYear() === selectedDate.getFullYear() &&
                  scheduleDate.getMonth() === selectedDate.getMonth() &&
                  scheduleDate.getDate() === selectedDate.getDate()
                );
              });
            }

            return {
              room,
              schedules: filteredSchedules,
            };
          }
          return { room, schedules: [] };
        } catch (error) {
          console.error(`Error loading schedules for room ${room.id}:`, error);
          return { room, schedules: [] };
        }
      });

      const results = await Promise.all(schedulesPromises);
      setRoomSchedules(results);
    } catch (error) {
      console.error('Error loading room schedules:', error);
      setRoomSchedules([]);
    } finally {
      setLoadingRoomSchedules(false);
    }
  };

  const loadAllRooms = async () => {
    try {
      // Get all rooms from the rooms endpoint
      const response = await scheduleApi.get('/rooms');
      if (response.data?.success || response.data?.data) {
        const data = response.data;
        if (data.success && data.data?.rooms) {
          // Filter out rooms that are not available (MAINTENANCE, CLEANING, etc.)
          const availableRooms = data.data.rooms.filter(
            (room: Room) => room.status === 'AVAILABLE'
          );
          setAvailableRooms(availableRooms);
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

  // Load available rooms when step 2 is shown (only AVAILABLE status)
  useEffect(() => {
    if (isOpen && currentStep === 2 && availableRooms.length === 0) {
      loadAllRooms();
    }
  }, [isOpen, currentStep]);

  // Load room schedules when modal opens or date changes
  useEffect(() => {
    if (showRoomScheduleModal && formData.date) {
      loadRoomSchedules();
    }
  }, [showRoomScheduleModal, formData.date]);

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
      } else {
        // Validate duration (30 minutes to 3 hours)
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const minDuration = 30; // 30 minutes
        const maxDuration = 180; // 3 hours (180 minutes)

        if (durationMinutes < minDuration) {
          newErrors.end_time = 'Thời lượng lớp học tối thiểu 30 phút';
        } else if (durationMinutes > maxDuration) {
          newErrors.end_time = 'Thời lượng lớp học tối đa 3 giờ (180 phút)';
        }
      }
    }

    // Room capacity validation
    const selectedRoom = availableRooms.find(room => room.id === formData.room_id);
    if (selectedRoom && formData.max_capacity > selectedRoom.capacity) {
      newErrors.max_capacity = `Số lượng học viên không được vượt quá sức chứa phòng (${selectedRoom.capacity})`;
    }

    // Minimum participants validation
    if (formData.minimum_participants !== null && formData.minimum_participants !== undefined) {
      if (formData.minimum_participants < 1) {
        newErrors.minimum_participants = 'Số học viên tối thiểu phải lớn hơn 0';
      } else if (formData.minimum_participants > formData.max_capacity) {
        newErrors.minimum_participants = `Số học viên tối thiểu không được vượt quá số lượng tối đa (${formData.max_capacity})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep1() && validateStep2();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    // Only submit if we're on the final step
    if (currentStep !== 2) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare form data with proper date format
      // formData.date can be either YYYY-MM-DD (from datePicker) or DD/MM/YYYY (manual input)
      let isoDate: string;
      let dateForServer: string; // DD/MM/YYYY format for server

      if (formData.date.includes('/')) {
        // Already in DD/MM/YYYY format
        const [day, month, year] = formData.date.split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        dateForServer = formData.date; // Keep as is
      } else {
        // In YYYY-MM-DD format (from datePicker)
        const [year, month, day] = formData.date.split('-');
        isoDate = formData.date;
        dateForServer = `${day}/${month}/${year}`; // Convert to DD/MM/YYYY for server
      }

      // Validate date is at least 3 days in the future (client-side check)
      const selectedDate = new Date(isoDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < threeDaysFromNow) {
        const earliestDateStr = threeDaysFromNow.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        setErrors({
          submit: `Lịch dạy phải được tạo trước ít nhất 3 ngày để chuẩn bị.\n\nNgày sớm nhất có thể tạo: ${earliestDateStr}`,
        });
        setLoading(false);
        return;
      }

      // Create datetime strings in local timezone (Vietnam timezone)
      // Don't add .000Z (UTC) - let backend handle timezone conversion
      // Format: YYYY-MM-DDTHH:mm:ss (local time, no timezone indicator)
      const submitData = {
        ...formData,
        date: dateForServer, // Ensure date is in DD/MM/YYYY format for server
        start_time: `${isoDate}T${formData.start_time}:00`,
        end_time: `${isoDate}T${formData.end_time}:00`,
      };

      const response = await scheduleService.createTrainerSchedule(userId, submitData);

      if (response.success) {
        // Reset form first
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
          minimum_participants: null,
          special_notes: '',
        });
        setErrors({});
        setCurrentStep(1);

        // Call onSuccess callback (which will refresh the list, show toast, and close modal)
        // Don't call onClose() here as onSuccess handles it
        onSuccess();
      } else {
        setErrors({ submit: response.message || 'Có lỗi xảy ra khi tạo lịch dạy' });
      }
    } catch (error: any) {
      // Handle specific error cases
      let errorMessage = 'Có lỗi xảy ra khi tạo lịch dạy';
      let errorDetails = '';

      // Prioritize server error message if available
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('HTTP error')) {
        errorMessage = error.message;
      }

      // Extract detailed errors if available
      if (error.response?.data?.data?.errors && Array.isArray(error.response.data.data.errors)) {
        errorDetails = error.response.data.data.errors.join('\n• ');
      } else if (
        error.response?.data?.data?.errors &&
        typeof error.response.data.data.errors === 'string'
      ) {
        errorDetails = error.response.data.data.errors;
      }

      // Handle specific HTTP status codes with more context
      if (error.status === 400) {
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đã nhập.';
        }

        // Show detailed validation errors for 400
        if (errorDetails) {
          errorMessage += `\n\nChi tiết lỗi:\n• ${errorDetails}`;
        } else if (error.response?.data?.data?.earliestDate) {
          const earliestDate = new Date(error.response.data.data.earliestDate);
          const dateStr = earliestDate.toLocaleDateString('vi-VN');
          errorMessage += `\n\nNgày sớm nhất có thể tạo: ${dateStr}`;
        }
      } else if (error.status === 403) {
        if (!error.response?.data?.message) {
          errorMessage = 'Bạn chưa có chứng chỉ để dạy môn này hoặc chứng chỉ không đủ cấp độ';
        }
      } else if (error.status === 409) {
        if (!error.response?.data?.message) {
          errorMessage =
            'Đã có lịch dạy trùng giờ hoặc phòng đã được sử dụng trong khoảng thời gian này';
        }
      } else if (error.status === 429) {
        // Rate limit error - provide clear guidance
        if (!error.response?.data?.message || !errorMessage.includes('tối đa')) {
          errorMessage =
            'Bạn đã tạo quá nhiều lịch dạy hôm nay (tối đa 10 lịch/ngày). Vui lòng thử lại vào ngày mai hoặc liên hệ quản trị viên nếu cần tăng giới hạn.';
        }
      } else if (error.status === 500) {
        errorMessage = 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
      }

      setErrors({ submit: errorMessage });
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

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(1);
  };

  // Category translation mapping
  const categoryLabels: Record<string, string> = {
    CARDIO: 'Cardio',
    STRENGTH: 'Sức mạnh',
    YOGA: 'Yoga',
    PILATES: 'Pilates',
    DANCE: 'Khiêu vũ',
    MARTIAL_ARTS: 'Võ thuật',
    AQUA: 'Bơi lội',
    FUNCTIONAL: 'Chức năng',
    RECOVERY: 'Phục hồi',
    SPECIALIZED: 'Chuyên biệt',
  };

  // Prepare category options for CustomSelect with Vietnamese labels
  const categoryOptions = availableCategories.map(cat => ({
    value: cat,
    label: categoryLabels[cat] || cat,
  }));

  // Difficulty translation mapping
  const difficultyLabels: Record<string, string> = {
    BEGINNER: 'Người mới bắt đầu',
    INTERMEDIATE: 'Trung bình',
    ADVANCED: 'Nâng cao',
    ALL_LEVELS: 'Tất cả cấp độ',
  };

  // Prepare difficulty options for CustomSelect with Vietnamese labels
  const difficultyOptions = getAvailableDifficulties(formData.category).map(diff => ({
    value: diff,
    label: difficultyLabels[diff] || diff,
  }));

  // Prepare room options for CustomSelect
  const roomOptions = availableRooms.map(room => ({
    value: room.id,
    label: `${room.name} (Sức chứa: ${room.capacity})`,
  }));

  if (!isOpen) return null;

  return (
    <>
      <AdminModal
        isOpen={isOpen}
        onClose={onClose}
        title='Mở Lớp Học Mới'
        size='md'
        footer={
          <div className='flex justify-between items-center'>
            <div>
              {currentStep === 2 && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handlePrevious}
                  startIcon={<ChevronLeft className='w-4 h-4' />}
                  className='text-[11px] font-heading'
                >
                  Quay lại
                </Button>
              )}
            </div>
            <div className='flex gap-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={onClose}
                disabled={loading}
                className='text-[11px] font-heading'
              >
                Hủy
              </Button>
              {currentStep === 1 ? (
                <Button
                  type='button'
                  variant='primary'
                  size='sm'
                  onClick={() => handleNext()}
                  endIcon={<ChevronRight className='w-4 h-4' />}
                  className='text-[11px] font-heading'
                >
                  Tiếp theo
                </Button>
              ) : (
                <button
                  type='button'
                  onClick={e => {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }}
                  disabled={loading}
                  className='inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 active:scale-95 text-[11px] font-heading bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 focus:ring-orange-500/30 disabled:bg-orange-300 disabled:opacity-60 shadow-sm hover:shadow-md disabled:cursor-not-allowed'
                >
                  {loading ? (
                    <>
                      <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4' />
                      Tạo lịch dạy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Progress Indicator */}
        <div className='mb-6 pb-4 border-b border-gray-200 dark:border-gray-800'>
          <div className='flex items-center justify-between mb-2'>
            <span className='text-[11px] font-semibold font-heading text-gray-600 dark:text-gray-400'>
              Bước {currentStep}/2
            </span>
            <span className='text-[11px] font-medium font-inter text-gray-500 dark:text-gray-500'>
              {currentStep === 1 ? 'Thông tin lớp học' : 'Lịch trình & Phòng'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <div
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                currentStep >= 1
                  ? 'bg-orange-500 dark:bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
            <div
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                currentStep >= 2
                  ? 'bg-orange-500 dark:bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
            <div
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                currentStep >= 2
                  ? 'bg-orange-500 dark:bg-orange-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='space-y-3'
          onKeyDown={e => {
            // Prevent form submission on Enter key unless on final step and submit button is focused
            if (e.key === 'Enter' && currentStep === 1) {
              e.preventDefault();
              e.stopPropagation();
              handleNext();
            }
          }}
        >
          {/* Step Container - Fixed height to prevent modal resize */}
          <div className='min-h-[380px]'>
            {/* Step 1: Class Information */}
            {currentStep === 1 && (
              <div className='space-y-3'>
                {/* Category and Difficulty */}
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                      Môn học *
                    </label>
                    <CustomSelect
                      options={categoryOptions}
                      value={formData.category}
                      onChange={value => handleInputChange('category', value)}
                      placeholder='Chọn môn học'
                      icon={<BookOpen className='w-3.5 h-3.5' />}
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
                      options={difficultyOptions}
                      value={formData.difficulty}
                      onChange={value => handleInputChange('difficulty', value)}
                      placeholder='Chọn cấp độ'
                      disabled={!formData.category}
                      className={errors.difficulty ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.difficulty && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.difficulty}
                      </p>
                    )}
                  </div>
                </div>

                {/* Class Name */}
                <div>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                    Tên lớp học *
                  </label>
                  <input
                    type='text'
                    value={formData.class_name}
                    onChange={e => handleInputChange('class_name', e.target.value)}
                    placeholder='Nhập tên lớp học'
                    className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.class_name
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  {errors.class_name && (
                    <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                      {errors.class_name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                    Mô tả lớp học
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    placeholder='Mô tả về lớp học (tùy chọn)'
                    rows={3}
                    className='w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 border-gray-300 dark:border-gray-700'
                  />
                </div>
              </div>
            )}

            {/* Step 2: Schedule and Room */}
            {currentStep === 2 && (
              <div className='space-y-3'>
                {/* Date and Time */}
                <div className='grid grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                      Ngày *
                    </label>
                    <div className='relative'>
                      <DatePicker
                        value={formData.date}
                        onChange={date => {
                          if (typeof date === 'string') {
                            setFormData(prev => ({ ...prev, date }));
                          }
                        }}
                        placeholder='dd/mm/yyyy'
                        mode='single'
                        minDate={minDate}
                        className={errors.date ? 'border-red-500' : ''}
                      />
                    </div>
                    {errors.date && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                      Bắt đầu *
                    </label>
                    <div className='relative'>
                      <DatePicker
                        value={
                          formData.start_time ? `2000-01-01 ${formData.start_time}` : undefined
                        }
                        onChange={date => {
                          if (typeof date === 'string') {
                            const timePart = date.split(' ')[1]?.substring(0, 5);
                            if (timePart) {
                              setFormData(prev => ({ ...prev, start_time: timePart }));
                            }
                          }
                        }}
                        placeholder='hh:mm'
                        mode='time'
                        noCalendar={true}
                        dateFormat='H:i'
                        className={errors.start_time ? 'border-red-500' : ''}
                      />
                      <Clock
                        size={14}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none'
                      />
                    </div>
                    {errors.start_time && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.start_time}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                      Kết thúc *
                    </label>
                    <div className='relative'>
                      <DatePicker
                        value={formData.end_time ? `2000-01-01 ${formData.end_time}` : undefined}
                        onChange={date => {
                          if (typeof date === 'string') {
                            const timePart = date.split(' ')[1]?.substring(0, 5);
                            if (timePart) {
                              setFormData(prev => ({ ...prev, end_time: timePart }));
                            }
                          }
                        }}
                        placeholder='hh:mm'
                        mode='time'
                        noCalendar={true}
                        dateFormat='H:i'
                        className={errors.end_time ? 'border-red-500' : ''}
                      />
                      <Clock
                        size={14}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none'
                      />
                    </div>
                    {errors.end_time && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.end_time}
                      </p>
                    )}
                  </div>
                </div>

                {/* Room and Capacity */}
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <div className='flex items-center justify-between mb-2'>
                      <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white'>
                        Phòng học *
                      </label>
                      {formData.date && (
                        <button
                          type='button'
                          onClick={() => setShowRoomScheduleModal(true)}
                          className='flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium'
                        >
                          <Eye className='w-3 h-3' />
                          Xem lịch phòng
                        </button>
                      )}
                    </div>
                    <CustomSelect
                      options={roomOptions}
                      value={formData.room_id}
                      onChange={value => handleInputChange('room_id', value)}
                      placeholder={
                        availableRooms.length === 0 ? 'Đang tải danh sách phòng...' : 'Chọn phòng'
                      }
                      icon={<MapPin className='w-3.5 h-3.5' />}
                      disabled={availableRooms.length === 0}
                      className={errors.room_id ? 'border-red-500 dark:border-red-500' : ''}
                    />
                    {errors.room_id && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.room_id}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                      Số lượng học viên tối đa *
                    </label>
                    <input
                      type='number'
                      min='1'
                      value={formData.max_capacity}
                      onChange={e =>
                        handleInputChange('max_capacity', parseInt(e.target.value) || 1)
                      }
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
                      Số học viên tối thiểu (tùy chọn)
                    </label>
                    <input
                      type='number'
                      min='1'
                      value={formData.minimum_participants || ''}
                      onChange={e => {
                        const value = e.target.value;
                        handleInputChange(
                          'minimum_participants',
                          value === '' ? null : parseInt(value) || null
                        );
                      }}
                      placeholder='Để trống nếu không yêu cầu tối thiểu'
                      className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                        errors.minimum_participants
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    <p className='mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-inter'>
                      Nếu không đủ số học viên tối thiểu trước 1 ngày, lớp sẽ tự động hủy
                    </p>
                    {errors.minimum_participants && (
                      <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                        {errors.minimum_participants}
                      </p>
                    )}
                  </div>
                </div>

                {/* Special Notes */}
                <div>
                  <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                    Ghi chú đặc biệt
                  </label>
                  <textarea
                    value={formData.special_notes}
                    onChange={e => handleInputChange('special_notes', e.target.value)}
                    placeholder='Ghi chú đặc biệt cho lớp học (tùy chọn)'
                    rows={3}
                    className='w-full px-4 py-2.5 text-theme-xs border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 border-gray-300 dark:border-gray-700'
                  />
                </div>

                {/* Submit Error - Moved here to avoid increasing modal height */}
                {errors.submit && (
                  <div
                    className={`flex items-start p-2.5 border rounded-lg mt-2 ${
                      errors.submit.includes('429') ||
                      errors.submit.includes('giới hạn') ||
                      errors.submit.includes('tối đa')
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <AlertCircle
                      size={14}
                      className={`mr-2 mt-0.5 flex-shrink-0 ${
                        errors.submit.includes('429') ||
                        errors.submit.includes('giới hạn') ||
                        errors.submit.includes('tối đa')
                          ? 'text-orange-500 dark:text-orange-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}
                    />
                    <div className='flex-1 min-w-0'>
                      <div
                        className={`text-[10px] font-medium font-inter whitespace-pre-line leading-relaxed ${
                          errors.submit.includes('429') ||
                          errors.submit.includes('giới hạn') ||
                          errors.submit.includes('tối đa')
                            ? 'text-orange-800 dark:text-orange-300'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {errors.submit.split('\n').map((line, index) => (
                          <div key={index} className={index > 0 ? 'mt-0.5' : ''}>
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
                      {(errors.submit.includes('429') ||
                        errors.submit.includes('giới hạn') ||
                        errors.submit.includes('tối đa')) && (
                        <p className='text-[10px] text-orange-600 dark:text-orange-400 mt-1 font-inter leading-relaxed'>
                          Bạn có thể xóa một số lịch đã tạo hôm nay để có thể tạo lịch mới, hoặc lên
                          lịch cho các ngày khác.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </AdminModal>

      {/* Room Schedule Modal */}
      <AdminModal
        isOpen={showRoomScheduleModal}
        onClose={() => setShowRoomScheduleModal(false)}
        title='Lịch các phòng'
        size='lg'
      >
        <div className='space-y-4'>
          {!formData.date ? (
            <div className='text-center py-8 text-sm text-gray-500 dark:text-gray-400'>
              Vui lòng chọn ngày để xem lịch phòng
            </div>
          ) : loadingRoomSchedules ? (
            <div className='text-center py-8 text-sm text-gray-500 dark:text-gray-400'>
              Đang tải lịch phòng...
            </div>
          ) : (
            <div className='space-y-4 max-h-[60vh] overflow-y-auto'>
              {roomSchedules.map(({ room, schedules }) => (
                <div
                  key={room.id}
                  className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700'
                >
                  <div className='flex items-center justify-between mb-3'>
                    <div className='flex items-center gap-2'>
                      <MapPin className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                      <h3 className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {room.name}
                      </h3>
                      <span className='text-xs text-gray-500 dark:text-gray-400'>
                        (Sức chứa: {room.capacity})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        room.id === formData.room_id
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {schedules.length} lịch
                    </span>
                  </div>

                  {schedules.length === 0 ? (
                    <p className='text-xs text-gray-500 dark:text-gray-400 text-center py-2'>
                      Phòng trống trong ngày này
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {schedules.map((schedule: any) => {
                        const startTime = new Date(schedule.start_time || schedule.date);
                        const endTime = new Date(schedule.end_time);
                        const isConflict =
                          formData.start_time &&
                          formData.end_time &&
                          startTime < new Date(`${formData.date}T${formData.end_time}`) &&
                          endTime > new Date(`${formData.date}T${formData.start_time}`);

                        return (
                          <div
                            key={schedule.id}
                            className={`p-2.5 rounded-lg border ${
                              isConflict
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div className='flex-1 min-w-0'>
                                <p className='text-xs font-semibold text-gray-900 dark:text-white truncate'>
                                  {schedule.gym_class?.name || 'Lớp học không xác định'}
                                </p>
                                <p className='text-[10px] text-gray-600 dark:text-gray-400 mt-0.5'>
                                  {startTime.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  -{' '}
                                  {endTime.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                {schedule.trainer?.full_name && (
                                  <p className='text-[10px] text-gray-500 dark:text-gray-500 mt-0.5'>
                                    HLV: {schedule.trainer.full_name}
                                  </p>
                                )}
                                {isConflict && (
                                  <p className='text-[10px] text-red-600 dark:text-red-400 mt-1 font-medium'>
                                    ⚠ Trùng giờ với lịch bạn đang tạo
                                  </p>
                                )}
                              </div>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border flex-shrink-0 ${
                                  schedule.status === 'SCHEDULED'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : schedule.status === 'IN_PROGRESS'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                                }`}
                              >
                                {schedule.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {room.id !== formData.room_id && (
                    <button
                      type='button'
                      onClick={() => {
                        handleInputChange('room_id', room.id);
                        setShowRoomScheduleModal(false);
                      }}
                      className='mt-3 w-full px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors'
                    >
                      Chọn phòng này
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminModal>
    </>
  );
};

export default CreateScheduleModal;
