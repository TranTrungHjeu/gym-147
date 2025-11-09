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
      const { name, capacity, area_sqm, equipment, amenities, status, maintenance_notes } = req.body;

      const errors = [];

      // Validate name
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Tên phòng là bắt buộc');
      } else if (name.trim().length > 100) {
        errors.push('Tên phòng không được quá 100 ký tự');
      }

      // Validate capacity
      if (capacity === undefined || capacity === null || capacity === '') {
        errors.push('Sức chứa là bắt buộc');
      } else {
        const parsedCapacity = parseInt(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity < 1) {
          errors.push('Sức chứa phải ít nhất 1 người');
        } else if (parsedCapacity > 500) {
          errors.push('Sức chứa không được quá 500 người');
        }
      }

      // Validate area_sqm
      if (area_sqm !== undefined && area_sqm !== null && area_sqm !== '') {
        const parsedArea = parseFloat(area_sqm);
        if (isNaN(parsedArea) || parsedArea < 0) {
          errors.push('Diện tích không được âm');
        }
      }

      // Validate equipment
      if (equipment !== undefined && equipment !== null) {
        if (!Array.isArray(equipment)) {
          errors.push('Thiết bị phải là một mảng');
        } else if (equipment.length > 50) {
          errors.push('Số lượng thiết bị không được quá 50');
        } else {
          // Validate each equipment item
          equipment.forEach((item, index) => {
            if (typeof item !== 'string' || item.trim().length === 0) {
              errors.push(`Thiết bị thứ ${index + 1} không hợp lệ`);
            } else if (item.length > 100) {
              errors.push(`Thiết bị thứ ${index + 1} không được quá 100 ký tự`);
            }
          });
        }
      }

      // Validate amenities
      const validAmenities = ['MIRRORS', 'PROJECTOR', 'SOUND_SYSTEM', 'AIR_CONDITIONING', 'VENTILATION', 'LIGHTING', 'FLOORING'];
      if (amenities !== undefined && amenities !== null) {
        if (!Array.isArray(amenities)) {
          errors.push('Tiện ích phải là một mảng');
        } else {
          amenities.forEach((amenity, index) => {
            if (!validAmenities.includes(amenity)) {
              errors.push(`Tiện ích thứ ${index + 1} không hợp lệ. Các giá trị hợp lệ: ${validAmenities.join(', ')}`);
            }
          });
        }
      }

      // Validate status
      const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED'];
      if (status !== undefined && status !== null && status !== '') {
        if (!validStatuses.includes(status)) {
          errors.push(`Trạng thái không hợp lệ. Các giá trị hợp lệ: ${validStatuses.join(', ')}`);
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          data: { errors },
        });
      }

      // Check for duplicate name
      const existingRoom = await prisma.room.findUnique({
        where: { name: name.trim() },
      });

      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: 'Room name already exists',
          data: { errors: ['Tên phòng đã tồn tại'] },
        });
      }

      // Create room
      const room = await prisma.room.create({
        data: {
          name: name.trim(),
          capacity: parseInt(capacity),
          area_sqm: area_sqm ? parseFloat(area_sqm) : null,
          equipment: equipment || [],
          amenities: amenities || [],
          status: status || 'AVAILABLE',
          maintenance_notes: maintenance_notes || null,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: { room },
      });
    } catch (error) {
      console.error('Create room error:', error);
      
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Room name already exists',
          data: { errors: ['Tên phòng đã tồn tại'] },
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: { errors: ['Có lỗi xảy ra khi tạo phòng tập'] },
      });
    }
  }

  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const { name, capacity, area_sqm, equipment, amenities, status, maintenance_notes } =
        req.body;

      const errors = [];

      // Check if room exists
      const existingRoom = await prisma.room.findUnique({
        where: { id },
      });

      if (!existingRoom) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: { errors: ['Không tìm thấy phòng tập'] },
        });
      }

      // Validate name if provided
      if (name !== undefined && name !== null) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          errors.push('Tên phòng là bắt buộc');
        } else if (name.trim().length > 100) {
          errors.push('Tên phòng không được quá 100 ký tự');
        } else {
          // Check for duplicate name (excluding current room)
          const duplicateRoom = await prisma.room.findFirst({
            where: {
              name: name.trim(),
              id: { not: id },
            },
          });

          if (duplicateRoom) {
            errors.push('Tên phòng đã tồn tại');
          }
        }
      }

      // Validate capacity if provided
      if (capacity !== undefined && capacity !== null && capacity !== '') {
        const parsedCapacity = parseInt(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity < 1) {
          errors.push('Sức chứa phải ít nhất 1 người');
        } else if (parsedCapacity > 500) {
          errors.push('Sức chứa không được quá 500 người');
        }
      }

      // Validate area_sqm if provided
      if (area_sqm !== undefined && area_sqm !== null && area_sqm !== '') {
        const parsedArea = parseFloat(area_sqm);
        if (isNaN(parsedArea) || parsedArea < 0) {
          errors.push('Diện tích không được âm');
        }
      }

      // Validate equipment if provided
      if (equipment !== undefined && equipment !== null) {
        if (!Array.isArray(equipment)) {
          errors.push('Thiết bị phải là một mảng');
        } else if (equipment.length > 50) {
          errors.push('Số lượng thiết bị không được quá 50');
        } else {
          equipment.forEach((item, index) => {
            if (typeof item !== 'string' || item.trim().length === 0) {
              errors.push(`Thiết bị thứ ${index + 1} không hợp lệ`);
            } else if (item.length > 100) {
              errors.push(`Thiết bị thứ ${index + 1} không được quá 100 ký tự`);
            }
          });
        }
      }

      // Validate amenities if provided
      const validAmenities = ['MIRRORS', 'PROJECTOR', 'SOUND_SYSTEM', 'AIR_CONDITIONING', 'VENTILATION', 'LIGHTING', 'FLOORING'];
      if (amenities !== undefined && amenities !== null) {
        if (!Array.isArray(amenities)) {
          errors.push('Tiện ích phải là một mảng');
        } else {
          amenities.forEach((amenity, index) => {
            if (!validAmenities.includes(amenity)) {
              errors.push(`Tiện ích thứ ${index + 1} không hợp lệ. Các giá trị hợp lệ: ${validAmenities.join(', ')}`);
            }
          });
        }
      }

      // Validate status if provided
      const validStatuses = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'RESERVED'];
      if (status !== undefined && status !== null && status !== '') {
        if (!validStatuses.includes(status)) {
          errors.push(`Trạng thái không hợp lệ. Các giá trị hợp lệ: ${validStatuses.join(', ')}`);
        }
      }

      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          data: { errors },
        });
      }

      // Build update data object
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (capacity !== undefined && capacity !== null && capacity !== '') {
        updateData.capacity = parseInt(capacity);
      }
      if (area_sqm !== undefined && area_sqm !== null && area_sqm !== '') {
        updateData.area_sqm = parseFloat(area_sqm);
      } else if (area_sqm === null) {
        updateData.area_sqm = null;
      }
      if (equipment !== undefined) updateData.equipment = equipment;
      if (amenities !== undefined) updateData.amenities = amenities;
      if (status !== undefined && status !== null && status !== '') {
        updateData.status = status;
      }
      if (maintenance_notes !== undefined) {
        updateData.maintenance_notes = maintenance_notes || null;
      }

      const room = await prisma.room.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: { room },
      });
    } catch (error) {
      console.error('Update room error:', error);
      
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Room name already exists',
          data: { errors: ['Tên phòng đã tồn tại'] },
        });
      }

      // Handle Prisma not found error
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: { errors: ['Không tìm thấy phòng tập'] },
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: { errors: ['Có lỗi xảy ra khi cập nhật phòng tập'] },
      });
    }
  }

  async deleteRoom(req, res) {
    try {
      const { id } = req.params;

      // Check if room exists
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          schedules: {
            where: {
              status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
            select: {
              id: true,
              date: true,
              start_time: true,
              end_time: true,
              gym_class: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: { errors: ['Không tìm thấy phòng tập'] },
        });
      }

      // Check if room has active schedules
      if (room.schedules && room.schedules.length > 0) {
        const scheduleDetails = room.schedules.map(s => {
          const date = new Date(s.date).toLocaleDateString('vi-VN');
          const startTime = new Date(s.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(s.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          return `${s.gym_class?.name || 'Lớp học'} - ${date} (${startTime} - ${endTime})`;
        }).join(', ');

        return res.status(400).json({
          success: false,
          message: 'Cannot delete room with active schedules',
          data: {
            errors: [
              `Không thể xóa phòng tập vì có ${room.schedules.length} lịch học đang hoạt động. Vui lòng hủy hoặc hoàn thành các lịch học trước khi xóa.`,
              `Các lịch học: ${scheduleDetails}`,
            ],
          },
        });
      }

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
      
      // Handle Prisma not found error
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          data: { errors: ['Không tìm thấy phòng tập'] },
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: { errors: ['Có lỗi xảy ra khi xóa phòng tập'] },
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
