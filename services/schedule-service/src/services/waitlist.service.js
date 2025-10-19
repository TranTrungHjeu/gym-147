/**
 * Waitlist Management Service
 * Handles waitlist operations for fully booked schedules
 */

const { prisma } = require('../lib/prisma.js');
const notificationService = require('./notification.service.js');

class WaitlistService {
  /**
   * Add member to waitlist when schedule is full
   * @param {string} scheduleId - Schedule ID
   * @param {string} memberId - Member ID
   * @param {string} specialNeeds - Special needs (optional)
   * @param {string} notes - Notes (optional)
   * @returns {Object} Waitlist entry with position
   */
  async addToWaitlist(scheduleId, memberId, specialNeeds = null, notes = null) {
    try {
      // Check if member is already in waitlist
      const existingWaitlist = await prisma.booking.findFirst({
        where: {
          schedule_id: scheduleId,
          member_id: memberId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
      });

      if (existingWaitlist) {
        throw new Error('Member is already in waitlist for this schedule');
      }

      // Get current waitlist count to determine position
      const waitlistCount = await prisma.booking.count({
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
      });

      const waitlistPosition = waitlistCount + 1;

      // Create waitlist booking
      const waitlistBooking = await prisma.booking.create({
        data: {
          schedule_id: scheduleId,
          member_id: memberId,
          status: 'CONFIRMED',
          is_waitlist: true,
          waitlist_position: waitlistPosition,
          special_needs: specialNeeds,
          notes: notes,
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      // Update schedule waitlist count
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          waitlist_count: {
            increment: 1,
          },
        },
      });

      // Send notification to member
      await notificationService.sendNotification({
        type: 'WAITLIST_ADDED',
        member_id: memberId,
        schedule_id: scheduleId,
        data: {
          class_name: waitlistBooking.schedule.gym_class.name,
          trainer_name: waitlistBooking.schedule.trainer?.full_name,
          waitlist_position: waitlistPosition,
          start_time: waitlistBooking.schedule.start_time,
        },
      });

      return {
        booking: waitlistBooking,
        waitlist_position: waitlistPosition,
        message: `Added to waitlist at position ${waitlistPosition}`,
      };
    } catch (error) {
      console.error('Add to waitlist error:', error);
      throw error;
    }
  }

  /**
   * Promote member from waitlist when space becomes available
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Promoted booking or null if no one in waitlist
   */
  async promoteFromWaitlist(scheduleId) {
    try {
      // Get the first member in waitlist (lowest position)
      const nextInWaitlist = await prisma.booking.findFirst({
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
        orderBy: {
          waitlist_position: 'asc',
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      if (!nextInWaitlist) {
        return null; // No one in waitlist
      }

      // Check if schedule still has capacity
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        select: { current_bookings: true, max_capacity: true },
      });

      if (schedule.current_bookings >= schedule.max_capacity) {
        return null; // Schedule is still full
      }

      // Promote the member (remove from waitlist, add as regular booking)
      const promotedBooking = await prisma.booking.update({
        where: { id: nextInWaitlist.id },
        data: {
          is_waitlist: false,
          waitlist_position: null,
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      // Update schedule bookings count
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          current_bookings: {
            increment: 1,
          },
          waitlist_count: {
            decrement: 1,
          },
        },
      });

      // Update waitlist positions for remaining members
      await this.updateWaitlistPositions(scheduleId);

      // Send notification to promoted member
      await notificationService.sendNotification({
        type: 'WAITLIST_PROMOTED',
        member_id: promotedBooking.member_id,
        schedule_id: scheduleId,
        data: {
          class_name: promotedBooking.schedule.gym_class.name,
          trainer_name: promotedBooking.schedule.trainer?.full_name,
          start_time: promotedBooking.schedule.start_time,
        },
      });

      return {
        booking: promotedBooking,
        message: 'Member promoted from waitlist successfully',
      };
    } catch (error) {
      console.error('Promote from waitlist error:', error);
      throw error;
    }
  }

  /**
   * Update waitlist positions after promotion or removal
   * @param {string} scheduleId - Schedule ID
   */
  async updateWaitlistPositions(scheduleId) {
    try {
      const waitlistMembers = await prisma.booking.findMany({
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
        orderBy: {
          created_at: 'asc', // First come, first served
        },
      });

      // Update positions
      for (let i = 0; i < waitlistMembers.length; i++) {
        await prisma.booking.update({
          where: { id: waitlistMembers[i].id },
          data: {
            waitlist_position: i + 1,
          },
        });
      }
    } catch (error) {
      console.error('Update waitlist positions error:', error);
      throw error;
    }
  }

  /**
   * Remove member from waitlist
   * @param {string} bookingId - Booking ID
   * @returns {Object} Result of removal
   */
  async removeFromWaitlist(bookingId) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          schedule: true,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.is_waitlist) {
        throw new Error('Booking is not in waitlist');
      }

      // Delete the waitlist booking
      await prisma.booking.delete({
        where: { id: bookingId },
      });

      // Update schedule waitlist count
      await prisma.schedule.update({
        where: { id: booking.schedule_id },
        data: {
          waitlist_count: {
            decrement: 1,
          },
        },
      });

      // Update positions for remaining waitlist members
      await this.updateWaitlistPositions(booking.schedule_id);

      return {
        success: true,
        message: 'Removed from waitlist successfully',
      };
    } catch (error) {
      console.error('Remove from waitlist error:', error);
      throw error;
    }
  }

  /**
   * Get waitlist for a specific schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Array} List of waitlist members
   */
  async getWaitlistBySchedule(scheduleId) {
    try {
      const waitlist = await prisma.booking.findMany({
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
        orderBy: {
          waitlist_position: 'asc',
        },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
      });

      return waitlist;
    } catch (error) {
      console.error('Get waitlist by schedule error:', error);
      throw error;
    }
  }

  /**
   * Get waitlist statistics for a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Waitlist statistics
   */
  async getWaitlistStats(scheduleId) {
    try {
      const stats = await prisma.booking.groupBy({
        by: ['status'],
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
        },
        _count: {
          id: true,
        },
      });

      const totalWaitlist = stats.reduce((sum, stat) => sum + stat._count.id, 0);

      return {
        total_waitlist: totalWaitlist,
        by_status: stats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Get waitlist stats error:', error);
      throw error;
    }
  }

  /**
   * Check if schedule has available capacity
   * @param {string} scheduleId - Schedule ID
   * @returns {boolean} True if has capacity
   */
  async hasCapacity(scheduleId) {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        select: {
          current_bookings: true,
          max_capacity: true,
        },
      });

      return schedule.current_bookings < schedule.max_capacity;
    } catch (error) {
      console.error('Check capacity error:', error);
      throw error;
    }
  }
}

module.exports = new WaitlistService();
