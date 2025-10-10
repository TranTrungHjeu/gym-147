const { prisma } = require('../lib/prisma.js');

class ScheduleController {
  async checkHealth(req, res) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        message: 'Schedule service is healthy',
        data: {
          status: 'operational',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service unavailable',
        data: null,
      });
    }
  }

  async getStats(req, res) {
    try {
      const [totalClasses, totalInstructors, totalRooms, totalSchedules] = await Promise.all([
        prisma.gymClass.count(),
        prisma.instructor.count(),
        prisma.room.count(),
        prisma.schedule.count(),
      ]);

      res.json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          totalClasses,
          totalInstructors,
          totalRooms,
          totalSchedules,
        },
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getAllClasses(req, res) {
    try {
      const classes = await prisma.gymClass.findMany({
        include: {
          class_instructors: {
            include: {
              instructor: true,
            },
          },
          schedules: {
            include: {
              room: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Classes retrieved successfully',
        data: { classes },
      });
    } catch (error) {
      console.error('Get classes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getInstructors(req, res) {
    try {
      const instructors = await prisma.instructor.findMany({
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Instructors retrieved successfully',
        data: { instructors },
      });
    } catch (error) {
      console.error('Get instructors error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getRooms(req, res) {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { created_at: 'desc' },
      });

      res.json({
        success: true,
        message: 'Rooms retrieved successfully',
        data: { rooms },
      });
    } catch (error) {
      console.error('Get rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getSchedules(req, res) {
    try {
      const schedules = await prisma.schedule.findMany({
        include: {
          gym_class: true,
          instructor: true,
          room: true,
        },
        orderBy: { date: 'desc' },
      });

      res.json({
        success: true,
        message: 'Schedules retrieved successfully',
        data: { schedules },
      });
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createClass(req, res) {
    try {
      const { name, description, duration, max_capacity } = req.body;

      const gymClass = await prisma.gymClass.create({
        data: {
          name,
          description,
          duration: parseInt(duration),
          max_capacity: parseInt(max_capacity),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: { class: gymClass },
      });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createSchedule(req, res) {
    try {
      const { class_id, instructor_id, room_id, date, start_time, end_time, capacity } = req.body;

      const schedule = await prisma.schedule.create({
        data: {
          class_id: parseInt(class_id),
          instructor_id: parseInt(instructor_id),
          room_id: parseInt(room_id),
          date: new Date(date),
          start_time,
          end_time,
          capacity: parseInt(capacity),
          current_bookings: 0,
        },
        include: {
          gym_class: true,
          instructor: true,
          room: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Schedule created successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Create schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createInstructor(req, res) {
    try {
      const { name, email, phone, specialization, experience_years } = req.body;

      const instructor = await prisma.instructor.create({
        data: {
          name,
          email,
          phone,
          specialization,
          experience_years: parseInt(experience_years),
        },
      });

      res.status(201).json({
        success: true,
        message: 'Instructor created successfully',
        data: { instructor },
      });
    } catch (error) {
      console.error('Create instructor error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createRoom(req, res) {
    try {
      const { name, location, capacity, equipment } = req.body;

      const room = await prisma.room.create({
        data: {
          name,
          location,
          capacity: parseInt(capacity),
          equipment: equipment || [],
        },
      });

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: { room },
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createSampleData(req, res) {
    try {
      // This method can be used to create sample data if needed
      res.json({
        success: true,
        message: 'Sample data creation not implemented - use seed script instead',
        data: null,
      });
    } catch (error) {
      console.error('Create sample data error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new ScheduleController();
