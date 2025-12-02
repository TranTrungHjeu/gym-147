// Use the shared Prisma client from lib/prisma.js
const { prisma } = require('../lib/prisma');

/**
 * Guest Pass Service
 * Manages guest passes for gym access
 */
class GuestPassService {
  /**
   * Create a new guest pass
   * @param {Object} guestPassData - Guest pass data
   * @returns {Promise<Object>} Created guest pass
   */
  async createGuestPass(guestPassData) {
    try {
      const {
        member_id,
        guest_name,
        guest_email,
        guest_phone,
        guest_id_number,
        pass_type,
        valid_from,
        valid_until,
        max_uses,
        notes,
        price,
        payment_status,
        payment_id,
        issuer_membership_id,
        issuer_subscription_id,
      } = guestPassData;

      // Validate member exists
      const member = await prisma.member.findUnique({
        where: { id: member_id },
      });

      if (!member) {
        return { success: false, error: 'Member not found' };
      }

      // Calculate valid_until if not provided based on pass_type
      let calculatedValidUntil = valid_until;
      if (!calculatedValidUntil && valid_from) {
        const validFromDate = new Date(valid_from);
        switch (pass_type) {
          case 'SINGLE_DAY':
            calculatedValidUntil = new Date(validFromDate);
            calculatedValidUntil.setDate(validFromDate.getDate() + 1);
            break;
          case 'WEEK':
            calculatedValidUntil = new Date(validFromDate);
            calculatedValidUntil.setDate(validFromDate.getDate() + 7);
            break;
          case 'MONTH':
            calculatedValidUntil = new Date(validFromDate);
            calculatedValidUntil.setMonth(validFromDate.getMonth() + 1);
            break;
        }
      }

      // Set default max_uses based on pass_type
      let calculatedMaxUses = max_uses;
      if (!calculatedMaxUses) {
        switch (pass_type) {
          case 'SINGLE_DAY':
            calculatedMaxUses = 1;
            break;
          case 'WEEK':
            calculatedMaxUses = 7;
            break;
          case 'MONTH':
            calculatedMaxUses = 30;
            break;
        }
      }

      const guestPass = await prisma.guestPass.create({
        data: {
          member_id,
          guest_name,
          guest_email,
          guest_phone,
          guest_id_number,
          pass_type,
          valid_from: valid_from ? new Date(valid_from) : new Date(),
          valid_until: calculatedValidUntil ? new Date(calculatedValidUntil) : new Date(),
          max_uses: calculatedMaxUses,
          notes,
          price: price ? parseFloat(price) : null,
          payment_status: payment_status || 'INCLUDED',
          payment_id,
          issuer_membership_id,
          issuer_subscription_id,
          status: 'ACTIVE',
          uses_count: 0,
          access_logs: [],
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              email: true,
              membership_number: true,
            },
          },
        },
      });

      return { success: true, guestPass };
    } catch (error) {
      console.error('Create guest pass error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all guest passes with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Guest passes list
   */
  async getGuestPasses(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        pass_type,
        member_id,
        search,
        startDate,
        endDate,
      } = filters;

      const skip = (page - 1) * limit;
      const where = {};

      if (status) where.status = status;
      if (pass_type) where.pass_type = pass_type;
      if (member_id) where.member_id = member_id;

      if (search) {
        where.OR = [
          { guest_name: { contains: search, mode: 'insensitive' } },
          { guest_email: { contains: search, mode: 'insensitive' } },
          { guest_phone: { contains: search, mode: 'insensitive' } },
          { guest_id_number: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (startDate || endDate) {
        where.valid_from = {};
        if (startDate) where.valid_from.gte = new Date(startDate);
        if (endDate) where.valid_from.lte = new Date(endDate);
      }

      const [guestPasses, total] = await Promise.all([
        prisma.guestPass.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
          include: {
            member: {
              select: {
                id: true,
                full_name: true,
                email: true,
                membership_number: true,
              },
            },
          },
        }),
        prisma.guestPass.count({ where }),
      ]);

      return {
        success: true,
        guestPasses,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Get guest passes error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get guest pass by ID
   * @param {string} guestPassId - Guest pass ID
   * @returns {Promise<Object>} Guest pass
   */
  async getGuestPassById(guestPassId) {
    try {
      const guestPass = await prisma.guestPass.findUnique({
        where: { id: guestPassId },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              email: true,
              membership_number: true,
            },
          },
        },
      });

      if (!guestPass) {
        return { success: false, error: 'Guest pass not found' };
      }

      return { success: true, guestPass };
    } catch (error) {
      console.error('Get guest pass by ID error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update guest pass
   * @param {string} guestPassId - Guest pass ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated guest pass
   */
  async updateGuestPass(guestPassId, updateData) {
    try {
      const existingGuestPass = await prisma.guestPass.findUnique({
        where: { id: guestPassId },
      });

      if (!existingGuestPass) {
        return { success: false, error: 'Guest pass not found' };
      }

      // Only allow updates if pass is ACTIVE
      if (existingGuestPass.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Cannot update guest pass that is not active',
        };
      }

      const updateFields = {};
      if (updateData.guest_name) updateFields.guest_name = updateData.guest_name;
      if (updateData.guest_email !== undefined) updateFields.guest_email = updateData.guest_email;
      if (updateData.guest_phone !== undefined) updateFields.guest_phone = updateData.guest_phone;
      if (updateData.guest_id_number !== undefined)
        updateFields.guest_id_number = updateData.guest_id_number;
      if (updateData.notes !== undefined) updateFields.notes = updateData.notes;
      if (updateData.valid_from) updateFields.valid_from = new Date(updateData.valid_from);
      if (updateData.valid_until) updateFields.valid_until = new Date(updateData.valid_until);

      const updatedGuestPass = await prisma.guestPass.update({
        where: { id: guestPassId },
        data: updateFields,
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              email: true,
              membership_number: true,
            },
          },
        },
      });

      return { success: true, guestPass: updatedGuestPass };
    } catch (error) {
      console.error('Update guest pass error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete guest pass
   * @param {string} guestPassId - Guest pass ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteGuestPass(guestPassId) {
    try {
      const existingGuestPass = await prisma.guestPass.findUnique({
        where: { id: guestPassId },
      });

      if (!existingGuestPass) {
        return { success: false, error: 'Guest pass not found' };
      }

      // Only allow deletion if pass is not used
      if (existingGuestPass.uses_count > 0) {
        return {
          success: false,
          error: 'Cannot delete guest pass that has been used',
        };
      }

      await prisma.guestPass.delete({
        where: { id: guestPassId },
      });

      return { success: true };
    } catch (error) {
      console.error('Delete guest pass error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel guest pass
   * @param {string} guestPassId - Guest pass ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled guest pass
   */
  async cancelGuestPass(guestPassId, reason) {
    try {
      const existingGuestPass = await prisma.guestPass.findUnique({
        where: { id: guestPassId },
      });

      if (!existingGuestPass) {
        return { success: false, error: 'Guest pass not found' };
      }

      if (existingGuestPass.status !== 'ACTIVE') {
        return {
          success: false,
          error: 'Only active guest passes can be cancelled',
        };
      }

      const cancelledGuestPass = await prisma.guestPass.update({
        where: { id: guestPassId },
        data: {
          status: 'CANCELLED',
          cancellation_reason: reason,
          cancelled_at: new Date(),
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              email: true,
              membership_number: true,
            },
          },
        },
      });

      return { success: true, guestPass: cancelledGuestPass };
    } catch (error) {
      console.error('Cancel guest pass error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Use guest pass (record access)
   * @param {string} guestPassId - Guest pass ID
   * @param {Object} accessData - Access data (entry_time, entry_method, gate_id)
   * @returns {Promise<Object>} Updated guest pass
   */
  async useGuestPass(guestPassId, accessData) {
    try {
      const { entry_time, entry_method, gate_id } = accessData;

      const existingGuestPass = await prisma.guestPass.findUnique({
        where: { id: guestPassId },
      });

      if (!existingGuestPass) {
        return { success: false, error: 'Guest pass not found' };
      }

      // Check if pass is active
      if (existingGuestPass.status !== 'ACTIVE') {
        return {
          success: false,
          error: `Guest pass is ${existingGuestPass.status.toLowerCase()}`,
        };
      }

      // Check if pass is still valid
      const now = new Date();
      const validFrom = new Date(existingGuestPass.valid_from);
      const validUntil = new Date(existingGuestPass.valid_until);

      if (now < validFrom || now > validUntil) {
        return {
          success: false,
          error: 'Guest pass is not valid at this time',
        };
      }

      // Check if max uses reached
      if (existingGuestPass.uses_count >= existingGuestPass.max_uses) {
        return {
          success: false,
          error: 'Guest pass has reached maximum uses',
        };
      }

      // Update guest pass with new access log
      const accessLogs = existingGuestPass.access_logs || [];
      const newAccessLog = {
        id: `log_${Date.now()}`,
        entry_time: entry_time || new Date().toISOString(),
        entry_method: entry_method || 'MANUAL',
        gate_id: gate_id || null,
      };
      accessLogs.push(newAccessLog);

      const updatedUsesCount = existingGuestPass.uses_count + 1;
      const newStatus =
        updatedUsesCount >= existingGuestPass.max_uses ? 'USED' : existingGuestPass.status;

      const updatedGuestPass = await prisma.guestPass.update({
        where: { id: guestPassId },
        data: {
          uses_count: updatedUsesCount,
          last_used_at: new Date(),
          status: newStatus,
          access_logs: accessLogs,
        },
        include: {
          member: {
            select: {
              id: true,
              full_name: true,
              email: true,
              membership_number: true,
            },
          },
        },
      });

      return { success: true, guestPass: updatedGuestPass, accessLog: newAccessLog };
    } catch (error) {
      console.error('Use guest pass error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get guest pass statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getGuestPassStats(filters = {}) {
    try {
      const { member_id, startDate, endDate } = filters;
      const where = {};

      if (member_id) where.member_id = member_id;
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = new Date(startDate);
        if (endDate) where.created_at.lte = new Date(endDate);
      }

      const [
        total,
        active,
        used,
        expired,
        cancelled,
        totalUses,
        byPassType,
      ] = await Promise.all([
        prisma.guestPass.count({ where }),
        prisma.guestPass.count({ where: { ...where, status: 'ACTIVE' } }),
        prisma.guestPass.count({ where: { ...where, status: 'USED' } }),
        prisma.guestPass.count({ where: { ...where, status: 'EXPIRED' } }),
        prisma.guestPass.count({ where: { ...where, status: 'CANCELLED' } }),
        prisma.guestPass.aggregate({
          where,
          _sum: { uses_count: true },
        }),
        prisma.guestPass.groupBy({
          by: ['pass_type'],
          where,
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        stats: {
          total,
          active,
          used,
          expired,
          cancelled,
          total_uses: totalUses._sum.uses_count || 0,
          by_pass_type: byPassType.reduce((acc, item) => {
            acc[item.pass_type] = item._count.id;
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      console.error('Get guest pass stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and expire guest passes
   * Should be called by a cron job
   */
  async expireGuestPasses() {
    try {
      const now = new Date();
      const result = await prisma.guestPass.updateMany({
        where: {
          status: 'ACTIVE',
          valid_until: { lt: now },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      return { success: true, expiredCount: result.count };
    } catch (error) {
      console.error('Expire guest passes error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new GuestPassService();


