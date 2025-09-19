import { Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service.js';
import { ApiResponse } from '../types/api.types.js';
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

export class ScheduleController {
  private scheduleService: ScheduleService;

  constructor() {
    this.scheduleService = new ScheduleService();
  }

  // Class management endpoints
  async getAllClasses(req: Request, res: Response) {
    try {
      const classes = await this.scheduleService.getAllClasses();
      
      res.json({
        success: true,
        message: 'Classes retrieved successfully',
        data: classes
      });
    } catch (error) {
      console.error('Get classes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getClassById(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      const gymClass = await this.scheduleService.getClassById(id);
      
      if (!gymClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Class retrieved successfully',
        data: gymClass
      });
    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async createClass(req: Request<{}, ApiResponse<GymClass>, CreateClassRequest>, res: Response) {
    try {
      const { name, description, instructorId, capacity, duration, price } = req.body;
      
      if (!name || !description || !instructorId || !capacity || !duration || !price) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          data: null
        });
      }

      const newClass = await this.scheduleService.createClass(req.body);

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: newClass
      });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async updateClass(req: Request<{ id: string }, ApiResponse<GymClass>, UpdateClassRequest>, res: Response) {
    try {
      const { id } = req.params;
      const updatedClass = await this.scheduleService.updateClass(id, req.body);
      
      if (!updatedClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Class updated successfully',
        data: updatedClass
      });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async deleteClass(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await this.scheduleService.deleteClass(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Class not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Class deleted successfully',
        data: null
      });
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  // Schedule management endpoints
  async getSchedules(req: Request<{}, {}, {}, ScheduleFilters>, res: Response) {
    try {
      const schedules = await this.scheduleService.getSchedules(req.query);
      
      res.json({
        success: true,
        message: 'Schedules retrieved successfully',
        data: schedules
      });
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getScheduleById(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      const schedule = await this.scheduleService.getScheduleById(id);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Schedule retrieved successfully',
        data: schedule
      });
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async createSchedule(req: Request<{}, ApiResponse<ClassSchedule>, CreateScheduleRequest>, res: Response) {
    try {
      const { classId, date, startTime, endTime } = req.body;
      
      if (!classId || !date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
          data: null
        });
      }

      const newSchedule = await this.scheduleService.createSchedule(req.body);
      
      if (!newSchedule) {
        return res.status(400).json({
          success: false,
          message: 'Class not found or invalid data',
          data: null
        });
      }

      res.status(201).json({
        success: true,
        message: 'Schedule created successfully',
        data: newSchedule
      });
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async updateSchedule(req: Request<{ id: string }, ApiResponse<ClassSchedule>, UpdateScheduleRequest>, res: Response) {
    try {
      const { id } = req.params;
      const updatedSchedule = await this.scheduleService.updateSchedule(id, req.body);
      
      if (!updatedSchedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Schedule updated successfully',
        data: updatedSchedule
      });
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  // Booking management endpoints
  async getBookings(req: Request<{}, {}, {}, BookingFilters>, res: Response) {
    try {
      const bookings = await this.scheduleService.getBookings(req.query);
      
      res.json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: bookings
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getBookingById(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      const booking = await this.scheduleService.getBookingById(id);
      
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Booking retrieved successfully',
        data: booking
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async createBooking(req: Request<{}, ApiResponse<ClassBooking>, CreateBookingRequest>, res: Response) {
    try {
      const { scheduleId, memberId } = req.body;
      
      if (!scheduleId || !memberId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID and Member ID are required',
          data: null
        });
      }

      const newBooking = await this.scheduleService.createBooking(req.body);
      
      if (!newBooking) {
        return res.status(400).json({
          success: false,
          message: 'Unable to create booking - schedule full or already booked',
          data: null
        });
      }

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: newBooking
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async updateBooking(req: Request<{ id: string }, ApiResponse<ClassBooking>, UpdateBookingRequest>, res: Response) {
    try {
      const { id } = req.params;
      const updatedBooking = await this.scheduleService.updateBooking(id, req.body);
      
      if (!updatedBooking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Booking updated successfully',
        data: updatedBooking
      });
    } catch (error) {
      console.error('Update booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async cancelBooking(req: Request<{ id: string }>, res: Response) {
    try {
      const { id } = req.params;
      const cancelled = await this.scheduleService.cancelBooking(id);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null
        });
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: null
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null
      });
    }
  }
}
