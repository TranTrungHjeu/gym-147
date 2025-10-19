const { prisma } = require('../lib/prisma.js');
const {
  validateClassCreation,
  getAvailableCategories: getAvailableCategoriesForTrainer,
} = require('../services/class-validation.service.js');

class ClassController {
  async getAllClasses(req, res) {
    try {
      const classes = await prisma.gymClass.findMany({
        include: {
          schedules: {
            include: {
              trainer: true,
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

  async getClassById(req, res) {
    try {
      const { id } = req.params;
      const gymClass = await prisma.gymClass.findUnique({
        where: { id },
        include: {
          schedules: {
            include: {
              trainer: true,
              room: true,
              bookings: true,
            },
          },
        },
      });

      if (!gymClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Class retrieved successfully',
        data: { class: gymClass },
      });
    } catch (error) {
      console.error('Get class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createClass(req, res) {
    try {
      const {
        name,
        description,
        category,
        duration,
        max_capacity,
        difficulty,
        equipment_needed,
        price,
        thumbnail,
        required_certification_level,
        trainer_id, // Add trainer_id for validation
      } = req.body;

      // Validate trainer certification if trainer_id is provided
      if (trainer_id) {
        const validation = await validateClassCreation(trainer_id, {
          category,
          required_certification_level: required_certification_level || 'BASIC',
        });

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: 'Class creation validation failed',
            data: {
              errors: validation.errors,
            },
          });
        }

        // Add warnings if any
        if (validation.errors.length > 0) {
          console.warn('Class creation warnings:', validation.errors);
        }
      }

      const gymClass = await prisma.gymClass.create({
        data: {
          name,
          description,
          category,
          duration: parseInt(duration),
          max_capacity: parseInt(max_capacity) || 20,
          difficulty,
          equipment_needed: equipment_needed || [],
          price: price ? parseFloat(price) : null,
          thumbnail,
          required_certification_level: required_certification_level || 'BASIC',
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

  async updateClass(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        duration,
        max_capacity,
        difficulty,
        equipment_needed,
        price,
        thumbnail,
        is_active,
      } = req.body;

      const gymClass = await prisma.gymClass.update({
        where: { id },
        data: {
          name,
          description,
          category,
          duration: duration ? parseInt(duration) : undefined,
          max_capacity: max_capacity ? parseInt(max_capacity) : undefined,
          difficulty,
          equipment_needed: equipment_needed || [],
          price: price ? parseFloat(price) : undefined,
          thumbnail,
          is_active,
        },
      });

      res.json({
        success: true,
        message: 'Class updated successfully',
        data: { class: gymClass },
      });
    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async deleteClass(req, res) {
    try {
      const { id } = req.params;

      await prisma.gymClass.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Class deleted successfully',
        data: null,
      });
    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getAvailableCategories(req, res) {
    try {
      const { trainerId } = req.params;

      const categories = await getAvailableCategoriesForTrainer(trainerId);

      res.json({
        success: true,
        message: 'Available categories retrieved successfully',
        data: { categories },
      });
    } catch (error) {
      console.error('Get available categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = new ClassController();
