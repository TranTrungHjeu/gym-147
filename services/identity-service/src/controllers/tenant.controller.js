const { prisma } = require('../lib/prisma.js');

class TenantController {
  /**
   * Join gym (single gym system)
   */
  async joinGym(req, res) {
    try {
      const userId = req.user.id;
      
      // Single gym configuration
      const gymId = 'gym-147';
      const gymName = 'Gym 147';

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Check if user already has an active membership
        const existingMembership = await tx.gymMembership.findUnique({
          where: { user_id: userId },
        });

        if (existingMembership) {
          // If membership exists and is ACTIVE, return idempotent response
          if (existingMembership.status === 'ACTIVE') {
            return {
              success: true,
              message: `Bạn đã là thành viên của ${gymName}`,
              data: {
                gymId: existingMembership.gym_id,
                gymName: existingMembership.gym_name,
                joinedAt: existingMembership.joined_at,
                membershipId: existingMembership.id,
              },
              isNew: false,
            };
          }

          // If membership exists but is INACTIVE, reactivate it
          const reactivated = await tx.gymMembership.update({
            where: { id: existingMembership.id },
            data: {
              status: 'ACTIVE',
              left_at: null,
              joined_at: new Date(), // Update joined_at to now
            },
          });

          return {
            success: true,
            message: `Đã tham gia lại ${gymName} thành công`,
            data: {
              gymId: reactivated.gym_id,
              gymName: reactivated.gym_name,
              joinedAt: reactivated.joined_at,
              membershipId: reactivated.id,
            },
            isNew: false,
          };
        }

        // Create new membership
        const newMembership = await tx.gymMembership.create({
          data: {
            user_id: userId,
            gym_id: gymId,
            gym_name: gymName,
            status: 'ACTIVE',
            role: 'MEMBER',
            is_primary: true, // Always true for single gym
            joined_at: new Date(),
          },
        });

        return {
          success: true,
          message: `Đã tham gia ${gymName} thành công`,
          data: {
            gymId: newMembership.gym_id,
            gymName: newMembership.gym_name,
            joinedAt: newMembership.joined_at,
            membershipId: newMembership.id,
          },
          isNew: true,
        };
      });

      res.json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Join gym error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Leave gym (single gym system)
   */
  async leaveGym(req, res) {
    try {
      const userId = req.user.id;
      const { gymId } = req.params;

      // Single gym ID
      const expectedGymId = 'gym-147';

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Find membership for the single gym
        const membership = await tx.gymMembership.findUnique({
          where: { user_id: userId },
        });

        if (!membership) {
          return {
            success: false,
            message: 'Bạn chưa tham gia gym này',
            data: null,
          };
        }

        // Validate gym ID matches (if provided)
        if (gymId && membership.gym_id !== gymId && membership.gym_id !== expectedGymId) {
          return {
            success: false,
            message: 'Gym ID không khớp',
            data: null,
          };
        }

        // Check if already inactive
        if (membership.status === 'INACTIVE') {
          return {
            success: false,
            message: 'Bạn đã rời gym này rồi',
            data: null,
          };
        }

        // Mark as inactive
        const updated = await tx.gymMembership.update({
          where: { id: membership.id },
          data: {
            status: 'INACTIVE',
            left_at: new Date(),
          },
        });

        return {
          success: true,
          message: 'Đã rời gym thành công',
          data: {
            gymId: updated.gym_id,
            gymName: updated.gym_name,
            leftAt: updated.left_at,
          },
        };
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({
        success: result.success,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      console.error('Leave gym error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get gym memberships (single gym system - returns max 1 membership)
   */
  async getGymMemberships(req, res) {
    try {
      const userId = req.user.id;

      // Get membership for user (max 1 since single gym)
      const membership = await prisma.gymMembership.findUnique({
        where: { user_id: userId },
      });

      if (!membership) {
        // Return empty array to maintain API compatibility
        return res.json({
          success: true,
          message: 'Gym memberships retrieved successfully',
          data: {
            memberships: [],
            total: 0,
          },
        });
      }

      // Format response
      const formattedMembership = {
        id: membership.id,
        gymId: membership.gym_id,
        gymName: membership.gym_name,
        joinedAt: membership.joined_at,
        leftAt: membership.left_at,
        isPrimary: membership.is_primary,
        status: membership.status,
        role: membership.role,
      };

      res.json({
        success: true,
        message: 'Gym memberships retrieved successfully',
        data: {
          memberships: [formattedMembership],
          total: 1,
        },
      });
    } catch (error) {
      console.error('Get gym memberships error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Set primary gym (no-op for single gym system)
   */
  async setPrimaryGym(req, res) {
    try {
      const userId = req.user.id;
      const { gymId } = req.body;

      if (!gymId) {
        return res.status(400).json({
          success: false,
          message: 'Gym ID là bắt buộc',
          data: null,
        });
      }

      // Single gym system - validate membership exists
      const membership = await prisma.gymMembership.findUnique({
        where: { user_id: userId },
      });

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Bạn chưa tham gia gym này',
          data: null,
        });
      }

      // Validate gym ID matches
      if (membership.gym_id !== gymId && gymId !== 'gym-147') {
        return res.status(400).json({
          success: false,
          message: 'Gym ID không hợp lệ',
          data: null,
        });
      }

      // No-op: Since there's only one gym, is_primary is always true
      // Just return success response
      res.json({
        success: true,
        message: 'Primary gym đã được cập nhật thành công',
        data: {
          gymId: membership.gym_id,
          gymName: membership.gym_name,
          isPrimary: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Set primary gym error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}

module.exports = { TenantController };
