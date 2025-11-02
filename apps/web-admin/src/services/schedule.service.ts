const API_BASE_URL = 'http://localhost:3003';

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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Create error with response data for better error handling
      let errorMessage = data?.message || `HTTP error! status: ${response.status}`;
      
      // Include detailed error information if available
      if (data?.data?.errors && Array.isArray(data.data.errors)) {
        errorMessage += `\nChi tiết: ${data.data.errors.join(', ')}`;
      } else if (data?.data?.errors && typeof data.data.errors === 'string') {
        errorMessage += `\nChi tiết: ${data.data.errors}`;
      }
      
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.response = { data };
      error.message = errorMessage;
      throw error;
    }

    return data;
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
    // Calculate date range based on view mode
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      // First day of month
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Last day of month
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      // Start of week (Sunday)
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      // End of week (Saturday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Single day
      startDate = new Date(currentDate);
      endDate = new Date(currentDate);
    }

    const params = new URLSearchParams({
      from_date: startDate.toISOString().split('T')[0],
      to_date: endDate.toISOString().split('T')[0],
      view: viewMode,
    });

    // Add filter parameters
    if (filters?.status) params.append('status', filters.status);
    if (filters?.classType) params.append('class_type', filters.classType);
    if (filters?.room) params.append('room', filters.room);

    // Debug logging
    console.log('Schedule Service - Date range:', {
      viewMode,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      params: params.toString(),
    });

    const response = await this.request<{ schedules: any[] }>(`/schedules?${params}`);

    // Transform schedule data to calendar event format
    if (response.success && response.data.schedules) {
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

      return {
        success: true,
        data: calendarEvents,
        message: response.message,
      };
    }

    return response as unknown as ApiResponse<CalendarEvent[]>;
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
    return this.request<void>(`/bookings/${feedbackId}`, {
      method: 'PUT',
      body: JSON.stringify({ response }),
    });
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
            target: 90,
            unit: '%',
            trend: 'up' as const,
            change_percentage: 0,
          },
          {
            id: '2',
            name: 'Đánh giá trung bình',
            value: response.data.average_rating || 0,
            target: 4.5,
            unit: '/5',
            trend: 'up' as const,
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
    return this.request<PerformanceGoal>('/stats', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async updatePerformanceGoal(
    goalId: string,
    goal: Partial<PerformanceGoal>
  ): Promise<ApiResponse<PerformanceGoal>> {
    return this.request<PerformanceGoal>(`/stats/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(goal),
    });
  }

  // Class APIs

  // Schedule APIs
  async getTrainerSchedule(startDate?: string, endDate?: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return this.request<any[]>(`/schedules?${params}`);
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
    return this.request<void>(`/attendance/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Trainer Schedules API
  async getTrainerSchedules(
    trainerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<Schedule[]>> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    return this.request<Schedule[]>(`/trainers/user/${trainerId}/schedules?${params}`);
  }

  // Booking APIs
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

    return this.request<ScheduleItem[]>(`/trainers/user/${userData.id}/schedule?${params}`);
  }

  async getTrainerAttendanceRecords(date?: string): Promise<ApiResponse<AttendanceRecord[]>> {
    const user = localStorage.getItem('user');
    if (!user) {
      throw new Error('User not found');
    }
    const userData = JSON.parse(user);

    const params = new URLSearchParams();
    if (date) params.append('date', date);

    return this.request<AttendanceRecord[]>(`/trainers/user/${userData.id}/attendance?${params}`);
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
    return this.request<any>(`/attendance/${attendanceId}/checkin`, { method: 'POST' });
  }

  async checkOutAttendance(attendanceId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/${attendanceId}/checkout`, { method: 'PUT' });
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
    return this.request<any>(`/feedback/${feedbackId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
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
    return this.request<any>(`/trainers/user/${userId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  // Check-in/Check-out methods
  async enableCheckIn(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/enable`, {
      method: 'POST',
      body: JSON.stringify({ trainer_id: trainerId }),
    });
  }

  async disableCheckIn(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/disable`, {
      method: 'POST',
      body: JSON.stringify({ trainer_id: trainerId }),
    });
  }

  async memberCheckIn(scheduleId: string, memberId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/attendance/check-in`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    });
  }

  async memberCheckOut(scheduleId: string, memberId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/attendance/check-out`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId }),
    });
  }

  async trainerCheckInMember(
    scheduleId: string,
    memberId: string,
    trainerId: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/attendance/schedules/${scheduleId}/attendance/${memberId}/check-in`,
      {
        method: 'POST',
        body: JSON.stringify({ trainer_id: trainerId }),
      }
    );
  }

  async trainerCheckOutMember(
    scheduleId: string,
    memberId: string,
    trainerId: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(
      `/attendance/schedules/${scheduleId}/attendance/${memberId}/check-out`,
      {
        method: 'POST',
        body: JSON.stringify({ trainer_id: trainerId }),
      }
    );
  }

  async trainerCheckOutAll(scheduleId: string, trainerId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/attendance/checkout-all`, {
      method: 'POST',
      body: JSON.stringify({ trainer_id: trainerId }),
    });
  }

  async getCheckInStatus(scheduleId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/attendance/schedules/${scheduleId}/check-in/status`);
  }

  // Notification methods
  async getUnreadNotifications(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/notifications/unread/${userId}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(userId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/notifications/read-all/${userId}`, {
      method: 'PUT',
    });
  }

  /**
   * Reset all rate limits (Admin only)
   */
  async resetAllRateLimits(): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>('/admin/rate-limits/reset-all', {
      method: 'POST',
    });
  }

  /**
   * Reset rate limit for a specific user (Admin only)
   */
  async resetUserRateLimit(userId: string, operation?: string): Promise<ApiResponse<{ reset: boolean }>> {
    return this.request<{ reset: boolean }>(`/admin/rate-limits/reset/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ operation: operation || 'create_schedule' }),
    });
  }

  /**
   * Reset all rate limits for a specific user (Admin only)
   */
  async resetUserRateLimits(userId: string): Promise<ApiResponse<{ count: number }>> {
    return this.request<{ count: number }>(`/admin/rate-limits/reset-user/${userId}`, {
      method: 'POST',
    });
  }
}

export const scheduleService = new ScheduleService();
