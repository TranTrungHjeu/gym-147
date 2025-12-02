import type { AxiosResponse } from 'axios';
import { getCurrentUser } from '../utils/auth';
import { scheduleApi } from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Calendar interfaces
export interface CalendarEvent {
  id: string;
  title: string;
  class_name: string;
  start: string;
  end: string;
  room: string;
  status: string;
  attendees: number;
  max_capacity: number;
  color: string;
}

// Rating interfaces
export interface Rating {
  id: string;
  class_name: string;
  member_name: string;
  rating: number;
  comment: string;
  trainer_reply?: string | null;
  created_at: string;
  is_public: boolean;
}

export interface RatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: { [key: number]: number };
  recent_ratings: Rating[];
}

// Feedback interfaces
export interface Feedback {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  feedback_type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  response?: string;
  trainer_reply?: string | null;
  responded_at?: string;
}

// Stats interfaces
export interface TrainerStats {
  total_classes: number;
  total_students: number;
  total_hours: number;
  average_rating: number;
  attendance_rate: number;
  monthly_stats: {
    month: string;
    classes: number;
    students: number;
    hours: number;
    rating: number;
  }[];
  class_type_stats: {
    class_type: string;
    count: number;
    students: number;
    rating: number;
  }[];
  recent_performance: {
    date: string;
    class_name: string;
    students: number;
    rating: number;
    attendance_rate: number;
  }[];
}

// Performance interfaces
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue';
  progress_percentage: number;
}

export interface PerformanceReview {
  id: string;
  period: string;
  overall_rating: number;
  strengths: string[];
  areas_for_improvement: string[];
  goals_achieved: number;
  total_goals: number;
  feedback: string;
  reviewer: string;
  review_date: string;
}

// Gym Class interfaces
export interface GymClass {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  max_capacity: number;
  difficulty: string;
  price: number;
  thumbnail?: string;
  is_active: boolean;
  rating_average?: number;
}

// Schedule interfaces
export interface Schedule {
  id: string;
  class_name: string;
  room_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  current_bookings: number;
  max_capacity: number;
  price: number;
  special_notes?: string;
}

// Schedule Item interfaces
export interface ScheduleItem {
  id: string;
  class_name: string;
  room_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  current_bookings: number;
  max_capacity: number;
  price: number;
  special_notes?: string;
  // Check-in/Check-out fields
  check_in_enabled?: boolean;
  check_in_opened_at?: string;
  check_in_opened_by?: string;
  auto_checkout_completed?: boolean;
  auto_checkout_at?: string;
  gym_class?: {
    id: string;
    name: string;
    description: string;
    category: string;
    duration: number;
    max_capacity: number;
    difficulty: string;
    equipment_needed: string[];
    price: string;
    thumbnail: string;
    required_certification_level: string;
    is_active: boolean;
  };
  room?: {
    id: string;
    name: string;
    capacity: number;
    area_sqm: number;
    equipment: string[];
    amenities: string[];
    status: string;
  };
  attendance?: AttendanceRecord[];
  bookings?: {
    id: string;
    schedule_id: string;
    member_id: string;
    status: string;
    booked_at: string;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    payment_status: string;
    amount_paid: string;
    special_needs: string | null;
    is_waitlist: boolean;
    waitlist_position: number | null;
    notes: string;
    created_at: string;
    updated_at: string;
    member: {
      id: string;
      user_id: string;
      full_name: string;
      email: string;
      phone: string;
      profile_photo: string | null;
      membership_status: string;
    } | null;
  }[];
}

// Attendance interfaces
export interface AttendanceRecord {
  id: string;
  schedule_id: string;
  member_id: string;
  checked_in_at?: string;
  checked_out_at?: string;
  attendance_method: string;
  class_rating?: number;
  trainer_rating?: number;
  feedback_notes?: string;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    profile_photo: string | null;
    membership_status: string;
  } | null;
}

// Booking interfaces
export interface BookingRecord {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  schedule_time: string;
  booked_at: string;
  status: string;
  payment_status: string;
  amount_paid?: number;
  special_needs?: string;
  is_waitlist: boolean;
  waitlist_position?: number;
  notes?: string;
}

// Review interfaces
export interface Review {
  id: string;
  member_name: string;
  member_email: string;
  class_name: string;
  schedule_date: string;
  rating: number;
  comment: string;
  created_at: string;
  is_public: boolean;
}

class ScheduleService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      // Fix incorrect endpoint: if GET request to /trainers/user/.../schedules, change to /schedule
      if (
        method === 'GET' &&
        endpoint.includes('/trainers/user/') &&
        endpoint.includes('/schedules') &&
        !endpoint.includes('/schedules/')
      ) {
        endpoint = endpoint.replace('/schedules', '/schedule');
        console.warn(
          '[WARNING] Fixed incorrect endpoint: changed /schedules to /schedule for GET request'
        );
      }

      let response: AxiosResponse<ApiResponse<T>>;

      switch (method) {
        case 'POST':
          response = await scheduleApi.post<ApiResponse<T>>(endpoint, data);
          break;
        case 'PUT':
          response = await scheduleApi.put<ApiResponse<T>>(endpoint, data);
          break;
        case 'DELETE':
          response = await scheduleApi.delete<ApiResponse<T>>(endpoint);
          break;
        default:
          response = await scheduleApi.get<ApiResponse<T>>(endpoint);
      }

      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data || { message: error.message || 'Unknown error' };

      // Create error with detailed error information
      let errorMessage = errorData?.message || `HTTP error! status: ${error.response?.status}`;

      // Include detailed error information if available
      if (errorData?.data?.errors && Array.isArray(errorData.data.errors)) {
        errorMessage += `\nChi tiết: ${errorData.data.errors.join(', ')}`;
      } else if (errorData?.data?.errors && typeof errorData.data.errors === 'string') {
        errorMessage += `\nChi tiết: ${errorData.data.errors}`;
      }

      const apiError: any = new Error(errorMessage);
      apiError.status = error.response?.status;
      apiError.response = { data: errorData };
      apiError.message = errorMessage;
      throw apiError;
    }
  }

  // Calendar APIs
  async getTrainerCalendar(
    currentDate: Date,
    viewMode: string,
    filters?: {
      status?: string;
      classType?: string;
      room?: string;
    }
  ): Promise<ApiResponse<CalendarEvent[]>> {
    // Get current trainer user_id from localStorage
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found. Please login again.');
    }
    const userData = JSON.parse(user);
    const userId = userData.id;

    if (!userId) {
      throw new Error('User ID not found. Please login again.');
    }

    // Calculate date range based on view mode
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      // First day of month
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Last day of month
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      // Start of week (Monday)
      // getDay() returns: 0=Sunday, 1=Monday, ..., 6=Saturday
      const dayOfWeek = currentDate.getDay();
      startDate = new Date(currentDate);
      // If Sunday (0), go back 6 days to previous Monday
      // Otherwise, go back (dayOfWeek - 1) days to current week's Monday
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(currentDate.getDate() - daysToSubtract);
      // End of week (Sunday, 6 days after Monday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Single day
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
    }

    const params = new URLSearchParams({
      date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      viewMode: viewMode,
    });

    // Add filter parameters (if backend supports them)
    if (filters?.status) params.append('status', filters.status);

    // Debug logging
    console.log('Schedule Service - Fetching trainer calendar:', {
      userId,
      viewMode,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      params: params.toString(),
    });

    // Use trainer-specific endpoint that automatically filters by trainer_id
    const response = await this.request<{ schedules: any[] }>(
      `/trainers/user/${userId}/schedule?${params}`
    );

    // Transform schedule data to calendar event format
    if (response.success && response.data?.schedules) {
      let calendarEvents: CalendarEvent[] = response.data.schedules.map((schedule: any) => ({
        id: schedule.id,
        title: schedule.gym_class?.name || 'Unknown Class',
        class_name: schedule.gym_class?.name || 'Unknown Class',
        start: schedule.start_time,
        end: schedule.end_time,
        room: schedule.room?.name || 'Unknown Room',
        status: schedule.status || 'SCHEDULED',
        attendees: schedule.bookings?.length || 0,
        max_capacity: schedule.max_capacity || 0,
        color: this.getStatusColor(schedule.status),
      }));

      // Apply client-side filtering if needed
      if (filters?.status) {
        calendarEvents = calendarEvents.filter(event => event.status === filters.status);
      }
      if (filters?.classType) {
        calendarEvents = calendarEvents.filter(event =>
          event.class_name.toLowerCase().includes(filters.classType!.toLowerCase())
        );
      }
      if (filters?.room) {
        calendarEvents = calendarEvents.filter(event =>
          event.room.toLowerCase().includes(filters.room!.toLowerCase())
        );
      }

      // Additional client-side date filtering for precision
      calendarEvents = calendarEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= startDate && eventDate <= endDate;
      });

      console.log('Schedule Service - Transformed calendar events:', calendarEvents.length);

      return {
        success: true,
        data: calendarEvents,
        message: response.message,
      };
    }

    // If response doesn't have schedules array, return empty array
    return {
      success: true,
      data: [],
      message: response.message || 'No schedules found',
    };
  }

  private getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      SCHEDULED: 'bg-blue-500',
      IN_PROGRESS: 'bg-green-500',
      COMPLETED: 'bg-gray-500',
      CANCELLED: 'bg-red-500',
    };
    return statusColors[status] || 'bg-blue-500';
  }

  // Rating APIs - Using utility stats endpoint
  async getTrainerRatingStats(timeFilter: string): Promise<ApiResponse<RatingStats>> {
    const params = new URLSearchParams({
      period: timeFilter,
    });

    const response = await this.request<any>(`/stats?${params}`);

    // Transform stats data to rating stats format
    if (response.success) {
      const ratingStats: RatingStats = {
        average_rating: 4.7, // Default values since stats endpoint might not have rating data
        total_ratings: 0,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recent_ratings: [],
      };

      return {
        success: true,
        data: ratingStats,
        message: response.message,
      };
    }

    return response as ApiResponse<RatingStats>;
  }

  async getTrainerReviews(
    searchTerm?: string,
    ratingFilter?: string
  ): Promise<ApiResponse<Rating[]>> {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (ratingFilter) params.append('rating', ratingFilter);

    const response = await this.request<{ bookings: any[] }>(`/bookings?${params}`);

    // Transform booking data to rating format
    if (response.success && response.data.bookings) {
      const ratings: Rating[] = response.data.bookings
        .filter((booking: any) => booking.rating) // Only bookings with ratings
        .map((booking: any) => ({
          id: booking.id,
          class_name: booking.schedule?.gym_class?.name || 'Unknown Class',
          member_name: booking.member_name || 'Unknown Member',
          rating: booking.rating || 0,
          comment: booking.feedback || '',
          created_at: booking.created_at,
          is_public: true,
        }));

      return {
        success: true,
        data: ratings,
        message: response.message,
      };
    }

    return response as unknown as ApiResponse<Rating[]>;
  }

  // Feedback APIs - Using bookings for now
  async getTrainerFeedbacks(filter: string): Promise<ApiResponse<Feedback[]>> {
    const params = new URLSearchParams({
      status: filter,
    });

    const response = await this.request<{ bookings: any[] }>(`/bookings?${params}`);

    // Transform booking data to feedback format
    if (response.success && response.data.bookings) {
      const feedbacks: Feedback[] = response.data.bookings
        .filter((booking: any) => booking.feedback) // Only bookings with feedback
        .map((booking: any) => ({
          id: booking.id,
          member_name: booking.member_name || 'Unknown Member',
          member_email: booking.member_email || 'unknown@email.com',
          class_name: booking.schedule?.gym_class?.name || 'Unknown Class',
          feedback_type: 'SUGGESTION',
          subject: 'Phản hồi từ học viên',
          message: booking.feedback || '',
          status: booking.status || 'PENDING',
          priority: 'MEDIUM',
          created_at: booking.created_at,
        }));

      return {
        success: true,
        data: feedbacks,
        message: response.message,
      };
    }

    return response as unknown as ApiResponse<Feedback[]>;
  }

  async respondToFeedback(feedbackId: string, response: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/bookings/${feedbackId}`, 'PUT', { response });
  }

  // Stats APIs
  async getTrainerStats(timeFilter: string): Promise<ApiResponse<TrainerStats>> {
    const params = new URLSearchParams({
      period: timeFilter,
    });

    const response = await this.request<any>(`/stats?${params}`);

    // Transform stats data to trainer stats format
    if (response.success) {
      const trainerStats: TrainerStats = {
        total_classes: response.data.total_classes || 0,
        total_students: response.data.total_students || 0,
        total_hours: response.data.total_hours || 0,
        average_rating: response.data.average_rating || 0,
        attendance_rate: response.data.attendance_rate || 0,
        monthly_stats: response.data.monthly_stats || [],
        class_type_stats: response.data.class_type_stats || [],
        recent_performance: response.data.recent_performance || [],
      };

      return {
        success: true,
        data: trainerStats,
        message: response.message,
      };
    }

    return response as ApiResponse<TrainerStats>;
  }

  // Performance APIs - Using stats endpoint
  async getTrainerPerformance(): Promise<
    ApiResponse<{
      metrics: PerformanceMetric[];
      goals: PerformanceGoal[];
      reviews: PerformanceReview[];
    }>
  > {
    const response = await this.request<any>('/stats');

    // Transform stats data to performance format
    if (response.success) {
      const performanceData = {
        metrics: [
          {
            id: '1',
            name: 'Tỷ lệ tham gia lớp học',
            value: response.data.attendance_rate || 0,
            target: response.data.attendance_rate || 0,
            unit: '%',
            trend: 'neutral' as const,
            change_percentage: 0,
          },
          {
            id: '2',
            name: 'Đánh giá trung bình',
            value: response.data.average_rating || 0,
            target: response.data.average_rating || 0,
            unit: '/5',
            trend: 'neutral' as const,
            change_percentage: 0,
          },
        ],
        goals: [],
        reviews: [],
      };

      return {
        success: true,
        data: performanceData,
        message: response.message,
      };
    }

    return response as ApiResponse<{
      metrics: PerformanceMetric[];
      goals: PerformanceGoal[];
      reviews: PerformanceReview[];
    }>;
  }

  async createPerformanceGoal(
    goal: Omit<PerformanceGoal, 'id' | 'progress_percentage'>
  ): Promise<ApiResponse<PerformanceGoal>> {
    return this.request<PerformanceGoal>('/stats', 'POST', goal);
  }

  async updatePerformanceGoal(
    goalId: string,
    goal: Partial<PerformanceGoal>
  ): Promise<ApiResponse<PerformanceGoal>> {
    return this.request<PerformanceGoal>(`/stats/${goalId}`, 'PUT', goal);
  }

  // Class APIs

  // Schedule APIs
  async getTrainerSchedule(startDate?: string, endDate?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return this.request<any[]>(`/schedules?${params}`);
  }

  // Admin Schedule Management APIs
  async getAllSchedules(filters?: {
    date?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
    class_id?: string;
    trainer_id?: string;
    room_id?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<ScheduleItem[] | { schedules: ScheduleItem[]; pagination?: any }>> {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.class_id) params.append('class_id', filters.class_id);
    if (filters?.trainer_id) params.append('trainer_id', filters.trainer_id);
    if (filters?.room_id) params.append('room_id', filters.room_id);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);

    return this.request<ScheduleItem[] | { schedules: ScheduleItem[]; pagination?: any }>(
      `/schedules?${params}`
    );
  }

  async getScheduleById(id: string): Promise<ApiResponse<ScheduleItem>> {
    return this.request<ScheduleItem>(`/schedules/${id}`);
  }

  async createSchedule(data: {
    class_id: string;
    trainer_id?: string | null;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
    max_capacity?: number;
    price_override?: number;
    special_notes?: string;
    status?: string;
  }): Promise<ApiResponse<ScheduleItem>> {
    return this.request<ScheduleItem>('/schedules', 'POST', data);
  }

  async updateSchedule(
    id: string,
    data: Partial<ScheduleItem>
  ): Promise<ApiResponse<ScheduleItem>> {
    return this.request<ScheduleItem>(`/schedules/${id}`, 'PUT', data);
  }

  async deleteSchedule(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/schedules/${id}`, 'DELETE');
  }

  async getScheduleStats(): Promise<ApiResponse<any>> {
    return this.request<any>('/schedules/stats');
  }

  // Attendance APIs
  async getTrainerAttendance(classId?: string, date?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (classId) params.append('class_id', classId);
    if (date) params.append('date', date);

    return this.request<any[]>(`/attendance?${params}`);
  }

  async updateAttendance(
    attendanceId: string,
    status: string,
    notes?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/attendance/${attendanceId}`, 'PUT', { status, notes });
  }

  // Trainer Schedules API
  async getTrainerSchedules(
    trainerId: string,
    startDate?: string,
    endDate?: string,
    viewMode?: string
  ): Promise<ApiResponse<Schedule[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (viewMode) params.append('viewMode', viewMode);

    const response = await this.request<{ schedules: Schedule[] }>(
      `/trainers/user/${trainerId}/schedule?${params}`
    );
    // Backend returns { success: true, data: { schedules: [...] } }
    if (response.success && response.data?.schedules) {
      return {
        ...response,
        data: response.data.schedules,
      };
    }
    // Return empty array if no schedules found
    return {
      success: response.success,
      message: response.message || 'No schedules found',
      data: [],
    };
  }

  // Booking APIs
  async getAllBookings(filters?: {
    status?: string;
    class_id?: string;
    member_id?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<{ bookings: any[] } | any[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.class_id) params.append('class_id', filters.class_id);
    if (filters?.member_id) params.append('member_id', filters.member_id);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.page) params.append('page', filters.page.toString());

    return this.request<{ bookings: any[] } | any[]>(`/bookings?${params}`);
  }

  async getTrainerBookings(status?: string, classId?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (classId) params.append('class_id', classId);

    return this.request<any[]>(`/bookings?${params}`);
  }

  // New Trainer APIs
  async getTrainerClasses(): Promise<ApiResponse<{ classes: GymClass[] }>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);
    return this.request<{ classes: GymClass[] }>(`/trainers/user/${userData.id}/classes`);
  }

  async getTrainerScheduleList(
    date?: string,
    viewMode?: string
  ): Promise<ApiResponse<ScheduleItem[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (viewMode) params.append('viewMode', viewMode);

    const response = await this.request<{ schedules: ScheduleItem[] }>(
      `/trainers/user/${userData.id}/schedule?${params}`
    );
    // Backend returns { success: true, data: { schedules: [...] } }
    if (response.success && response.data?.schedules) {
      return {
        ...response,
        data: response.data.schedules,
      };
    }
    // Return empty array if no schedules found
    return {
      success: response.success,
      message: response.message || 'No schedules found',
      data: [],
    };
  }

  async getTrainerAttendanceRecords(date?: string): Promise<ApiResponse<AttendanceRecord[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const response = await this.request<any>(`/trainers/user/${userData.id}/attendance?${params}`);

    // Handle nested response structure
    if (response.success && response.data) {
      if (response.data.attendanceRecords) {
        return {
          ...response,
          data: response.data.attendanceRecords,
        };
      }
    }

    return response;
  }

  async getTrainerBookingsList(date?: string): Promise<ApiResponse<BookingRecord[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    const params = new URLSearchParams();
    if (date) params.append('date', date);

    return this.request<BookingRecord[]>(`/trainers/user/${userData.id}/bookings?${params}`);
  }

  async getTrainerReviewsList(): Promise<ApiResponse<Review[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    return this.request<Review[]>(`/trainers/user/${userData.id}/reviews-list`);
  }

  async checkInAttendance(attendanceId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/${attendanceId}/checkin`, 'POST');
  }

  async checkOutAttendance(attendanceId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/${attendanceId}/checkout`, 'PUT');
  }

  async getTrainerFeedback(): Promise<ApiResponse<Feedback[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    return this.request<Feedback[]>(`/trainers/user/${userData.id}/feedback`);
  }

  async getTrainerRatings(): Promise<ApiResponse<{ ratings: Rating[]; stats: RatingStats }>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    return this.request<{ ratings: Rating[]; stats: RatingStats }>(
      `/trainers/user/${userData.id}/ratings`
    );
  }

  async updateFeedbackStatus(feedbackId: string, status: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/feedback/${feedbackId}/status`, 'PUT', { status });
  }

  // New methods for trainer schedule creation
  async getTrainerCertifications(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/trainers/user/${userId}/certifications`);
  }

  async getAvailableCategories(userId: string): Promise<ApiResponse<string[]>> {
    return this.request<string[]>(`/trainers/user/${userId}/available-categories`);
  }

  async getAvailableRooms(startTime: string, endTime: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    });
    return this.request<any[]>(`/rooms/available?${params}`);
  }

  async createTrainerSchedule(userId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/trainers/user/${userId}/schedules`, 'POST', data);
  }

  async checkScheduleConflict(
    trainerId: string,
    startTime: string,
    endTime: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      trainer_id: trainerId,
      start_time: startTime,
      end_time: endTime,
    });
    return this.request<any>(`/schedules/check-conflict?${params}`);
  }

  // Member check-in/check-out methods (for mobile app)
  async memberCheckIn(scheduleId: string, memberId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/attendance/check-in`, 'POST', {
      member_id: memberId,
    });
  }

  async memberCheckOut(scheduleId: string, memberId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/attendance/check-out`, 'POST', {
      member_id: memberId,
    });
  }

  // Notification methods
  async getUnreadNotifications(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/notifications/unread/${userId}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${notificationId}/read`, 'PUT');
  }

  async markAllNotificationsAsRead(userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/read-all/${userId}`, 'PUT');
  }

  /**
   * Reset all rate limits (Admin only)
   */
  async resetAllRateLimits(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>('/admin/rate-limits/reset-all', 'POST');
  }

  /**
   * Reset rate limit for a specific user (Admin only)
   */
  async resetUserRateLimit(
    userId: string,
    operation?: string
  ): Promise<ApiResponse<{ reset: boolean }>> {
    return this.request<{ reset: boolean }>(`/admin/rate-limits/reset/${userId}`, 'POST', {
      operation: operation || 'create_schedule',
    });
  }

  /**
   * Reset all rate limits for a specific user (Admin only)
   */
  async resetUserRateLimits(userId: string): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/admin/rate-limits/reset-user/${userId}`, 'POST');
  }

  // Room management
  async getAllRooms(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/rooms');
  }

  async getRoomById(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/rooms/${id}`);
  }

  async createRoom(data: Partial<any>): Promise<ApiResponse<any>> {
    return this.request<any>('/rooms', 'POST', data);
  }

  async updateRoom(id: string, data: Partial<any>): Promise<ApiResponse<any>> {
    return this.request<any>(`/rooms/${id}`, 'PUT', data);
  }

  async deleteRoom(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/rooms/${id}`, 'DELETE');
  }

  // Class management
  async getAllClasses(): Promise<ApiResponse<GymClass[]>> {
    return this.request<GymClass[]>('/classes');
  }

  async getClassById(id: string): Promise<ApiResponse<GymClass>> {
    return this.request<GymClass>(`/classes/${id}`);
  }

  async createClass(data: Partial<GymClass>): Promise<ApiResponse<GymClass>> {
    return this.request<GymClass>('/classes', 'POST', data);
  }

  async updateClass(id: string, data: Partial<GymClass>): Promise<ApiResponse<GymClass>> {
    return this.request<GymClass>(`/classes/${id}`, 'PUT', data);
  }

  async deleteClass(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/classes/${id}`, 'DELETE');
  }

  async getClassAttendanceData(filters?: { from?: string; to?: string }): Promise<
    ApiResponse<{
      classNames: string[];
      attendance: number[][];
      dates?: string[];
    }>
  > {
    const params = new URLSearchParams();
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);

    const response = await this.request<any>(`/analytics/class-attendance?${params}`);

    // Transform response data to chart format
    if (response.success && response.data) {
      return {
        ...response,
        data: {
          classNames: response.data.classNames || response.data.classes || [],
          attendance: response.data.attendance || response.data.data || [],
          dates: response.data.dates || response.data.months || [],
        },
      };
    }

    return response;
  }

  // Attendance Management Methods
  /**
   * Enable check-in for a schedule
   */
  async enableCheckIn(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/enable`, 'POST', {
      trainer_id: trainerId,
    });
  }

  /**
   * Disable check-in for a schedule
   */
  async disableCheckIn(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/disable`, 'POST', {
      trainer_id: trainerId,
    });
  }

  /**
   * Trainer checks in a member
   */
  async trainerCheckInMember(
    scheduleId: string,
    memberId: string,
    trainerId: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/attendance/schedules/${scheduleId}/attendance/${memberId}/check-in`,
      'POST',
      {
        trainer_id: trainerId,
      }
    );
  }

  /**
   * Trainer checks out a member
   */
  async trainerCheckOutMember(
    scheduleId: string,
    memberId: string,
    trainerId: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/attendance/schedules/${scheduleId}/attendance/${memberId}/check-out`,
      'POST',
      {
        trainer_id: trainerId,
      }
    );
  }

  /**
   * Trainer checks out all members
   */
  async trainerCheckOutAll(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/attendance/schedules/${scheduleId}/attendance/checkout-all`,
      'POST',
      {
        trainer_id: trainerId,
      }
    );
  }

  /**
   * Get check-in status for a schedule
   */
  async getCheckInStatus(scheduleId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/status`);
  }

  /**
   * Confirm waitlist booking (promote from waitlist)
   */
  async confirmWaitlistBooking(bookingId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/bookings/${bookingId}/promote`, 'POST');
  }

  /**
   * Get booking by ID
   */
  async getBookingById(bookingId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/bookings/${bookingId}`);
  }

  /**
   * Reply to a review
   */
  async replyToReview(attendanceId: string, replyMessage: string): Promise<ApiResponse<any>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return this.request<any>(`/trainers/user/${user.id}/reviews/${attendanceId}/reply`, 'POST', {
      reply_message: replyMessage,
    });
  }

  /**
   * Report a review
   */
  async reportReview(
    attendanceId: string,
    reason: string,
    additionalNotes?: string
  ): Promise<ApiResponse<any>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return this.request<any>(`/trainers/user/${user.id}/reviews/${attendanceId}/report`, 'POST', {
      reason,
      additional_notes: additionalNotes,
    });
  }

  /**
   * Reply to a feedback
   */
  async replyToFeedback(feedbackId: string, replyMessage: string): Promise<ApiResponse<any>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    // Feedbacks are also stored in Attendance, so we use the same endpoint
    return this.request<any>(`/trainers/user/${user.id}/reviews/${feedbackId}/reply`, 'POST', {
      reply_message: replyMessage,
    });
  }

  /**
   * Get trainer stats for comparison
   */
  async getTrainerStatsForComparison(userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/trainers/user/${userId}/stats`);
  }

  /**
   * Create a new performance goal
   */
  async createGoal(goalData: {
    title: string;
    description: string;
    target_value: number;
    unit: string;
    deadline: string;
  }): Promise<ApiResponse<PerformanceGoal>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return this.request<PerformanceGoal>(`/trainers/user/${user.id}/goals`, 'POST', goalData);
  }

  /**
   * Update a performance goal
   */
  async updateGoal(
    goalId: string,
    goalData: {
      title?: string;
      description?: string;
      target_value?: number;
      unit?: string;
      deadline?: string;
    }
  ): Promise<ApiResponse<PerformanceGoal>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return this.request<PerformanceGoal>(
      `/trainers/user/${user.id}/goals/${goalId}`,
      'PUT',
      goalData
    );
  }

  /**
   * Delete a performance goal
   */
  async deleteGoal(goalId: string): Promise<ApiResponse<void>> {
    const user = getCurrentUser();
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    return this.request<void>(`/trainers/user/${user.id}/goals/${goalId}`, 'DELETE');
  }
}

export const scheduleService = new ScheduleService();
