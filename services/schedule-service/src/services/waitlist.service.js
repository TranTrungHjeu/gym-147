/**
 * Waitlist Management Service
 * Handles waitlist operations for fully booked schedules
 */

const { prisma } = require('../lib/prisma.js');
const notificationService = require('./notification.service.js');
const axios = require('axios');

// BILLING_SERVICE_URL with fallback for Docker environment
const BILLING_SERVICE_URL =
  process.env.BILLING_SERVICE_URL ||
  (process.env.DOCKER_ENV === 'true' ? 'http://billing:3004' : 'http://localhost:3004');

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
      // Get schedule with gym_class to calculate price
      const scheduleWithDetails = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          gym_class: true,
        },
      });

      if (!scheduleWithDetails) {
        throw new Error('Schedule not found');
      }

      // Calculate booking price
      let bookingPrice = parseFloat(
        scheduleWithDetails.price_override || scheduleWithDetails.gym_class?.price || 0
      );

      // Validate booking price >= 0 (prevent negative prices)
      if (isNaN(bookingPrice) || bookingPrice < 0) {
        console.error(
          `[ERROR] Invalid booking price calculated: ${bookingPrice} for schedule ${scheduleId}`
        );
        bookingPrice = 0; // Set to 0 if invalid or negative
      }

      // TC-BOOK-007: Use transaction to prevent race condition in waitlist position calculation
      const result = await prisma.$transaction(
        async tx => {
          // Check if member already has ANY booking for this schedule (including cancelled)
          // This is necessary because of the unique constraint on (schedule_id, member_id)
          const existingBooking = await tx.booking.findFirst({
            where: {
              schedule_id: scheduleId,
              member_id: memberId,
            },
          });

          if (existingBooking) {
            // If there's an existing non-cancelled booking, check if it's already a waitlist
            if (existingBooking.status !== 'CANCELLED') {
              if (existingBooking.is_waitlist && existingBooking.status === 'CONFIRMED') {
                throw new Error('Member is already in waitlist for this schedule');
              }
              // If it's a regular confirmed booking, they shouldn't be added to waitlist
              throw new Error('Member already has a booking for this schedule');
            }

            // If booking is cancelled, update it to waitlist instead of creating new one
            // This respects the unique constraint while allowing re-booking after cancellation
            const wasWaitlist = existingBooking.is_waitlist;

            const waitlistCount = await tx.booking.count({
              where: {
                schedule_id: scheduleId,
                is_waitlist: true,
                status: 'CONFIRMED',
              },
            });

            const waitlistPosition = waitlistCount + 1;

            const waitlistBooking = await tx.booking.update({
              where: { id: existingBooking.id },
              data: {
                status: 'CONFIRMED',
                is_waitlist: true,
                waitlist_position: waitlistPosition,
                special_needs: specialNeeds,
                notes: notes,
                cancelled_at: null,
                cancellation_reason: null,
                booked_at: new Date(), // Update booked_at to current time
                // Reset payment_status based on booking price
                payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
                amount_paid: bookingPrice > 0 ? null : 0,
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

            // Update schedule waitlist count (atomic in transaction)
            // Only increment if it wasn't already a waitlist booking
            if (!wasWaitlist) {
              await tx.schedule.update({
                where: { id: scheduleId },
                data: {
                  waitlist_count: {
                    increment: 1,
                  },
                },
              });
            }

            return {
              booking: waitlistBooking,
              waitlist_position: waitlistPosition,
            };
          }

          // No existing booking, create new waitlist booking
          // Get current waitlist count to determine position (atomic operation in transaction)
          const waitlistCount = await tx.booking.count({
            where: {
              schedule_id: scheduleId,
              is_waitlist: true,
              status: 'CONFIRMED',
            },
          });

          const waitlistPosition = waitlistCount + 1;

          // Create waitlist booking with correct payment_status based on price
          const waitlistBooking = await tx.booking.create({
            data: {
              schedule_id: scheduleId,
              member_id: memberId,
              status: 'CONFIRMED',
              is_waitlist: true,
              waitlist_position: waitlistPosition,
              special_needs: specialNeeds,
              notes: notes,
              // Set payment_status based on booking price (same logic as regular booking)
              payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
              amount_paid: bookingPrice > 0 ? null : 0,
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

          // Update schedule waitlist count (atomic in transaction)
          await tx.schedule.update({
            where: { id: scheduleId },
            data: {
              waitlist_count: {
                increment: 1,
              },
            },
          });

          return {
            booking: waitlistBooking,
            waitlist_position: waitlistPosition,
          };
        },
        {
          isolationLevel: 'Serializable', // Highest isolation to prevent race conditions
          timeout: 30000, // 30 seconds timeout
        }
      );

      const { booking: waitlistBooking, waitlist_position: waitlistPosition } = result;

      // Send notification to member (outside transaction to avoid blocking)
      try {
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
      } catch (notifError) {
        console.error('Failed to send waitlist notification:', notifError);
        // Don't fail the whole operation if notification fails
      }

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
   * Notify waitlist members when slots become available
   * Sends notification to all waitlist members so they can pay to join
   * @param {string} scheduleId - Schedule ID
   * @param {number} availableSlots - Number of available slots
   * @returns {Object} Notification result
   */
  async notifyWaitlistMembersAvailability(scheduleId, availableSlots = 1) {
    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          gym_class: true,
          trainer: true,
          room: true,
        },
      });

      if (!schedule) {
        return { success: false, message: 'Schedule not found' };
      }

      // Get all waitlist members
      const waitlistMembers = await prisma.booking.findMany({
        where: {
          schedule_id: scheduleId,
          is_waitlist: true,
          status: 'CONFIRMED',
        },
        orderBy: {
          waitlist_position: 'asc',
        },
      });

      if (waitlistMembers.length === 0) {
        return { success: true, notified: 0, message: 'No waitlist members to notify' };
      }

      // Notify up to availableSlots number of waitlist members
      const membersToNotify = waitlistMembers.slice(0, availableSlots);
      const notificationService = require('./notification.service.js');
      const memberService = require('./member.service.js');

      let notifiedCount = 0;
      const notificationPromises = membersToNotify.map(async booking => {
        try {
          const member = await memberService.getMemberById(booking.member_id);
          if (member?.user_id) {
            await notificationService.sendNotification({
              user_id: member.user_id,
              type: 'WAITLIST_PROMOTED',
              title: 'Có slot trống! Thanh toán để tham gia lớp',
              message: `Lớp ${
                schedule.gym_class?.name || 'Lớp học'
              } có slot trống. Vui lòng thanh toán để được tham gia lớp.`,
              data: {
                booking_id: booking.id,
                schedule_id: scheduleId,
                class_name: schedule.gym_class?.name || 'Lớp học',
                start_time: schedule.start_time,
                available_slots: availableSlots,
                waitlist_position: booking.waitlist_position,
                requires_payment: true,
              },
              channels: ['IN_APP', 'PUSH'],
            });
            notifiedCount++;
          }
        } catch (error) {
          console.error(`[ERROR] Failed to notify waitlist member ${booking.member_id}:`, error);
        }
      });

      await Promise.all(notificationPromises);

      console.log(
        `[WAITLIST] Notified ${notifiedCount} waitlist members about availability for schedule ${scheduleId}`
      );

      return {
        success: true,
        notified: notifiedCount,
        total_waitlist: waitlistMembers.length,
        available_slots: availableSlots,
        message: `Notified ${notifiedCount} waitlist members`,
      };
    } catch (error) {
      console.error('[ERROR] Failed to notify waitlist members:', error);
      throw error;
    }
  }

  /**
   * Promote member from waitlist when space becomes available
   * TC-WAITLIST-001: Use transaction to prevent race condition and overbooking
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Promoted booking or null if no one in waitlist
   */
  async promoteFromWaitlist(scheduleId) {
    try {
      // TC-WAITLIST-001: Use transaction to prevent race condition
      const result = await prisma.$transaction(
        async tx => {
          // Lock schedule và check capacity atomically
          const schedule = await tx.schedule.findUnique({
            where: { id: scheduleId },
            select: {
              id: true,
              current_bookings: true,
              max_capacity: true,
              status: true,
            },
          });

          if (!schedule) {
            return null; // Schedule not found
          }

          if (schedule.current_bookings >= schedule.max_capacity) {
            return null; // Schedule is still full
          }

          // Get next in waitlist (with lock)
          const nextInWaitlist = await tx.booking.findFirst({
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

          // Promote atomically
          const promotedBooking = await tx.booking.update({
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

          // Update schedule counts atomically
          await tx.schedule.update({
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

          return { promotedBooking };
        },
        {
          isolationLevel: 'Serializable', // Highest isolation to prevent race conditions
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (!result || !result.promotedBooking) {
        return null; // No one to promote or schedule full
      }

      const { promotedBooking } = result;

      // Update waitlist positions for remaining members (outside transaction)
      await this.updateWaitlistPositions(scheduleId);

      // Create payment if booking has price > 0 and payment doesn't exist yet
      const bookingPrice = parseFloat(
        promotedBooking.schedule.price_override || promotedBooking.schedule.gym_class?.price || 0
      );

      if (bookingPrice > 0 && promotedBooking.payment_status === 'PENDING') {
        try {
          // Check if payment already exists
          const existingPaymentResponse = await axios.get(
            `${BILLING_SERVICE_URL}/payments?reference_id=${promotedBooking.id}&payment_type=CLASS_BOOKING`,
            {
              timeout: 10000,
            }
          );

          const hasExistingPayment =
            existingPaymentResponse.data?.success && existingPaymentResponse.data?.data?.length > 0;

          if (!hasExistingPayment) {
            // Create payment for promoted waitlist booking
            const paymentRequestData = {
              member_id: promotedBooking.member_id,
              amount: bookingPrice,
              payment_method: 'BANK_TRANSFER',
              payment_type: 'CLASS_BOOKING',
              reference_id: promotedBooking.id,
              description: `Thanh toán đặt lớp (từ waitlist): ${
                promotedBooking.schedule.gym_class?.name || 'Lớp học'
              }`,
            };

            console.log('💰 Creating payment for promoted waitlist booking:', {
              booking_id: promotedBooking.id,
              member_id: promotedBooking.member_id,
              amount: bookingPrice,
              payment_type: 'CLASS_BOOKING',
              reference_id: promotedBooking.id,
            });

            const paymentResponse = await axios.post(
              `${BILLING_SERVICE_URL}/payments/initiate`,
              paymentRequestData,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
                timeout: 10000,
              }
            );

            if (paymentResponse.data?.success && paymentResponse.data?.data?.payment) {
              const payment = paymentResponse.data.data.payment;
              console.log('[SUCCESS] Payment created for promoted waitlist booking:', {
                paymentId: payment.id,
                bookingId: promotedBooking.id,
                amount: payment.amount,
              });
            } else {
              console.warn(
                '[WARNING] Failed to create payment for promoted waitlist booking, but promotion succeeded'
              );
            }
          } else {
            console.log(
              '[INFO] Payment already exists for promoted waitlist booking, skipping creation'
            );
          }
        } catch (paymentError) {
          // Don't fail promotion if payment creation fails
          console.error(
            '[ERROR] Failed to create payment for promoted waitlist booking:',
            paymentError.message
          );
          console.warn(
            '[WARNING] Booking promoted but payment creation failed. Payment can be created later via initiateWaitlistPayment.'
          );
        }
      }

      // IMPROVEMENT: Send waitlist auto-promote notification using booking improvements service
      try {
        const bookingImprovementsService = require('./booking-improvements.service.js');
        await bookingImprovementsService.sendWaitlistPromoteNotification(
          promotedBooking,
          promotedBooking.schedule
        );
      } catch (notifError) {
        console.error('[ERROR] Failed to send waitlist promotion notification:', notifError);
        // Don't fail the whole operation if notification fails
      }

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
   * TC-BOOK-007: Use transaction to ensure atomic position updates
   * @param {string} scheduleId - Schedule ID
   */
  async updateWaitlistPositions(scheduleId) {
    try {
      // Use transaction to ensure all positions are updated atomically
      await prisma.$transaction(
        async tx => {
          const waitlistMembers = await tx.booking.findMany({
            where: {
              schedule_id: scheduleId,
              is_waitlist: true,
              status: 'CONFIRMED',
            },
            orderBy: {
              created_at: 'asc', // First come, first served
            },
          });

          // Update positions atomically
          for (let i = 0; i < waitlistMembers.length; i++) {
            await tx.booking.update({
              where: { id: waitlistMembers[i].id },
              data: {
                waitlist_position: i + 1,
              },
            });
          }
        },
        {
          isolationLevel: 'Serializable',
          timeout: 30000,
        }
      );
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
      let scheduleId;

      // TC-BOOK-007: Use transaction to ensure atomic removal and position update
      await prisma.$transaction(
        async tx => {
          const booking = await tx.booking.findUnique({
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

          scheduleId = booking.schedule_id; // Store for later use

          // Delete the waitlist booking
          await tx.booking.delete({
            where: { id: bookingId },
          });

          // Update schedule waitlist count
          await tx.schedule.update({
            where: { id: booking.schedule_id },
            data: {
              waitlist_count: {
                decrement: 1,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
          timeout: 30000,
        }
      );

      // Update positions for remaining waitlist members (after transaction)
      if (scheduleId) {
        await this.updateWaitlistPositions(scheduleId);
      }

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
