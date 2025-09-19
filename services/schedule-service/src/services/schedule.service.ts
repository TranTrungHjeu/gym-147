import {
    BookingFilters,
    ClassBooking,
    ClassSchedule,
    CreateBookingRequest,
    CreateClassRequest,
    CreateScheduleRequest,
    GymClass,
    ScheduleFilters,
    UpdateBookingRequest,
    UpdateClassRequest,
    UpdateScheduleRequest
} from '../types/schedule.types.js';

export class ScheduleService {
  private classes: GymClass[] = [
    {
      id: '1',
      name: 'Morning Yoga',
      description: 'Relaxing yoga session to start your day',
      instructorId: 'instructor-1',
      instructorName: 'Sarah Johnson',
      capacity: 20,
      duration: 60,
      price: 25000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'HIIT Training',
      description: 'High-intensity interval training for maximum results',
      instructorId: 'instructor-2',
      instructorName: 'Mike Wilson',
      capacity: 15,
      duration: 45,
      price: 35000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private schedules: ClassSchedule[] = [
    {
      id: '1',
      classId: '1',
      className: 'Morning Yoga',
      instructorId: 'instructor-1',
      instructorName: 'Sarah Johnson',
      date: '2025-09-20',
      startTime: '07:00',
      endTime: '08:00',
      capacity: 20,
      bookedCount: 8,
      availableSlots: 12,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      classId: '2',
      className: 'HIIT Training',
      instructorId: 'instructor-2',
      instructorName: 'Mike Wilson',
      date: '2025-09-20',
      startTime: '18:00',
      endTime: '18:45',
      capacity: 15,
      bookedCount: 12,
      availableSlots: 3,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private bookings: ClassBooking[] = [
    {
      id: '1',
      scheduleId: '1',
      memberId: 'member-1',
      memberName: 'John Doe',
      memberEmail: 'john@example.com',
      bookingDate: '2025-09-19',
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Class management
  async getAllClasses(): Promise<GymClass[]> {
    return this.classes.filter(c => c.isActive);
  }

  async getClassById(id: string): Promise<GymClass | null> {
    return this.classes.find(c => c.id === id && c.isActive) || null;
  }

  async createClass(classData: CreateClassRequest): Promise<GymClass> {
    const newClass: GymClass = {
      id: (this.classes.length + 1).toString(),
      ...classData,
      instructorName: `Instructor ${classData.instructorId}`, // Mock instructor name
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.classes.push(newClass);
    return newClass;
  }

  async updateClass(id: string, updates: UpdateClassRequest): Promise<GymClass | null> {
    const classIndex = this.classes.findIndex(c => c.id === id);
    if (classIndex === -1) return null;

    this.classes[classIndex] = {
      ...this.classes[classIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.classes[classIndex];
  }

  async deleteClass(id: string): Promise<boolean> {
    const classIndex = this.classes.findIndex(c => c.id === id);
    if (classIndex === -1) return false;

    this.classes[classIndex].isActive = false;
    this.classes[classIndex].updatedAt = new Date().toISOString();
    return true;
  }

  // Schedule management
  async getSchedules(filters?: ScheduleFilters): Promise<ClassSchedule[]> {
    let filteredSchedules = [...this.schedules];

    if (filters) {
      if (filters.date) {
        filteredSchedules = filteredSchedules.filter(s => s.date === filters.date);
      }
      if (filters.instructorId) {
        filteredSchedules = filteredSchedules.filter(s => s.instructorId === filters.instructorId);
      }
      if (filters.classId) {
        filteredSchedules = filteredSchedules.filter(s => s.classId === filters.classId);
      }
      if (filters.status) {
        filteredSchedules = filteredSchedules.filter(s => s.status === filters.status);
      }
    }

    return filteredSchedules;
  }

  async getScheduleById(id: string): Promise<ClassSchedule | null> {
    return this.schedules.find(s => s.id === id) || null;
  }

  async createSchedule(scheduleData: CreateScheduleRequest): Promise<ClassSchedule | null> {
    const gymClass = await this.getClassById(scheduleData.classId);
    if (!gymClass) return null;

    const newSchedule: ClassSchedule = {
      id: (this.schedules.length + 1).toString(),
      classId: scheduleData.classId,
      className: gymClass.name,
      instructorId: gymClass.instructorId,
      instructorName: gymClass.instructorName,
      date: scheduleData.date,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      capacity: gymClass.capacity,
      bookedCount: 0,
      availableSlots: gymClass.capacity,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.schedules.push(newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: string, updates: UpdateScheduleRequest): Promise<ClassSchedule | null> {
    const scheduleIndex = this.schedules.findIndex(s => s.id === id);
    if (scheduleIndex === -1) return null;

    this.schedules[scheduleIndex] = {
      ...this.schedules[scheduleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.schedules[scheduleIndex];
  }

  // Booking management
  async getBookings(filters?: BookingFilters): Promise<ClassBooking[]> {
    let filteredBookings = [...this.bookings];

    if (filters) {
      if (filters.memberId) {
        filteredBookings = filteredBookings.filter(b => b.memberId === filters.memberId);
      }
      if (filters.scheduleId) {
        filteredBookings = filteredBookings.filter(b => b.scheduleId === filters.scheduleId);
      }
      if (filters.status) {
        filteredBookings = filteredBookings.filter(b => b.status === filters.status);
      }
      if (filters.paymentStatus) {
        filteredBookings = filteredBookings.filter(b => b.paymentStatus === filters.paymentStatus);
      }
    }

    return filteredBookings;
  }

  async getBookingById(id: string): Promise<ClassBooking | null> {
    return this.bookings.find(b => b.id === id) || null;
  }

  async createBooking(bookingData: CreateBookingRequest): Promise<ClassBooking | null> {
    const schedule = await this.getScheduleById(bookingData.scheduleId);
    if (!schedule || schedule.availableSlots <= 0) return null;

    // Check if member already booked this schedule
    const existingBooking = this.bookings.find(
      b => b.scheduleId === bookingData.scheduleId && 
           b.memberId === bookingData.memberId && 
           b.status !== 'cancelled'
    );
    if (existingBooking) return null;

    const newBooking: ClassBooking = {
      id: (this.bookings.length + 1).toString(),
      scheduleId: bookingData.scheduleId,
      memberId: bookingData.memberId,
      memberName: `Member ${bookingData.memberId}`, // Mock member name
      memberEmail: `member${bookingData.memberId}@example.com`, // Mock email
      bookingDate: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.bookings.push(newBooking);

    // Update schedule booking count
    schedule.bookedCount += 1;
    schedule.availableSlots = schedule.capacity - schedule.bookedCount;
    schedule.updatedAt = new Date().toISOString();

    return newBooking;
  }

  async updateBooking(id: string, updates: UpdateBookingRequest): Promise<ClassBooking | null> {
    const bookingIndex = this.bookings.findIndex(b => b.id === id);
    if (bookingIndex === -1) return null;

    const booking = this.bookings[bookingIndex];
    const wasConfirmed = booking.status === 'confirmed';
    
    this.bookings[bookingIndex] = {
      ...booking,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Update schedule if booking status changed
    if (updates.status && updates.status !== booking.status) {
      const schedule = await this.getScheduleById(booking.scheduleId);
      if (schedule) {
        if (wasConfirmed && updates.status === 'cancelled') {
          schedule.bookedCount -= 1;
        } else if (!wasConfirmed && updates.status === 'confirmed') {
          schedule.bookedCount += 1;
        }
        schedule.availableSlots = schedule.capacity - schedule.bookedCount;
        schedule.updatedAt = new Date().toISOString();
      }
    }

    return this.bookings[bookingIndex];
  }

  async cancelBooking(id: string): Promise<boolean> {
    const booking = await this.updateBooking(id, { status: 'cancelled' });
    return booking !== null;
  }
}
