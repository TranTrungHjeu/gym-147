import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { Calendar, Clock, Save } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GymClass, ScheduleItem, scheduleService } from '../../services/schedule.service';
import { trainerService } from '../../services/trainer.service';
import AdminModal from '../common/AdminModal';
import CustomSelect from '../common/CustomSelect';
import { ButtonSpinner } from '../ui/AppLoading';

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ScheduleItem>) => Promise<void>;
  schedule?: ScheduleItem | null;
}

interface ScheduleFormData {
  class_id: string;
  trainer_id?: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  price_override?: number;
  special_notes: string;
  status: string;
}

const SCHEDULE_STATUSES = [
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'POSTPONED', label: 'Hoãn lại' },
];

// Helper function to format time in Vietnam timezone
const formatTimeVN = (timeString: string): string => {
  // Check if it's already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    return timeString;
  }

  // Check if it's a datetime string (contains 'T' or is ISO format)
  if (timeString.includes('T') || timeString.includes(' ')) {
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', timeString);
        return '';
      }
      return date.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.error('Error formatting time:', error, timeString);
      return '';
    }
  }

  // If it's just time (HH:MM:SS or HH:MM), return as is or extract HH:MM
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
    return timeString.slice(0, 5); // Return HH:MM
  }

  console.warn('Unknown time format:', timeString);
  return '';
};

// Helper function to format date in Vietnam timezone (YYYY-MM-DD)
const formatDateVN = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const vnDateStr = date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }); // Returns YYYY-MM-DD format
  return vnDateStr;
};

const ScheduleFormModal: React.FC<ScheduleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  schedule,
}) => {
  const [formData, setFormData] = useState<ScheduleFormData>({
    class_id: '',
    trainer_id: '',
    room_id: '',
    date: '',
    start_time: '',
    end_time: '',
    max_capacity: 20,
    price_override: undefined,
    special_notes: '',
    status: 'SCHEDULED',
  });
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const timePickerStartRef = useRef<HTMLInputElement>(null);
  const timePickerEndRef = useRef<HTMLInputElement>(null);
  const flatpickrInstanceRef = useRef<any>(null);
  const flatpickrTimeStartRef = useRef<any>(null);
  const flatpickrTimeEndRef = useRef<any>(null);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (!schedule) {
        setFormData({
          class_id: '',
          trainer_id: '',
          room_id: '',
          date: '',
          start_time: '',
          end_time: '',
          max_capacity: 20,
          price_override: undefined,
          special_notes: '',
          status: 'SCHEDULED',
        });
      }
      setErrors({});
    } else {
      // Clean up flatpickr when modal closes
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
      if (flatpickrTimeStartRef.current) {
        flatpickrTimeStartRef.current.destroy();
        flatpickrTimeStartRef.current = null;
      }
      if (flatpickrTimeEndRef.current) {
        flatpickrTimeEndRef.current.destroy();
        flatpickrTimeEndRef.current = null;
      }
    }
  }, [isOpen, schedule]);

  // Initialize flatpickr for date picker
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal is closed
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
      return;
    }

    // Wait a bit for formData to be set from schedule
    const timer = setTimeout(() => {
      // Initialize flatpickr when modal is open
      const initializeFlatpickr = () => {
        if (!datePickerRef.current) {
          setTimeout(initializeFlatpickr, 100);
          return;
        }

        if (flatpickrInstanceRef.current) {
          // Already initialized, just update the value
          if (formData.date) {
            try {
              const [year, month, day] = formData.date.split('-');
              const displayDate = `${day}/${month}/${year}`;
              flatpickrInstanceRef.current.setDate(displayDate, false);
              if (datePickerRef.current) {
                datePickerRef.current.value = displayDate;
              }
            } catch (error) {
              console.error('Error updating date:', error);
            }
          }
          return;
        }

        // Check if already has flatpickr instance
        if ((datePickerRef.current as any)._flatpickr) {
          flatpickrInstanceRef.current = (datePickerRef.current as any)._flatpickr;
          // Set value if formData.date exists
          if (formData.date) {
            try {
              const [year, month, day] = formData.date.split('-');
              const displayDate = `${day}/${month}/${year}`;
              flatpickrInstanceRef.current.setDate(displayDate, false);
              if (datePickerRef.current) {
                datePickerRef.current.value = displayDate;
              }
            } catch (error) {
              console.error('Error setting date:', error);
            }
          }
          return;
        }

        // Calculate minimum date (today)
        const minDate = new Date();
        minDate.setHours(0, 0, 0, 0); // Reset time to start of day

        const fp = flatpickr(datePickerRef.current, {
          dateFormat: 'd/m/Y', // Vietnamese format: DD/MM/YYYY
          altFormat: 'd/m/Y', // Display format
          altInput: false,
          minDate: minDate,
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
              longhand: [
                'Chủ nhật',
                'Thứ hai',
                'Thứ ba',
                'Thứ tư',
                'Thứ năm',
                'Thứ sáu',
                'Thứ bảy',
              ],
            },
            months: {
              shorthand: [
                'T1',
                'T2',
                'T3',
                'T4',
                'T5',
                'T6',
                'T7',
                'T8',
                'T9',
                'T10',
                'T11',
                'T12',
              ],
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
          onChange: selectedDates => {
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
        console.log('[DATE] ScheduleFormModal - Datepicker initialized, formData.date:', formData.date);

        // Set initial value if formData.date exists - use setTimeout to ensure it's set after initialization
        setTimeout(() => {
          if (formData.date && flatpickrInstanceRef.current && datePickerRef.current) {
            try {
              // Convert YYYY-MM-DD to DD/MM/YYYY for display
              const [year, month, day] = formData.date.split('-');
              const displayDate = `${day}/${month}/${year}`;
              console.log('[DATE] ScheduleFormModal - Setting datepicker value:', displayDate);
              flatpickrInstanceRef.current.setDate(displayDate, false);
              if (datePickerRef.current) {
                datePickerRef.current.value = displayDate;
                console.log(
                  '[DATE] ScheduleFormModal - Datepicker input value set to:',
                  datePickerRef.current.value
                );
              }
            } catch (error) {
              console.error('Error setting initial date:', error);
            }
          } else {
            console.log('[DATE] ScheduleFormModal - Cannot set datepicker value:', {
              hasDate: !!formData.date,
              hasInstance: !!flatpickrInstanceRef.current,
              hasRef: !!datePickerRef.current,
            });
          }
        }, 50);
      };

      initializeFlatpickr();
    }, 200); // Wait 200ms for formData to be set

    return () => {
      clearTimeout(timer);
      if (flatpickrInstanceRef.current) {
        flatpickrInstanceRef.current.destroy();
        flatpickrInstanceRef.current = null;
      }
    };
  }, [isOpen, formData.date]);

  // Sync datepicker value when formData.date changes (after initialization)
  useEffect(() => {
    if (!isOpen || !formData.date) {
      console.log('[DATE] ScheduleFormModal - Sync date skipped:', {
        isOpen,
        hasDate: !!formData.date,
      });
      return;
    }

    console.log('[DATE] ScheduleFormModal - Syncing datepicker, formData.date:', formData.date);
    // Wait a bit to ensure flatpickr is initialized
    const timer = setTimeout(() => {
      if (flatpickrInstanceRef.current && datePickerRef.current) {
        try {
          const [year, month, day] = formData.date.split('-');
          const displayDate = `${day}/${month}/${year}`;
          console.log('[DATE] ScheduleFormModal - Syncing datepicker to:', displayDate);
          flatpickrInstanceRef.current.setDate(displayDate, false);
          if (datePickerRef.current) {
            datePickerRef.current.value = displayDate;
            console.log(
              '[DATE] ScheduleFormModal - Datepicker synced, input value:',
              datePickerRef.current.value
            );
          }
        } catch (error) {
          console.error('Error syncing date:', error);
        }
      } else {
        console.log('[DATE] ScheduleFormModal - Cannot sync datepicker:', {
          hasInstance: !!flatpickrInstanceRef.current,
          hasRef: !!datePickerRef.current,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, formData.date]);

  // Initialize time pickers with flatpickr
  useEffect(() => {
    if (!isOpen) {
      // Clean up when modal is closed
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

    // Wait a bit for formData to be set from schedule
    const timer = setTimeout(() => {
      // Initialize time pickers when modal is open
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
            dateFormat: 'H:i',
            time_24hr: true,
            allowInput: false,
            clickOpens: true,
            appendTo: document.body,
          };

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
                if (timePickerStartRef.current) {
                  timePickerStartRef.current.value = timeValue;
                }
              } else if (dateStr) {
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
          console.log(
            '[DATE] ScheduleFormModal - Start timepicker initialized, formData.start_time:',
            formData.start_time
          );

          // Set initial value if formData.start_time exists - use setTimeout to ensure it's set after initialization
          setTimeout(() => {
            if (
              formData.start_time &&
              flatpickrTimeStartRef.current &&
              timePickerStartRef.current
            ) {
              try {
                console.log(
                  '[DATE] ScheduleFormModal - Setting start timepicker value:',
                  formData.start_time
                );
                timePickerStartRef.current.value = formData.start_time;
                const [hour, min] = formData.start_time.split(':');
                const date = new Date();
                date.setHours(parseInt(hour) || 9, parseInt(min) || 0, 0, 0);
                flatpickrTimeStartRef.current.setDate(date, false);
                console.log(
                  '[DATE] ScheduleFormModal - Start timepicker input value set to:',
                  timePickerStartRef.current.value
                );
              } catch (error) {
                console.error('Error setting initial start time:', error);
              }
            } else {
              console.log('[DATE] ScheduleFormModal - Cannot set start timepicker value:', {
                hasTime: !!formData.start_time,
                hasInstance: !!flatpickrTimeStartRef.current,
                hasRef: !!timePickerStartRef.current,
              });
            }
          }, 50);
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
            dateFormat: 'H:i',
            time_24hr: true,
            allowInput: false,
            clickOpens: true,
            appendTo: document.body,
          };

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
                if (timePickerEndRef.current) {
                  timePickerEndRef.current.value = timeValue;
                }
              } else if (dateStr) {
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
          console.log(
            '[DATE] ScheduleFormModal - End timepicker initialized, formData.end_time:',
            formData.end_time
          );

          // Set initial value if formData.end_time exists - use setTimeout to ensure it's set after initialization
          setTimeout(() => {
            if (formData.end_time && flatpickrTimeEndRef.current && timePickerEndRef.current) {
              try {
                console.log(
                  '[DATE] ScheduleFormModal - Setting end timepicker value:',
                  formData.end_time
                );
                timePickerEndRef.current.value = formData.end_time;
                const [hour, min] = formData.end_time.split(':');
                const date = new Date();
                date.setHours(parseInt(hour) || 10, parseInt(min) || 0, 0, 0);
                flatpickrTimeEndRef.current.setDate(date, false);
                console.log(
                  '[DATE] ScheduleFormModal - End timepicker input value set to:',
                  timePickerEndRef.current.value
                );
              } catch (error) {
                console.error('Error setting initial end time:', error);
              }
            } else {
              console.log('[DATE] ScheduleFormModal - Cannot set end timepicker value:', {
                hasTime: !!formData.end_time,
                hasInstance: !!flatpickrTimeEndRef.current,
                hasRef: !!timePickerEndRef.current,
              });
            }
          }, 50);
        }
      };

      initializeTimePickers();
    }, 250); // Wait 250ms for formData to be set

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
  }, [isOpen, formData.start_time, formData.end_time]);

  // Update time picker display values when formData changes (after initialization)
  useEffect(() => {
    if (!isOpen || !formData.start_time) {
      console.log('[DATE] ScheduleFormModal - Sync start time skipped:', {
        isOpen,
        hasTime: !!formData.start_time,
      });
      return;
    }

    console.log(
      '[DATE] ScheduleFormModal - Syncing start timepicker, formData.start_time:',
      formData.start_time
    );
    // Wait a bit to ensure flatpickr is initialized
    const timer = setTimeout(() => {
      if (flatpickrTimeStartRef.current && timePickerStartRef.current) {
        try {
          timePickerStartRef.current.value = formData.start_time;
          const [hour, min] = formData.start_time.split(':');
          const date = new Date();
          date.setHours(parseInt(hour) || 9, parseInt(min) || 0, 0, 0);
          flatpickrTimeStartRef.current.setDate(date, false);
          console.log(
            '[DATE] ScheduleFormModal - Start timepicker synced, input value:',
            timePickerStartRef.current.value
          );
        } catch (error) {
          console.error('Error updating start time display:', error);
        }
      } else {
        console.log('[DATE] ScheduleFormModal - Cannot sync start timepicker:', {
          hasInstance: !!flatpickrTimeStartRef.current,
          hasRef: !!timePickerStartRef.current,
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, formData.start_time]);

  useEffect(() => {
    if (!isOpen || !formData.end_time) {
      console.log('[DATE] ScheduleFormModal - Sync end time skipped:', {
        isOpen,
        hasTime: !!formData.end_time,
      });
      return;
    }

    console.log(
      '[DATE] ScheduleFormModal - Syncing end timepicker, formData.end_time:',
      formData.end_time
    );
    // Wait a bit to ensure flatpickr is initialized
    const timer = setTimeout(() => {
      if (flatpickrTimeEndRef.current && timePickerEndRef.current) {
        try {
          timePickerEndRef.current.value = formData.end_time;
          const [hour, min] = formData.end_time.split(':');
          const date = new Date();
          date.setHours(parseInt(hour) || 10, parseInt(min) || 0, 0, 0);
          flatpickrTimeEndRef.current.setDate(date, false);
          console.log(
            '[DATE] ScheduleFormModal - End timepicker synced, input value:',
            timePickerEndRef.current.value
          );
        } catch (error) {
          console.error('Error updating end time display:', error);
        }
      } else {
        console.log('[DATE] ScheduleFormModal - Cannot sync end timepicker:', {
          hasInstance: !!flatpickrTimeEndRef.current,
          hasRef: !!timePickerEndRef.current,
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, formData.end_time]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [classesRes, roomsRes, trainersRes] = await Promise.all([
        scheduleService.getAllClasses(),
        scheduleService.getAllRooms(),
        trainerService.getAllTrainers(),
      ]);

      console.log('[DATE] ScheduleFormModal - Loading initial data...');
      console.log('[DATE] ScheduleFormModal - classesRes:', classesRes);
      console.log('[DATE] ScheduleFormModal - roomsRes:', roomsRes);
      console.log('[DATE] ScheduleFormModal - trainersRes:', trainersRes);

      if (classesRes.success) {
        // Handle nested structure: data.classes or direct array
        let classesData: any[] = [];
        if (Array.isArray(classesRes.data)) {
          classesData = classesRes.data;
        } else if (classesRes.data && typeof classesRes.data === 'object') {
          // Check for nested structure: data.classes
          if (Array.isArray((classesRes.data as any).classes)) {
            classesData = (classesRes.data as any).classes;
          } else if (Array.isArray((classesRes.data as any).data?.classes)) {
            classesData = (classesRes.data as any).data.classes;
          }
        }
        console.log('[DATE] ScheduleFormModal - Setting classes:', classesData.length);
        console.log('[DATE] ScheduleFormModal - classesData:', classesData);
        setClasses(classesData);
      }
      if (roomsRes.success) {
        // Handle nested structure: data.rooms or direct array
        let roomsData: any[] = [];
        if (Array.isArray(roomsRes.data)) {
          roomsData = roomsRes.data;
        } else if (roomsRes.data && typeof roomsRes.data === 'object') {
          // Check for nested structure: data.rooms
          if (Array.isArray((roomsRes.data as any).rooms)) {
            roomsData = (roomsRes.data as any).rooms;
          } else if (Array.isArray((roomsRes.data as any).data?.rooms)) {
            roomsData = (roomsRes.data as any).data.rooms;
          }
        }
        console.log('[DATE] ScheduleFormModal - Setting rooms:', roomsData.length);
        console.log('[DATE] ScheduleFormModal - roomsData:', roomsData);
        setRooms(roomsData);
      }
      if (trainersRes.success) {
        // Handle nested structure: data.trainers or direct array
        let trainersData: any[] = [];
        if (Array.isArray(trainersRes.data)) {
          trainersData = trainersRes.data;
        } else if (trainersRes.data && typeof trainersRes.data === 'object') {
          // Check for nested structure: data.trainers
          if (Array.isArray((trainersRes.data as any).trainers)) {
            trainersData = (trainersRes.data as any).trainers;
          } else if (Array.isArray((trainersRes.data as any).data?.trainers)) {
            trainersData = (trainersRes.data as any).data.trainers;
          }
        }
        console.log('[DATE] ScheduleFormModal - Setting trainers:', trainersData.length);
        console.log('[DATE] ScheduleFormModal - trainersData:', trainersData);
        setTrainers(trainersData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.class_id) {
      newErrors.class_id = 'Lớp học là bắt buộc';
    }

    if (!formData.room_id) {
      newErrors.room_id = 'Phòng là bắt buộc';
    }

    if (!formData.date) {
      newErrors.date = 'Ngày là bắt buộc';
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Giờ bắt đầu là bắt buộc';
    }

    if (!formData.end_time) {
      newErrors.end_time = 'Giờ kết thúc là bắt buộc';
    }

    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      if (start >= end) {
        newErrors.end_time = 'Giờ kết thúc phải sau giờ bắt đầu';
      }
    }

    if (!formData.max_capacity || formData.max_capacity < 1) {
      newErrors.max_capacity = 'Sức chứa phải ít nhất 1 người';
    }

    if (formData.price_override !== undefined && formData.price_override < 0) {
      newErrors.price_override = 'Giá không được âm';
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
      const submitData: any = {
        class_id: formData.class_id,
        room_id: formData.room_id,
        date: formData.date,
        start_time:
          formData.date && formData.start_time
            ? `${formData.date}T${formData.start_time}:00`
            : undefined,
        end_time:
          formData.date && formData.end_time
            ? `${formData.date}T${formData.end_time}:00`
            : undefined,
        max_capacity: formData.max_capacity,
        special_notes: formData.special_notes || null,
        status: formData.status,
      };

      if (formData.trainer_id) {
        submitData.trainer_id = formData.trainer_id;
      } else {
        submitData.trainer_id = null;
      }

      if (formData.price_override !== undefined) {
        submitData.price_override = formData.price_override;
      }

      await onSave(submitData);
      onClose();
    } catch (error: any) {
      // Extract error message from API response
      let errorMessage = 'Có lỗi xảy ra khi lưu lịch tập';
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

  const handleInputChange = (field: keyof ScheduleFormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear submit error when user starts editing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  // Prepare options for CustomSelect
  const classOptions = useMemo(() => {
    const options = classes.map(cls => ({
      value: cls.id,
      label: `${cls.name} (${cls.category})`,
    }));
    console.log('[DATE] ScheduleFormModal - classOptions:', options);
    console.log('[DATE] ScheduleFormModal - formData.class_id:', formData.class_id);
    console.log(
      '[DATE] ScheduleFormModal - class_id in options:',
      options.some(opt => opt.value === formData.class_id)
    );
    return options;
  }, [classes, formData.class_id]);

  const roomOptions = useMemo(() => {
    const options = rooms.map(room => ({
      value: room.id,
      label: `${room.name} (Sức chứa: ${room.capacity})`,
    }));
    console.log('[DATE] ScheduleFormModal - roomOptions:', options);
    console.log('[DATE] ScheduleFormModal - formData.room_id:', formData.room_id);
    console.log(
      '[DATE] ScheduleFormModal - room_id in options:',
      options.some(opt => opt.value === formData.room_id)
    );
    return options;
  }, [rooms, formData.room_id]);

  const trainerOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Không có huấn luyện viên' },
      ...trainers.map(trainer => ({
        value: trainer.id,
        label: trainer.full_name,
      })),
    ];
    console.log('[DATE] ScheduleFormModal - trainerOptions:', options);
    console.log('[DATE] ScheduleFormModal - formData.trainer_id:', formData.trainer_id);
    console.log(
      '[DATE] ScheduleFormModal - trainer_id in options:',
      options.some(opt => opt.value === formData.trainer_id)
    );
    return options;
  }, [trainers, formData.trainer_id]);

  const statusOptions = useMemo(() => SCHEDULE_STATUSES, []);

  // Set formData from schedule after options are loaded
  useEffect(() => {
    if (isOpen && schedule && classes.length > 0 && rooms.length > 0) {
      console.log('[DATE] ScheduleFormModal - Setting formData from schedule after options loaded');
      console.log('[DATE] ScheduleFormModal - Schedule data:', schedule);
      console.log('[DATE] ScheduleFormModal - schedule.date:', schedule.date, typeof schedule.date);
      console.log(
        '[DATE] ScheduleFormModal - schedule.start_time:',
        schedule.start_time,
        typeof schedule.start_time
      );
      console.log(
        '[DATE] ScheduleFormModal - schedule.end_time:',
        schedule.end_time,
        typeof schedule.end_time
      );

      // Convert date to Vietnam timezone for display
      const dateValue = schedule.date ? formatDateVN(schedule.date) : '';
      console.log('[DATE] ScheduleFormModal - dateValue (VN):', dateValue);

      // Convert time to Vietnam timezone
      let startTime = '';
      let endTime = '';
      if (schedule.start_time) {
        console.log('[DATE] ScheduleFormModal - Formatting start_time:', schedule.start_time);
        startTime = formatTimeVN(schedule.start_time);
        console.log('[DATE] ScheduleFormModal - startTime (VN):', startTime);
      }
      if (schedule.end_time) {
        console.log('[DATE] ScheduleFormModal - Formatting end_time:', schedule.end_time);
        endTime = formatTimeVN(schedule.end_time);
        console.log('[DATE] ScheduleFormModal - endTime (VN):', endTime);
      }

      const newFormData = {
        class_id: schedule.gym_class?.id || '',
        trainer_id: (schedule as any).trainer_id || '',
        room_id: schedule.room?.id || '',
        date: dateValue,
        start_time: startTime,
        end_time: endTime,
        max_capacity: schedule.max_capacity || 20,
        price_override: (schedule as any).price_override || undefined,
        special_notes: schedule.special_notes || '',
        status: schedule.status || 'SCHEDULED',
      };
      console.log('[DATE] ScheduleFormModal - Setting formData:', newFormData);
      console.log('[DATE] ScheduleFormModal - schedule.gym_class?.id:', schedule.gym_class?.id);
      console.log('[DATE] ScheduleFormModal - schedule.room?.id:', schedule.room?.id);
      console.log('[DATE] ScheduleFormModal - schedule.trainer_id:', (schedule as any).trainer_id);
      console.log('[DATE] ScheduleFormModal - Current classes length:', classes.length);
      console.log('[DATE] ScheduleFormModal - Current rooms length:', rooms.length);
      console.log('[DATE] ScheduleFormModal - Current trainers length:', trainers.length);
      setFormData(newFormData);
    }
  }, [isOpen, schedule, classes.length, rooms.length, trainers.length]);

  return (
    <>
      {/* Custom styles for compact datepicker and timepicker with orange theme */}
      <style>{`
        /* Compact datepicker for modal */
        .flatpickr-calendar {
          font-size: 12px !important;
          width: auto !important;
          padding: 8px !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
          border: 1px solid #e5e7eb !important;
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
          color: #374151 !important;
        }
        .flatpickr-current-month input.cur-year {
          font-size: 13px !important;
          padding: 2px 4px !important;
          color: #374151 !important;
        }
        .flatpickr-weekdays {
          margin-top: 4px !important;
          margin-bottom: 2px !important;
        }
        .flatpickr-weekday {
          font-size: 11px !important;
          font-weight: 600 !important;
          padding: 4px 0 !important;
          color: #6b7280 !important;
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
          color: #374151 !important;
          transition: all 0.2s !important;
        }
        .flatpickr-day:hover {
          background: #fef3c7 !important;
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          background: #f97316 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
        }
        .flatpickr-day.selected:hover,
        .flatpickr-day.startRange:hover,
        .flatpickr-day.endRange:hover {
          background: #ea580c !important;
          border-color: #ea580c !important;
        }
        .flatpickr-day.today {
          border-color: #f97316 !important;
          color: #f97316 !important;
          font-weight: 600 !important;
        }
        .flatpickr-day.today:hover {
          background: #fef3c7 !important;
        }
        .flatpickr-day.flatpickr-disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #d1d5db !important;
        }
        .flatpickr-day.flatpickr-disabled:hover {
          background: transparent !important;
          border-color: transparent !important;
        }
        .flatpickr-prev-month,
        .flatpickr-next-month {
          display: none !important;
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
          display: none !important;
        }
        
        /* Dark mode support */
        .dark .flatpickr-calendar {
          background: #1f2937 !important;
          border-color: #374151 !important;
        }
        .dark .flatpickr-current-month .flatpickr-monthDropdown-months,
        .dark .flatpickr-current-month input.cur-year {
          color: #f3f4f6 !important;
        }
        .dark .flatpickr-weekday {
          color: #9ca3af !important;
        }
        .dark .flatpickr-day {
          color: #f3f4f6 !important;
        }
        .dark .flatpickr-day:hover {
          background: #7c2d12 !important;
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .dark .flatpickr-day.selected,
        .dark .flatpickr-day.startRange,
        .dark .flatpickr-day.endRange {
          background: #f97316 !important;
          border-color: #f97316 !important;
          color: #ffffff !important;
        }
        .dark .flatpickr-day.today {
          border-color: #f97316 !important;
          color: #f97316 !important;
        }
        .dark .flatpickr-day.flatpickr-disabled,
        .dark .flatpickr-day.prevMonthDay,
        .dark .flatpickr-day.nextMonthDay {
          color: #4b5563 !important;
        }
      `}</style>
      <AdminModal
        isOpen={isOpen}
        onClose={onClose}
        title={schedule ? 'Chỉnh sửa Lịch tập' : 'Tạo Lịch tập Mới'}
        size='lg'
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
                  <ButtonSpinner />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4' />
                  {schedule ? 'Cập nhật' : 'Tạo mới'}
                </>
              )}
            </button>
          </div>
        }
      >
        {isLoadingData ? (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400 font-inter'>
            Đang tải dữ liệu...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                  Lớp học *
                </label>
                <CustomSelect
                  options={classOptions}
                  value={formData.class_id || ''}
                  onChange={value => handleInputChange('class_id', value)}
                  placeholder='Chọn lớp học'
                  className={errors.class_id ? 'border-red-500 dark:border-red-500' : ''}
                />
                {errors.class_id && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.class_id}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                  Phòng *
                </label>
                <CustomSelect
                  options={roomOptions}
                  value={formData.room_id || ''}
                  onChange={value => handleInputChange('room_id', value)}
                  placeholder='Chọn phòng'
                  className={errors.room_id ? 'border-red-500 dark:border-red-500' : ''}
                />
                {errors.room_id && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.room_id}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Huấn luyện viên
              </label>
              <CustomSelect
                options={trainerOptions}
                value={formData.trainer_id || ''}
                onChange={value => handleInputChange('trainer_id', value || undefined)}
                placeholder='Chọn huấn luyện viên'
              />
            </div>

            <div className='grid grid-cols-3 gap-3'>
              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  Ngày *
                </label>
                <div className='relative'>
                  <input
                    ref={datePickerRef}
                    id='schedule-date'
                    type='text'
                    placeholder='dd/mm/yyyy'
                    readOnly
                    className={`w-full px-4 py-2.5 pr-10 text-theme-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 cursor-pointer bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.date
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
                  />
                  <Calendar
                    size={14}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none'
                  />
                </div>
                {errors.date && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.date}
                  </p>
                )}
              </div>

              <div>
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <Clock className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  Bắt đầu *
                </label>
                <div className='relative'>
                  <input
                    ref={timePickerStartRef}
                    id='time-start'
                    type='text'
                    placeholder='hh:mm'
                    readOnly
                    className={`w-full px-4 py-2.5 pr-10 text-theme-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 cursor-pointer bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.start_time
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
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
                <label className='text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2 flex items-center gap-2'>
                  <Clock className='w-4 h-4 text-orange-600 dark:text-orange-400' />
                  Kết thúc *
                </label>
                <div className='relative'>
                  <input
                    ref={timePickerEndRef}
                    id='time-end'
                    type='text'
                    placeholder='hh:mm'
                    readOnly
                    className={`w-full px-4 py-2.5 pr-10 text-theme-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 cursor-pointer bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                      errors.end_time
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }`}
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

            <div className='grid grid-cols-3 gap-3'>
              <div>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                  Sức chứa *
                </label>
                <input
                  type='number'
                  min='1'
                  value={formData.max_capacity?.toString() || '20'}
                  onChange={e => handleInputChange('max_capacity', parseInt(e.target.value) || 20)}
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
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
                  Giá (VNĐ)
                </label>
                <input
                  type='number'
                  min='0'
                  value={formData.price_override?.toString() || ''}
                  onChange={e =>
                    handleInputChange(
                      'price_override',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  placeholder='Để trống để dùng giá mặc định'
                  className={`w-full px-4 py-2.5 text-theme-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 font-inter shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600 ${
                    errors.price_override
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                />
                {errors.price_override && (
                  <p className='mt-1.5 text-[11px] text-red-600 dark:text-red-400 font-inter'>
                    {errors.price_override}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                  Trạng thái
                </label>
                <CustomSelect
                  options={statusOptions}
                  value={formData.status || 'SCHEDULED'}
                  onChange={value => handleInputChange('status', value)}
                  placeholder='Chọn trạng thái'
                />
              </div>
            </div>

            <div>
              <label className='block text-theme-xs font-semibold font-heading text-gray-900 dark:text-white mb-2'>
                Ghi chú đặc biệt
              </label>
              <textarea
                value={formData.special_notes || ''}
                onChange={e => handleInputChange('special_notes', e.target.value)}
                rows={3}
                placeholder='Nhập ghi chú đặc biệt (tùy chọn)'
                className='w-full px-4 py-2.5 text-theme-xs border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 dark:focus:border-orange-500 transition-all duration-200 font-inter resize-none shadow-sm hover:shadow-md hover:border-orange-400 dark:hover:border-orange-600'
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className='flex items-start p-3 border rounded-xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'>
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
              </div>
            )}
          </form>
        )}
      </AdminModal>
    </>
  );
};

export default ScheduleFormModal;
