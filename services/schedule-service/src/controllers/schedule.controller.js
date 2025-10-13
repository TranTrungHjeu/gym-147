const { prisma } = require('../lib/prisma.js');

class ScheduleController {
  async getAllSchedules(req, res) {
    try {
      const schedules = await prisma.schedule.findMany({
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: true,
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

  async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      const schedule = await prisma.schedule.findUnique({
        where: { id },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
          bookings: {
            include: {
              // Add member info if needed
            },
          },
          attendance: true,
        },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Schedule retrieved successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Get schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createSchedule(req, res) {
    try {
      const {
        class_id,
        trainer_id,
        room_id,
        date,
        start_time,
        end_time,
        max_capacity,
        price_override,
        special_notes,
      } = req.body;

      const schedule = await prisma.schedule.create({
        data: {
          class_id,
          trainer_id,
          room_id,
          date: new Date(date),
          start_time: new Date(start_time),
          end_time: new Date(end_time),
          max_capacity: parseInt(max_capacity),
          price_override: price_override ? parseFloat(price_override) : null,
          special_notes,
        },
        include: {
          gym_class: true,
          trainer: true,
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

  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const {
        class_id,
        trainer_id,
        room_id,
        date,
        start_time,
        end_time,
        status,
        max_capacity,
        price_override,
        special_notes,
      } = req.body;

      const schedule = await prisma.schedule.update({
        where: { id },
        data: {
          class_id,
          trainer_id,
          room_id,
          date: date ? new Date(date) : undefined,
          start_time: start_time ? new Date(start_time) : undefined,
          end_time: end_time ? new Date(end_time) : undefined,
          status,
          max_capacity: max_capacity ? parseInt(max_capacity) : undefined,
          price_override: price_override ? parseFloat(price_override) : undefined,
          special_notes,
        },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      res.json({
        success: true,
        message: 'Schedule updated successfully',
        data: { schedule },
      });
    } catch (error) {
      console.error('Update schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteSchedule(req, res) {
    try {
      const { id } = req.params;

      await prisma.schedule.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new ScheduleController();
