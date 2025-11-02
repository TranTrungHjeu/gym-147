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
import React, { useEffect, useRef, useState } from 'react';
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
  const [currentStep, setCurrentStep] = useState(1);

  // Refs for pickers
  const datePickerRef = useRef<HTMLInputElement>(null);
  const timePickerStartRef = useRef<HTMLInputElement>(null);
  const timePickerEndRef = useRef<HTMLInputElement>(null);
  const flatpickrInstanceRef = useRef<any>(null);
  const flatpickrTimeStartRef = useRef<any>(null);
  const flatpickrTimeEndRef = useRef<any>(null);

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
        special_notes: '',
      });
      setErrors({});
    }
  }, [isOpen, userId]);

  // Initialize date picker with flatpickr - Vietnamese format
  useEffect(() => {
    if (!isOpen || currentStep !== 2) {
      // Clean up when modal is closed or not on step 2
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
      return;
    }

    // Initialize flatpickr when step 2 is shown
    const initializeFlatpickr = () => {
      if (!datePickerRef.current) {
        setTimeout(initializeFlatpickr, 100);
        return;
      }

      if (flatpickrInstanceRef.current) {
        return; // Already initialized
      }

      // Check if already has flatpickr instance
      if ((datePickerRef.current as any)._flatpickr) {
        flatpickrInstanceRef.current = (datePickerRef.current as any)._flatpickr;
        return;
      }

      // Calculate minimum date (at least 3 days from now)
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 3);
      minDate.setHours(0, 0, 0, 0); // Reset time to start of day

      const fp = flatpickr(datePickerRef.current, {
        dateFormat: 'd/m/Y', // Vietnamese format: DD/MM/YYYY
        altFormat: 'd/m/Y', // Display format
        altInput: false,
        minDate: minDate, // At least 3 days from now
        allowInput: true,
        clickOpens: true,
        // Compact and professional styling
        static: false, // Inline calendar (more compact)
        inline: false, // Popup mode
        appendTo: document.body, // Append to body to avoid overflow issues
        locale: {
          firstDayOfWeek: 1, // Monday
          weekdays: {
            shorthand: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
            longhand: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
          },
          months: {
            shorthand: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
            longhand: [
              'Tháng 1',
              'Tháng 2',
              'Tháng 3',
              'Tháng 4',
              'Tháng 5',
              'Tháng 6',
              'Tháng 7',
              'Tháng 8',
              'Tháng 9',
              'Tháng 10',
              'Tháng 11',
              'Tháng 12',
            ],
          },
        },
        onChange: (selectedDates, dateStr) => {
          if (selectedDates.length > 0) {
            // Use local date components to avoid timezone issues
            const date = selectedDates[0];
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Store in YYYY-MM-DD for internal use
            const selectedDateISO = `${year}-${month}-${day}`;
            // Display in DD/MM/YYYY format
            const selectedDateDisplay = `${day}/${month}/${year}`;

            setFormData(prev => ({
              ...prev,
              date: selectedDateISO, // Store as ISO for consistency
            }));

            // Update input display value
            if (datePickerRef.current) {
              datePickerRef.current.value = selectedDateDisplay;
            }
          }
        },
      });

      flatpickrInstanceRef.current = Array.isArray(fp) ? fp[0] : fp;

      // Set initial value if formData.date exists
      if (formData.date) {
        try {
          // Convert YYYY-MM-DD to DD/MM/YYYY for display
          const [year, month, day] = formData.date.split('-');
          const displayDate = `${day}/${month}/${year}`;
          fp.setDate(displayDate, false);
          if (datePickerRef.current) {
            datePickerRef.current.value = displayDate;
          }
        } catch (error) {
          console.error('Error setting initial date:', error);
        }
      }
    };

    initializeFlatpickr();

    return () => {
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
    };
  }, [isOpen, currentStep]); // Re-initialize when step changes to step 2

  // Initialize time pickers with flatpickr - Vietnamese format (24h)
  useEffect(() => {
    if (!isOpen || currentStep !== 2) {
      // Clean up when modal is closed or not on step 2
      if (flatpickrTimeStartRef.current) {
        flatpickrTimeStartRef.current.destroy();
        flatpickrTimeStartRef.current = null;
      }
      if (flatpickrTimeEndRef.current) {
        flatpickrTimeEndRef.current.destroy();
        flatpickrTimeEndRef.current = null;
      }
      return;
    }

    // Initialize time pickers when step 2 is shown
    const initializeTimePickers = () => {
      // Start time picker
      if (!timePickerStartRef.current) {
        setTimeout(initializeTimePickers, 50);
        return;
      }

      if (flatpickrTimeStartRef.current) {
        return; // Already initialized
      }

      // Check if already has flatpickr instance
      if ((timePickerStartRef.current as any)._flatpickr) {
        flatpickrTimeStartRef.current = (timePickerStartRef.current as any)._flatpickr;
      } else {
        // Only set default date if formData already has a time value
        let defaultStartDate = null;
        if (formData.start_time) {
          const [startHour, startMin] = formData.start_time.split(':');
          const date = new Date();
          date.setHours(parseInt(startHour) || 9, parseInt(startMin) || 0, 0, 0);
          defaultStartDate = date;
        }

        const fpStartConfig: any = {
          enableTime: true,
          noCalendar: true,
          dateFormat: 'H:i', // 24-hour format (HH:mm)
          time_24hr: true, // Use 24-hour format (Vietnam standard)
          allowInput: false, // Don't allow manual input for consistency
          clickOpens: true,
          appendTo: document.body,
        };

        // Only set defaultDate if we have a time value
        if (defaultStartDate) {
          fpStartConfig.defaultDate = defaultStartDate;
        }

        const fpStart = flatpickr(timePickerStartRef.current, {
          ...fpStartConfig,
          onChange: (selectedDates, dateStr) => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const timeValue = `${hours}:${minutes}`;
              setFormData(prev => ({
                ...prev,
                start_time: timeValue,
              }));

              // Update input display - flatpickr will handle this automatically
              // but we ensure it's set correctly
              if (timePickerStartRef.current) {
                timePickerStartRef.current.value = timeValue;
              }
            } else if (dateStr) {
              // Fallback: use dateStr if available
              setFormData(prev => ({
                ...prev,
                start_time: dateStr,
              }));
              if (timePickerStartRef.current) {
                timePickerStartRef.current.value = dateStr;
              }
            }
          },
        });

        const instanceStart = Array.isArray(fpStart) ? fpStart[0] : fpStart;
        flatpickrTimeStartRef.current = instanceStart;
      }

      // End time picker
      if (!timePickerEndRef.current) {
        return;
      }

      if (flatpickrTimeEndRef.current) {
        return; // Already initialized
      }

      // Check if already has flatpickr instance
      if ((timePickerEndRef.current as any)._flatpickr) {
        flatpickrTimeEndRef.current = (timePickerEndRef.current as any)._flatpickr;
      } else {
        // Only set default date if formData already has a time value
        let defaultEndDate = null;
        if (formData.end_time) {
          const [endHour, endMin] = formData.end_time.split(':');
          const date = new Date();
          date.setHours(parseInt(endHour) || 10, parseInt(endMin) || 0, 0, 0);
          defaultEndDate = date;
        }

        const fpEndConfig: any = {
          enableTime: true,
          noCalendar: true,
          dateFormat: 'H:i', // 24-hour format (HH:mm)
          time_24hr: true, // Use 24-hour format (Vietnam standard)
          allowInput: false, // Don't allow manual input for consistency
          clickOpens: true,
          appendTo: document.body,
        };

        // Only set defaultDate if we have a time value
        if (defaultEndDate) {
          fpEndConfig.defaultDate = defaultEndDate;
        }

        const fpEnd = flatpickr(timePickerEndRef.current, {
          ...fpEndConfig,
          onChange: (selectedDates, dateStr) => {
            if (selectedDates.length > 0) {
              const date = selectedDates[0];
              const hours = String(date.getHours()).padStart(2, '0');
              const minutes = String(date.getMinutes()).padStart(2, '0');
              const timeValue = `${hours}:${minutes}`;
              setFormData(prev => ({
                ...prev,
                end_time: timeValue,
              }));

              // Update input display - flatpickr will handle this automatically
              // but we ensure it's set correctly
              if (timePickerEndRef.current) {
                timePickerEndRef.current.value = timeValue;
              }
            } else if (dateStr) {
              // Fallback: use dateStr if available
              setFormData(prev => ({
                ...prev,
                end_time: dateStr,
              }));
              if (timePickerEndRef.current) {
                timePickerEndRef.current.value = dateStr;
              }
            }
          },
        });

        const instanceEnd = Array.isArray(fpEnd) ? fpEnd[0] : fpEnd;
        flatpickrTimeEndRef.current = instanceEnd;
      }
    };

    const timer = setTimeout(() => {
      initializeTimePickers();
    }, 150); // Slightly longer delay to ensure date picker is initialized first

    return () => {
      clearTimeout(timer);
      if (flatpickrTimeStartRef.current) {
        flatpickrTimeStartRef.current.destroy();
        flatpickrTimeStartRef.current = null;
      }
      if (flatpickrTimeEndRef.current) {
        flatpickrTimeEndRef.current.destroy();
        flatpickrTimeEndRef.current = null;
      }
    };
  }, [isOpen, currentStep]); // Only re-initialize when modal opens/closes or step changes

  // Update time picker display values when formData changes (without re-initializing)
  useEffect(() => {
    if (flatpickrTimeStartRef.current && formData.start_time && timePickerStartRef.current) {
      try {
        // Update the input value directly
        timePickerStartRef.current.value = formData.start_time;
      } catch (error) {
        console.error('Error updating start time display:', error);
      }
    }
  }, [formData.start_time]);

  useEffect(() => {
    if (flatpickrTimeEndRef.current && formData.end_time && timePickerEndRef.current) {
      try {
        // Update the input value directly
        timePickerEndRef.current.value = formData.end_time;
      } catch (error) {
        console.error('Error updating end time display:', error);
      }
    }
  }, [formData.end_time]);

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

  const loadAllRooms = async () => {
    try {
      // Get all rooms from the rooms endpoint
      const response = await fetch('http://localhost:3003/rooms');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.rooms) {
          // Show all rooms, not just available ones
          setAvailableRooms(data.data.rooms);
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

  // Load all rooms when step 2 is shown (no need to check availability)
  useEffect(() => {
    if (isOpen && currentStep === 2 && availableRooms.length === 0) {
      loadAllRooms();
    }
  }, [isOpen, currentStep]);

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

      const submitData = {
        ...formData,
        date: dateForServer, // Ensure date is in DD/MM/YYYY format for server
        start_time: `${isoDate}T${formData.start_time}:00.000Z`,
        end_time: `${isoDate}T${formData.end_time}:00.000Z`,
      };

      const response = await scheduleService.createTrainerSchedule(userId, submitData);

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
      } else if (error.response?.data?.data?.errors && typeof error.response.data.data.errors === 'string') {
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

  if (!isOpen) return null;

  return (
    <>
      {/* Custom styles for compact datepicker and timepicker in modal */}
      <style>{`
        /* Compact datepicker for modal */
        .flatpickr-calendar {
          font-size: 12px !important;
          width: auto !important;
          padding: 8px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .flatpickr-months {
          margin-bottom: 4px !important;
        }
        .flatpickr-current-month {
          font-size: 13px !important;
          padding: 4px 0 !important;
        }
        .flatpickr-current-month .flatpickr-monthDropdown-months {
          font-size: 13px !important;
          padding: 2px 4px !important;
        }
        .flatpickr-current-month input.cur-year {
          font-size: 13px !important;
          padding: 2px 4px !important;
        }
        .flatpickr-weekdays {
          margin-top: 4px !important;
          margin-bottom: 2px !important;
        }
        .flatpickr-weekday {
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 4px 0 !important;
        }
        .flatpickr-days {
          margin-top: 4px !important;
        }
        .flatpickr-day {
          font-size: 12px !important;
          height: 28px !important;
          line-height: 28px !important;
          width: 28px !important;
          margin: 2px !important;
          border-radius: 6px !important;
        }
        .flatpickr-prev-month,
        .flatpickr-next-month {
          padding: 4px !important;
          height: 24px !important;
          width: 24px !important;
        }
        .flatpickr-prev-month svg,
        .flatpickr-next-month svg {
          width: 10px !important;
          height: 10px !important;
        }
        
        /* Compact timepicker for modal */
        .flatpickr-calendar.timepicker {
          width: auto !important;
          min-width: 120px !important;
          padding: 12px !important;
        }
        .flatpickr-time {
          padding: 0 !important;
          height: auto !important;
          line-height: 1.5 !important;
        }
        .flatpickr-time .flatpickr-time-wrapper {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
        }
        .flatpickr-time .flatpickr-am-pm {
          font-size: 11px !important;
          padding: 4px 6px !important;
          border-radius: 4px !important;
        }
        .flatpickr-time input {
          font-size: 14px !important;
          font-weight: 600 !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          padding: 0 !important;
          text-align: center !important;
          border-radius: 6px !important;
          border: 1px solid #e5e7eb !important;
          background: #f9fafb !important;
          transition: all 0.2s !important;
        }
        .flatpickr-time input:hover,
        .flatpickr-time input:focus {
          background: #ffffff !important;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1) !important;
        }
        .flatpickr-time .flatpickr-time-separator {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 0 2px !important;
        }
        .flatpickr-time .arrowUp,
        .flatpickr-time .arrowDown {
          border: none !important;
          width: 20px !important;
          height: 16px !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .flatpickr-time .arrowUp::after,
        .flatpickr-time .arrowDown::after {
          border-width: 4px !important;
        }
      `}</style>
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm animate-in fade-in duration-300'>
        <div className='bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-300'>
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-gray-200'>
            <div>
              <h2 className='text-lg font-heading font-semibold text-gray-900'>Mở Lớp Học Mới</h2>
              <p className='text-xs text-gray-600 mt-1'>
                Bước {currentStep}/2:{' '}
                {currentStep === 1 ? 'Thông tin lớp học' : 'Lịch trình & Phòng'}
              </p>
            </div>
            <button
              onClick={onClose}
              className='text-gray-400 hover:text-gray-600 transition-colors'
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className='px-4 py-2 bg-gray-50'>
            <div className='flex items-center space-x-2'>
              <div
                className={`w-2 h-2 rounded-full ${
                  currentStep >= 1 ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`flex-1 h-1 rounded-full ${
                  currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`w-2 h-2 rounded-full ${
                  currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              ></div>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className='p-4 space-y-4'
            onKeyDown={e => {
              // Prevent form submission on Enter key unless on final step and submit button is focused
              if (e.key === 'Enter' && currentStep === 1) {
                e.preventDefault();
                e.stopPropagation();
                handleNext();
              }
            }}
          >
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
                    <div className='relative'>
                      <input
                        ref={datePickerRef}
                        id='schedule-date'
                        type='text'
                        placeholder='dd/mm/yyyy'
                        readOnly
                        className={`w-full px-2.5 py-2 pr-8 text-xs border rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 cursor-pointer bg-white transition-colors ${
                          errors.date ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ fontSize: '12px' }}
                      />
                      <Calendar
                        size={14}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
                      />
                    </div>
                    {errors.date && <p className='text-xs text-red-500 mt-1'>{errors.date}</p>}
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-gray-700 mb-2'>
                      <Clock size={14} className='inline mr-1' />
                      Bắt đầu *
                    </label>
                    <div className='relative'>
                      <input
                        ref={timePickerStartRef}
                        id='time-start'
                        type='text'
                        placeholder='hh:mm'
                        readOnly
                        className={`w-full px-2.5 py-2 pr-8 text-xs border rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 cursor-pointer bg-white transition-colors ${
                          errors.start_time
                            ? 'border-red-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ fontSize: '12px' }}
                      />
                      <Clock
                        size={14}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
                      />
                    </div>
                    {errors.start_time && (
                      <p className='text-xs text-red-500 mt-1'>{errors.start_time}</p>
                    )}
                  </div>

                  <div>
                    <label className='block text-xs font-medium text-gray-700 mb-2'>
                      <Clock size={14} className='inline mr-1' />
                      Kết thúc *
                    </label>
                    <div className='relative'>
                      <input
                        ref={timePickerEndRef}
                        id='time-end'
                        type='text'
                        placeholder='hh:mm'
                        readOnly
                        className={`w-full px-2.5 py-2 pr-8 text-xs border rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 cursor-pointer bg-white transition-colors ${
                          errors.end_time
                            ? 'border-red-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ fontSize: '12px' }}
                      />
                      <Clock
                        size={14}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
                      />
                    </div>
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
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${
                        errors.room_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value=''>
                        {availableRooms.length === 0
                          ? 'Đang tải danh sách phòng...'
                          : 'Chọn phòng'}
                      </option>
                      {availableRooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} (Sức chứa: {room.capacity})
                        </option>
                      ))}
                    </select>
                    {errors.room_id && (
                      <p className='text-xs text-red-500 mt-1'>{errors.room_id}</p>
                    )}
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
                      onChange={e =>
                        handleInputChange('max_capacity', parseInt(e.target.value) || 1)
                      }
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
              <div
                className={`flex items-start p-3 border rounded-lg ${
                  errors.submit.includes('429') ||
                  errors.submit.includes('giới hạn') ||
                  errors.submit.includes('tối đa')
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <AlertCircle
                  size={16}
                  className={`mr-2 mt-0.5 flex-shrink-0 ${
                    errors.submit.includes('429') ||
                    errors.submit.includes('giới hạn') ||
                    errors.submit.includes('tối đa')
                      ? 'text-orange-500'
                      : 'text-red-500'
                  }`}
                />
                <div className='flex-1'>
                  <div
                    className={`text-xs font-medium whitespace-pre-line ${
                      errors.submit.includes('429') ||
                      errors.submit.includes('giới hạn') ||
                      errors.submit.includes('tối đa')
                        ? 'text-orange-800'
                        : 'text-red-600'
                    }`}
                  >
                    {errors.submit.split('\n').map((line, index) => (
                      <div key={index} className={index > 0 ? 'mt-1' : ''}>
                        {line.startsWith('•') || line.startsWith('Chi tiết') ? (
                          <span className='text-gray-600 font-normal'>{line}</span>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {(errors.submit.includes('429') ||
                    errors.submit.includes('giới hạn') ||
                    errors.submit.includes('tối đa')) && (
                    <p className='text-xs text-orange-600 mt-1'>
                      Bạn có thể xóa một số lịch đã tạo hôm nay để có thể tạo lịch mới, hoặc lên
                      lịch cho các ngày khác.
                    </p>
                  )}
                </div>
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
                    onClick={e => handleNext(e)}
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
    </>
  );
};

export default CreateScheduleModal;
