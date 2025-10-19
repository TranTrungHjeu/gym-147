const { prisma } = require('../lib/prisma.js');

class RoomController {
  async getAllRooms(req, res) {
    try {
      const rooms = await prisma.room.findMany({
        include: {
          schedules: {
            include: {
              gym_class: true,
              trainer: true,
            },
          },
        },
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

  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          schedules: {
            include: {
              gym_class: true,
              trainer: true,
              bookings: true,
            },
          },
        },
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Room retrieved successfully',
        data: { room },
      });
    } catch (error) {
      console.error('Get room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createRoom(req, res) {
    try {
      const { name, capacity, area_sqm, equipment, amenities, maintenance_notes } = req.body;

      const room = await prisma.room.create({
        data: {
          name,
          capacity: parseInt(capacity),
          area_sqm: area_sqm ? parseFloat(area_sqm) : null,
          equipment: equipment || [],
          amenities: amenities || [],
          maintenance_notes,
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

  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const { name, capacity, area_sqm, equipment, amenities, status, maintenance_notes } =
        req.body;

      const room = await prisma.room.update({
        where: { id },
        data: {
          name,
          capacity: capacity ? parseInt(capacity) : undefined,
          area_sqm: area_sqm ? parseFloat(area_sqm) : undefined,
          equipment: equipment || [],
          amenities: amenities || [],
          status,
          maintenance_notes,
        },
      });

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: { room },
      });
    } catch (error) {
      console.error('Update room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteRoom(req, res) {
    try {
      const { id } = req.params;

      await prisma.room.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Room deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete room error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getAvailableRooms(req, res) {
    try {
      const { start_time, end_time } = req.query;

      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: 'start_time and end_time are required',
          data: null,
        });
      }

      const startDateTime = new Date(start_time);
      const endDateTime = new Date(end_time);

      // Get all rooms
      const allRooms = await prisma.room.findMany({
        where: {
          status: 'AVAILABLE',
        },
        select: {
          id: true,
          name: true,
          capacity: true,
          status: true,
        },
        orderBy: { name: 'asc' },
      });

      // Get rooms with conflicts in the specified time range
      const conflictingRooms = await prisma.schedule.findMany({
        where: {
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          OR: [
            {
              AND: [
                { start_time: { lte: startDateTime } },
                { end_time: { gt: startDateTime } },
              ],
            },
            {
              AND: [
                { start_time: { lt: endDateTime } },
                { end_time: { gte: endDateTime } },
              ],
            },
            {
              AND: [
                { start_time: { gte: startDateTime } },
                { end_time: { lte: endDateTime } },
              ],
            },
          ],
        },
        select: {
          room_id: true,
        },
      });

      const conflictingRoomIds = new Set(conflictingRooms.map(schedule => schedule.room_id));

      // Filter out rooms with conflicts
      const availableRooms = allRooms.filter(room => !conflictingRoomIds.has(room.id));

      res.json({
        success: true,
        message: 'Available rooms retrieved successfully',
        data: availableRooms,
      });
    } catch (error) {
      console.error('Get available rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new RoomController();
