export interface GymClass {
  id: string;
  name: string;
  description: string;
  instructorId: string;
  instructorName: string;
  capacity: number;
  duration: number; // in minutes
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  id: string;
  classId: string;
  className: string;
  instructorId: string;
  instructorName: string;
  date: string; // ISO date string
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  capacity: number;
  bookedCount: number;
  availableSlots: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ClassBooking {
  id: string;
  scheduleId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassRequest {
  name: string;
  description: string;
  instructorId: string;
  capacity: number;
  duration: number;
  price: number;
}

export interface UpdateClassRequest {
  name?: string;
  description?: string;
  instructorId?: string;
  capacity?: number;
  duration?: number;
  price?: number;
  isActive?: boolean;
}

export interface CreateScheduleRequest {
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface UpdateScheduleRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface CreateBookingRequest {
  scheduleId: string;
  memberId: string;
}

export interface UpdateBookingRequest {
  status?: 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
}

export interface ScheduleFilters {
  date?: string;
  instructorId?: string;
  classId?: string;
  status?: string;
}

export interface BookingFilters {
  memberId?: string;
  scheduleId?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}
