const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');
const waitlistService = require('../services/waitlist.service.js');
const axios = require('axios');

if (!process.env.BILLING_SERVICE_URL) {
  throw new Error(
    'BILLING_SERVICE_URL environment variable is required. Please set it in your .env file.'
  );
}
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL;

const toMemberMap = members =>
  members.reduce((acc, member) => {
    if (member?.user_id) {
      acc[member.user_id] = member;
    }
    if (member?.id) {
      acc[member.id] = member;
    }
    return acc;
  }, {});

const attachMemberDetails = async (bookings, { strict = false } = {}) => {
  const memberIds = [...new Set(bookings.map(booking => booking.member_id).filter(Boolean))];

  if (memberIds.length === 0) {
    return bookings.map(booking => ({ ...booking, member: null }));
  }

  try {
    const members = await memberService.getMembersByIds(memberIds);
    const memberMap = toMemberMap(members);

    return bookings.map(booking => ({
      ...booking,
      member: memberMap[booking.member_id] || null,
    }));
  } catch (error) {
    console.error('BookingController:attachMemberDetails error:', error.message);

    if (strict) {
      throw error;
    }

    return bookings.map(booking => ({ ...booking, member: null }));
  }
};

class BookingController {
  async getAllBookings(req, res) {
    try {
      const { member_id } = req.query; // Filter by member if provided

      const whereClause = member_id ? { member_id } : {};

      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
        orderBy: { booked_at: 'desc' },
      });

      const bookingsWithMembers = await attachMemberDetails(bookings);

      res.json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: { bookings: bookingsWithMembers },
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
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

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      const [bookingWithMember] = await attachMemberDetails([booking]);

      res.json({
        success: true,
        message: 'Booking retrieved successfully',
        data: { booking: bookingWithMember },
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async createBooking(req, res) {
    try {
      const { schedule_id, member_id, special_needs, notes } = req.body;

      if (!schedule_id || !member_id) {
        return res.status(400).json({
          success: false,
          message: 'schedule_id và member_id là bắt buộc',
          data: null,
        });
      }

      // Check if schedule exists and has capacity
      const schedule = await prisma.schedule.findUnique({
        where: { id: schedule_id },
      });

      // Step 1: Validate member existence FIRST
      // member_id from request must be Member.id (not user_id)
      // Schema: Booking.member_id references Member.id
      let member;
      try {
        member = await memberService.getMemberById(member_id);
      } catch (memberError) {
        console.error('Create booking member lookup error:', memberError.message);
        return res.status(503).json({
          success: false,
          message: 'Không thể xác minh thông tin hội viên, vui lòng thử lại sau',
          data: null,
        });
      }

      // Member must exist before booking can be created
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member không tồn tại. Vui lòng đăng ký thành viên trước khi đặt lịch.',
          data: null,
        });
      }

      // Use member.id (which should match the request member_id)
      // Schema: Booking.member_id references Member.id
      const actualMemberId = member.id;

      // Step 2: Validate schedule
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found',
          data: null,
        });
      }

      if (!['SCHEDULED', 'IN_PROGRESS'].includes((schedule.status || '').toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch không còn hoạt động',
          data: null,
        });
      }

      if (new Date(schedule.end_time) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch đã kết thúc',
          data: null,
        });
      }

      // Step 3: Check if member already booked this schedule (using actualMemberId)
      const existingBooking = await prisma.booking.findUnique({
        where: {
          schedule_id_member_id: {
            schedule_id,
            member_id: actualMemberId, // Use actual member_id for unique constraint check
          },
        },
      });

      if (existingBooking) {
        // Check if existing booking is PENDING payment - allow navigation to payment
        if (existingBooking.payment_status === 'PENDING') {
          // Fetch payment info from billing service to get payment details
          let paymentInfo = null;
          let paymentInitiationData = null;

          try {
            // Get payment by reference_id (booking.id) and payment_type
            const paymentResponse = await axios.get(`${BILLING_SERVICE_URL}/payments`, {
              params: {
                reference_id: existingBooking.id,
                payment_type: 'CLASS_BOOKING',
                status: 'PENDING', // Only get PENDING payments
              },
              headers: {
                'Content-Type': 'application/json',
              },
            });

            // Handle different response structures
            let payments = [];
            if (paymentResponse.data?.data && Array.isArray(paymentResponse.data.data)) {
              payments = paymentResponse.data.data;
            } else if (
              paymentResponse.data?.payments &&
              Array.isArray(paymentResponse.data.payments)
            ) {
              payments = paymentResponse.data.payments;
            } else if (Array.isArray(paymentResponse.data)) {
              payments = paymentResponse.data;
            }

            // Get the first PENDING payment (should only be one)
            const pendingPayment =
              payments.find(p => p.status === 'PENDING' && p.reference_id === existingBooking.id) ||
              payments[0];

            if (pendingPayment) {
              paymentInfo = pendingPayment;

              // If payment has bank_transfer relation, use it directly
              let bankTransfer = pendingPayment.bank_transfer;

              // If not included, get bank transfer by payment ID
              if (!bankTransfer && paymentInfo.id) {
                try {
                  const bankTransferResponse = await axios.get(
                    `${BILLING_SERVICE_URL}/bank-transfers/${paymentInfo.id}`,
                    {
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (bankTransferResponse.data?.success && bankTransferResponse.data?.data) {
                    bankTransfer = bankTransferResponse.data.data;
                  }
                } catch (btError) {
                  console.error(
                    'Get bank transfer error:',
                    btError.response?.data || btError.message
                  );
                  // Continue without bank transfer info
                }
              }

              // Format payment initiation data if bank transfer exists
              if (bankTransfer) {
                paymentInitiationData = {
                  payment_id: paymentInfo.id,
                  bank_transfer_id: bankTransfer.id,
                  amount: parseFloat(paymentInfo.amount),
                  qr_code_data_url: bankTransfer.qr_code_url || '',
                  gatewayData: {
                    bankTransferId: bankTransfer.id,
                    qrCodeDataURL: bankTransfer.qr_code_url || '',
                    bankInfo: {
                      bank_name: bankTransfer.bank_name,
                      account_number: bankTransfer.account_number,
                      account_name: bankTransfer.account_name,
                      transfer_content: bankTransfer.transfer_content,
                      amount: parseFloat(bankTransfer.amount),
                    },
                  },
                };
              }
            }
          } catch (paymentError) {
            console.error(
              'Get payment error:',
              paymentError.response?.data || paymentError.message
            );
            // Continue without payment info - user can still navigate to payment screen
          }

          // Return the existing booking with payment info so user can continue payment
          const [bookingWithMember] = await attachMemberDetails([existingBooking], {
            strict: false,
          });
          if (bookingWithMember && member) {
            bookingWithMember.member = member;
          }

          return res.status(200).json({
            success: true,
            message: 'Bạn đã có booking đang chờ thanh toán cho lớp học này',
            data: {
              booking: bookingWithMember,
              payment: paymentInfo,
              paymentRequired: true,
              paymentInitiation: paymentInitiationData,
              existingBooking: true,
            },
          });
        }

        // If booking is already paid/confirmed, return error
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đặt lịch này rồi',
          data: null,
        });
      }

      // Step 4: Check capacity and handle waitlist (using actualMemberId)
      if (schedule.current_bookings >= schedule.max_capacity) {
        try {
          const waitlistResult = await waitlistService.addToWaitlist(
            schedule_id,
            actualMemberId, // Use actual member_id
            special_needs,
            notes
          );

          const [bookingWithMember] = await attachMemberDetails([waitlistResult.booking], {
            strict: false,
          });

          if (bookingWithMember && member) {
            bookingWithMember.member = member;
          }

          return res.status(201).json({
            success: true,
            message: `Lớp học đã đầy. Bạn đã được thêm vào danh sách chờ ở vị trí ${waitlistResult.waitlist_position}`,
            data: {
              booking: bookingWithMember,
              waitlist_position: waitlistResult.waitlist_position,
              is_waitlist: true,
            },
          });
        } catch (waitlistError) {
          console.error('Add to waitlist error:', waitlistError);
          return res.status(400).json({
            success: false,
            message: waitlistError.message || 'Không thể thêm vào danh sách chờ',
            data: null,
          });
        }
      }

      // Get schedule with gym_class to calculate price
      const scheduleWithDetails = await prisma.schedule.findUnique({
        where: { id: schedule_id },
        include: {
          gym_class: true,
        },
      });

      // Calculate booking price
      const bookingPrice = parseFloat(
        scheduleWithDetails.price_override || scheduleWithDetails.gym_class?.price || 0
      );

      // 🔒 Use transaction to prevent race conditions
      // Lock schedule, check capacity, and create booking atomically
      let booking;
      // Acquire distributed lock for this schedule
      const lockKey = `booking:${schedule_id}`;
      let lockAcquired = false;
      let lockId = null;

      if (distributedLock) {
        const lockResult = await distributedLock.acquire('booking', schedule_id, {
          ttl: 30, // 30 seconds
          retryAttempts: 3,
          retryDelay: 100,
        });

        if (!lockResult.acquired) {
          return res.status(409).json({
            success: false,
            message: 'Booking đang được xử lý, vui lòng thử lại sau',
            data: null,
          });
        }

        lockAcquired = true;
        lockId = lockResult.lockId;
      }

      try {
        booking = await prisma.$transaction(async tx => {
          // 1. Lock schedule row (using findUnique with select for row-level lock)
          const lockedSchedule = await tx.schedule.findUnique({
            where: { id: schedule_id },
            select: {
              id: true,
              current_bookings: true,
              max_capacity: true,
              status: true,
              end_time: true,
            },
          });

          if (!lockedSchedule) {
            throw new Error('SCHEDULE_NOT_FOUND');
          }

          // 2. Check capacity again in transaction (with lock)
          const confirmedBookingsCount = await tx.booking.count({
            where: {
              schedule_id,
              status: 'CONFIRMED',
              payment_status: { in: ['PAID', 'PENDING'] }, // Count both paid and pending
            },
          });

          // Also check waitlist count
          const waitlistCount = await tx.booking.count({
            where: {
              schedule_id,
              is_waitlist: true,
              status: 'CONFIRMED',
            },
          });

          const totalBookings = confirmedBookingsCount + waitlistCount;

          // Check if full (including waitlist)
          if (totalBookings >= lockedSchedule.max_capacity) {
            throw new Error('FULL');
          }

          // 3. Create booking (with PENDING payment status if price > 0)
          const newBooking = await tx.booking.create({
            data: {
              schedule_id,
              member_id: actualMemberId,
              special_needs,
              notes,
              payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
              amount_paid: bookingPrice > 0 ? null : 0,
              is_waitlist: false, // Not waitlist since we checked capacity
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

          // 4. If booking is free, update schedule capacity immediately
          if (bookingPrice === 0) {
            await tx.schedule.update({
              where: { id: schedule_id },
              data: {
                current_bookings: {
                  increment: 1,
                },
              },
            });
          }

          return newBooking;
        });

        // Release lock after successful transaction
        if (lockAcquired && distributedLock && lockId) {
          await distributedLock.release('booking', schedule_id, lockId);
        }
      } catch (txError) {
        // Release lock on error
        if (lockAcquired && distributedLock && lockId) {
          await distributedLock.release('booking', schedule_id, lockId);
        }

        // Handle transaction errors
        if (txError.message === 'SCHEDULE_NOT_FOUND') {
          return res.status(404).json({
            success: false,
            message: 'Schedule not found',
            data: null,
          });
        }

        if (txError.message === 'FULL') {
          // Try waitlist
          try {
            const waitlistResult = await waitlistService.addToWaitlist(
              schedule_id,
              actualMemberId,
              special_needs,
              notes
            );

            const [bookingWithMember] = await attachMemberDetails([waitlistResult.booking], {
              strict: false,
            });

            if (bookingWithMember && member) {
              bookingWithMember.member = member;
            }

            return res.status(201).json({
              success: true,
              message: `Lớp học đã đầy. Bạn đã được thêm vào danh sách chờ ở vị trí ${waitlistResult.waitlist_position}`,
              data: {
                booking: bookingWithMember,
                waitlist_position: waitlistResult.waitlist_position,
                is_waitlist: true,
              },
            });
          } catch (waitlistError) {
            console.error('Add to waitlist error:', waitlistError);
            return res.status(400).json({
              success: false,
              message:
                waitlistError.message || 'Lớp học đã đầy và không thể thêm vào danh sách chờ',
              data: null,
            });
          }
        }

        // Re-throw to be caught by outer catch
        throw txError;
      }

      // Reload booking with full details after transaction
      booking = await prisma.booking.findUnique({
        where: { id: booking.id },
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

      // If booking is free (price === 0), return immediately
      if (bookingPrice === 0) {
        const [bookingWithMember] = await attachMemberDetails([booking], { strict: false });

        if (bookingWithMember && member) {
          bookingWithMember.member = member;
        }
        // Notify trainer via socket and create notification if trainer exists
        if (booking.schedule?.trainer?.user_id && global.io) {
          const notificationService = require('../services/notification.service.js');

          // Create notification in database
          try {
            await notificationService.sendNotification({
              user_id: booking.schedule.trainer.user_id,
              type: 'CLASS_BOOKING',
              title: 'Đặt lớp mới',
              message: `${member?.full_name || 'Thành viên'} đã đặt lớp ${
                booking.schedule.gym_class?.name || 'Lớp học'
              }`,
              data: {
                booking_id: booking.id,
                schedule_id: schedule_id,
                class_name: booking.schedule.gym_class?.name || 'Lớp học',
                member_name: member?.full_name || 'Thành viên',
                member_id: member?.id,
                booked_at: booking.booked_at,
                role: 'MEMBER', // Add role to identify notification source
              },
            });
          } catch (notifError) {
            console.error('Error creating booking notification:', notifError);
          }

          // Emit socket event
          const socketPayload = {
            booking_id: booking.id,
            schedule_id: schedule_id,
            class_name: booking.schedule.gym_class?.name || 'Lớp học',
            member_name: member?.full_name || 'Thành viên',
            booked_at: booking.booked_at,
            payment_status: 'PAID', // Free booking is auto-paid
            current_bookings: booking.schedule.current_bookings + 1,
            max_capacity: booking.schedule.max_capacity,
          };

          console.log(
            `[EMIT] Emitting booking:new to trainer user:${booking.schedule.trainer.user_id}`,
            socketPayload
          );
          global.io
            .to(`user:${booking.schedule.trainer.user_id}`)
            .emit('booking:new', socketPayload);
          console.log(
            `[SUCCESS] Socket event booking:new emitted successfully to trainer (free booking)`
          );
        } else {
          if (!booking.schedule?.trainer?.user_id) {
            console.log('[WARNING] No trainer user_id found for booking notification');
          }
          if (!global.io) {
            console.log('[WARNING] Socket.io not available for booking notification');
          }
        }

        return res.status(201).json({
          success: true,
          message: 'Booking created successfully',
          data: { booking: bookingWithMember },
        });
      }

      // If booking requires payment, create payment record via billing service
      let payment = null;
      let paymentInitiationData = null;
      try {
        // Create payment via billing service
        const paymentRequestData = {
          member_id: actualMemberId, // Use actual member_id for payment
          amount: bookingPrice,
          payment_method: 'BANK_TRANSFER', // Default to bank transfer (Sepay)
          payment_type: 'CLASS_BOOKING',
          reference_id: booking.id, // Link payment to booking
          description: `Thanh toán đặt lớp: ${scheduleWithDetails.gym_class?.name || 'Lớp học'}`,
        };

        console.log('💰 Creating payment for booking:', {
          booking_id: booking.id,
          member_id: actualMemberId,
          amount: bookingPrice,
          payment_type: 'CLASS_BOOKING',
          reference_id: booking.id,
        });

        const paymentResponse = await axios.post(
          `${BILLING_SERVICE_URL}/payments/initiate`,
          paymentRequestData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('💰 Payment creation response:', {
          success: paymentResponse.data?.success,
          hasPayment: !!paymentResponse.data?.data?.payment,
          paymentId: paymentResponse.data?.data?.payment?.id,
          paymentType: paymentResponse.data?.data?.payment?.payment_type,
          referenceId: paymentResponse.data?.data?.payment?.reference_id,
        });

        if (paymentResponse.data?.success && paymentResponse.data?.data) {
          payment = paymentResponse.data.data.payment;
          paymentInitiationData = paymentResponse.data.data;

          console.log('[SUCCESS] Payment created successfully:', {
            paymentId: payment.id,
            paymentType: payment.payment_type,
            referenceId: payment.reference_id,
            bookingId: booking.id,
          });
        }
      } catch (paymentError) {
        console.error('Create payment error:', paymentError.response?.data || paymentError.message);
        // If payment creation fails, delete booking and return error
        await prisma.booking.delete({ where: { id: booking.id } });
        return res.status(500).json({
          success: false,
          message: 'Không thể tạo thanh toán. Vui lòng thử lại.',
          data: null,
        });
      }

      const [bookingWithMember] = await attachMemberDetails([booking], { strict: false });

      if (bookingWithMember && member) {
        bookingWithMember.member = member;
      }

      // Publish booking:created event via Redis Pub/Sub
      try {
        const { redisPubSub } = require('../../../packages/shared-utils/src/redis-pubsub.utils');
        await redisPubSub.publish('booking:created', {
          booking_id: booking.id,
          schedule_id: schedule_id,
          member_id: member?.id,
          member_name: member?.full_name,
          class_id: booking.schedule?.gym_class?.id,
          class_name: booking.schedule?.gym_class?.name,
          trainer_id: booking.schedule?.trainer?.id,
          trainer_user_id: booking.schedule?.trainer?.user_id,
          status: booking.status,
          payment_status: booking.payment_status,
          amount_paid: booking.amount_paid?.toString(),
          booked_at: booking.booked_at.toISOString(),
          timestamp: new Date().toISOString(),
        });
      } catch (pubSubError) {
        console.warn(
          '[WARNING] Failed to publish booking:created event via Pub/Sub:',
          pubSubError.message
        );
        // Don't fail booking creation if Pub/Sub fails
      }

      // Notify trainer via socket and create notification when booking is created (pending payment)
      // Trainer will get another notification when payment is confirmed
      if (booking.schedule?.trainer?.user_id && global.io) {
        const notificationService = require('../services/notification.service.js');

        // Create notification in database with push notification
        try {
          await notificationService.sendNotification({
            user_id: booking.schedule.trainer.user_id,
            type: 'CLASS_BOOKING',
            title: 'Đặt lớp mới',
            message: `${member?.full_name || 'Thành viên'} đã đặt lớp ${
              booking.schedule.gym_class?.name || 'Lớp học'
            }${bookingPrice > 0 ? ' - Đang chờ thanh toán' : ''}`,
            data: {
              booking_id: booking.id,
              schedule_id: schedule_id,
              class_name: booking.schedule.gym_class?.name || 'Lớp học',
              member_name: member?.full_name || 'Thành viên',
              member_id: member?.id,
              booked_at: booking.booked_at,
              payment_amount: bookingPrice,
              payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
              role: 'MEMBER', // Add role to identify notification source
              channels: ['IN_APP', 'PUSH'], // Ensure both in-app and push notifications
            },
          });
          console.log(
            '[SUCCESS] Notification created for trainer when booking created (pending payment)'
          );
        } catch (notifError) {
          console.error('[ERROR] Error creating booking notification:', notifError);
        }

        // Emit socket event - use same event name as free booking for consistency
        // Trainer will receive booking:new when booking is created, then booking:confirmed when payment succeeds
        const socketPayload = {
          booking_id: booking.id,
          schedule_id: schedule_id,
          class_name: booking.schedule.gym_class?.name || 'Lớp học',
          member_name: member?.full_name || 'Thành viên',
          booked_at: booking.booked_at,
          payment_amount: bookingPrice,
          payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
          current_bookings: schedule.current_bookings, // Current count before increment (will be updated after payment)
          max_capacity: schedule.max_capacity,
        };

        console.log(
          `[EMIT] Emitting booking:new to trainer user:${booking.schedule.trainer.user_id}`,
          socketPayload
        );
        global.io.to(`user:${booking.schedule.trainer.user_id}`).emit('booking:new', socketPayload);
        // Also emit booking:updated for consistency
        global.io.to(`user:${booking.schedule.trainer.user_id}`).emit('booking:updated', {
          ...socketPayload,
          action: 'new',
          payment_status: 'PENDING',
          status: 'PENDING',
        });
        console.log(
          `[SUCCESS] Socket event booking:new emitted successfully to trainer (pending payment)`
        );
      } else {
        if (!booking.schedule?.trainer?.user_id) {
          console.log('[WARNING] No trainer user_id found for booking notification');
        }
        if (!global.io) {
          console.log('[WARNING] Socket.io not available for booking notification');
        }
      }

      // Return booking with payment information
      res.status(201).json({
        success: true,
        message: 'Booking created successfully. Payment required.',
        data: {
          booking: bookingWithMember,
          payment: payment,
          paymentRequired: true,
          paymentInitiation: paymentInitiationData, // Includes bank transfer QR code info
        },
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Confirm payment for booking (called from billing service webhook)
   * POST /bookings/:id/confirm-payment
   */
  async confirmBookingPayment(req, res) {
    try {
      const { id } = req.params; // booking id
      const { payment_id, amount } = req.body;

      console.log(`[BELL] confirmBookingPayment called for booking: ${id}`, { payment_id, amount });

      if (!payment_id || !amount) {
        console.error('[ERROR] confirmBookingPayment: Missing payment_id or amount');
        return res.status(400).json({
          success: false,
          message: 'payment_id và amount là bắt buộc',
          data: null,
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              trainer: true,
              gym_class: true,
            },
          },
        },
      });

      if (!booking) {
        console.error(`[ERROR] confirmBookingPayment: Booking not found: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      console.log(`[SUCCESS] confirmBookingPayment: Found booking ${id}`, {
        current_payment_status: booking.payment_status,
        booking_amount: booking.amount_paid,
      });

      // Get member info for notification
      let member = null;
      try {
        member = await memberService.getMemberById(booking.member_id);
      } catch (err) {
        // Silent fail - member info not critical for notification
      }

      // Update booking payment status
      console.log(`Updating booking ${id} payment_status from ${booking.payment_status} to PAID`);
      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          payment_status: 'PAID',
          amount_paid: amount,
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

      console.log(
        `[SUCCESS] Booking ${id} payment_status updated to:`,
        updatedBooking.payment_status
      );

      // Update schedule current_bookings (only if not already updated)
      // This handles the case where booking was created with payment pending
      const wasPending = booking.payment_status === 'PENDING';
      if (wasPending) {
        await prisma.schedule.update({
          where: { id: booking.schedule_id },
          data: {
            current_bookings: {
              increment: 1,
            },
          },
        });

        // Get updated schedule with current_bookings count
        const updatedSchedule = await prisma.schedule.findUnique({
          where: { id: booking.schedule_id },
          select: { current_bookings: true, max_capacity: true },
        });

        // Notify trainer via socket and create notification when payment is confirmed
        const trainerUserId = booking.schedule?.trainer?.user_id;
        console.log('Payment confirmed - Trainer user_id:', trainerUserId);
        console.log('Socket available:', !!global.io);

        const notificationService = require('../services/notification.service.js');

        // Notify trainer
        if (trainerUserId && global.io) {
          // Create notification in database
          try {
            console.log(`Creating notification for trainer user_id: ${trainerUserId}`);
            await notificationService.sendNotification({
              user_id: trainerUserId,
              type: 'CLASS_BOOKING',
              title: 'Thanh toán thành công',
              message: `${member?.full_name || 'Thành viên'} đã thanh toán và xác nhận đặt lớp ${
                booking.schedule.gym_class?.name || 'Lớp học'
              }`,
              data: {
                booking_id: updatedBooking.id,
                schedule_id: updatedBooking.schedule_id,
                class_name: updatedBooking.schedule.gym_class?.name || 'Lớp học',
                member_name: member?.full_name || 'Thành viên',
                booked_at: updatedBooking.booked_at,
                payment_amount: amount,
              },
              channels: ['IN_APP', 'PUSH'], // Ensure both in-app and push notifications
            });
            console.log('[SUCCESS] Notification created successfully for payment confirmation');
          } catch (notifError) {
            console.error('[ERROR] Error creating booking confirmation notification:', notifError);
          }

          // Emit socket event to trainer
          const socketPayload = {
            booking_id: updatedBooking.id,
            schedule_id: updatedBooking.schedule_id,
            class_name: updatedBooking.schedule.gym_class?.name || 'Lớp học',
            member_name: member?.full_name || 'Thành viên',
            booked_at: updatedBooking.booked_at,
            current_bookings:
              updatedSchedule?.current_bookings || booking.schedule.current_bookings + 1,
            max_capacity: updatedSchedule?.max_capacity || booking.schedule.max_capacity,
            payment_amount: amount,
          };

          console.log(`Emitting booking:confirmed to user:${trainerUserId}`, socketPayload);
          global.io.to(`user:${trainerUserId}`).emit('booking:confirmed', socketPayload);
          // Also emit booking:updated and booking:status_changed
          global.io.to(`user:${trainerUserId}`).emit('booking:updated', {
            ...socketPayload,
            action: 'confirmed',
            payment_status: 'PAID',
            status: 'CONFIRMED',
          });
          global.io.to(`user:${trainerUserId}`).emit('booking:status_changed', {
            ...socketPayload,
            action: 'status_changed',
            old_status: 'PENDING',
            new_status: 'CONFIRMED',
            payment_status: 'PAID',
          });
          console.log(`[SUCCESS] Socket event booking:confirmed emitted successfully to trainer`);
        } else {
          if (!trainerUserId) {
            console.log('[WARNING] No trainer user_id found for booking payment confirmation');
          }
          if (!global.io) {
            console.log('[WARNING] Socket.io not available for booking payment confirmation');
          }
        }

        // Notify admins about successful payment
        try {
          console.log('[NOTIFY] Notifying admins about booking payment success...');
          const admins = await notificationService.getAdminsAndSuperAdmins();

          if (admins.length > 0) {
            console.log(`[LIST] Found ${admins.length} admin/super-admin users to notify`);

            // Create notifications for all admins
            const adminNotifications = admins.map(admin => ({
              user_id: admin.user_id,
              type: 'CLASS_BOOKING',
              title: 'Thanh toán lớp học thành công',
              message: `${member?.full_name || 'Thành viên'} đã thanh toán ${new Intl.NumberFormat(
                'vi-VN',
                { style: 'currency', currency: 'VND' }
              ).format(amount)} cho lớp ${booking.schedule.gym_class?.name || 'Lớp học'}`,
              data: {
                booking_id: updatedBooking.id,
                schedule_id: updatedBooking.schedule_id,
                class_name: booking.schedule.gym_class?.name || 'Lớp học',
                member_name: member?.full_name || 'Thành viên',
                member_id: member?.id,
                trainer_name: booking.schedule.trainer?.full_name || 'Trainer',
                booked_at: updatedBooking.booked_at,
                payment_amount: amount,
                payment_status: 'PAID',
                role: 'MEMBER', // Role indicates who performed the action
              },
              is_read: false,
              created_at: new Date(),
            }));

            // Save notifications to database and emit socket events
            if (adminNotifications.length > 0) {
              console.log(`💾 Saving ${adminNotifications.length} notifications to database...`);

              // Create notifications in identity service
              const { IDENTITY_SERVICE_URL } = require('../config/serviceUrls.js');
              const axios = require('axios');

              const createdNotifications = [];
              for (const notificationData of adminNotifications) {
                try {
                  const response = await axios.post(
                    `${IDENTITY_SERVICE_URL}/notifications`,
                    {
                      user_id: notificationData.user_id,
                      type: notificationData.type,
                      title: notificationData.title,
                      message: notificationData.message,
                      data: notificationData.data,
                    },
                    { timeout: 5000 }
                  );
                  if (response.data.success) {
                    createdNotifications.push(response.data.data.notification);
                  }
                } catch (error) {
                  console.error(
                    `[ERROR] Failed to create notification for user ${notificationData.user_id}:`,
                    error.message
                  );
                }
              }

              console.log(
                `[SUCCESS] Created ${createdNotifications.length} notifications in identity service`
              );

              // Emit socket events to all admins
              if (global.io) {
                console.log(
                  `[EMIT] Emitting socket events to ${createdNotifications.length} admin(s)...`
                );
                createdNotifications.forEach(notification => {
                  const roomName = `user:${notification.user_id}`;
                  const socketPayload = {
                    notification_id: notification.id,
                    booking_id: updatedBooking.id,
                    schedule_id: updatedBooking.schedule_id,
                    class_name: booking.schedule.gym_class?.name || 'Lớp học',
                    member_name: member?.full_name || 'Thành viên',
                    payment_amount: amount,
                    payment_status: 'PAID',
                    booked_at: updatedBooking.booked_at,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    created_at: notification.created_at,
                  };

                  global.io.to(roomName).emit('booking:payment:success', socketPayload);
                  console.log(
                    `[SUCCESS] Socket event booking:payment:success emitted to ${roomName}`
                  );
                });
                console.log(`[SUCCESS] All socket events emitted successfully to admins`);
              }
            }
          } else {
            console.log('[WARNING] No admins found to notify');
          }
        } catch (adminNotifError) {
          console.error('[ERROR] Error notifying admins about booking payment:', adminNotifError);
          // Don't fail the request if admin notification fails
        }
      }

      const [bookingWithMember] = await attachMemberDetails([updatedBooking], { strict: false });

      console.log(
        `[SUCCESS] confirmBookingPayment: Successfully confirmed payment for booking ${id}`
      );
      console.log(
        `[SUCCESS] confirmBookingPayment: Final payment_status: ${updatedBooking.payment_status}`
      );

      res.json({
        success: true,
        message: 'Booking payment confirmed successfully',
        data: { booking: bookingWithMember },
      });
    } catch (error) {
      console.error('[ERROR] confirmBookingPayment error:', error);
      console.error('[ERROR] Error stack:', error.stack);
      console.error('[ERROR] Error details:', {
        bookingId: req.params.id,
        payment_id: req.body.payment_id,
        amount: req.body.amount,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      if (booking.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled',
          data: null,
        });
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancellation_reason,
        },
      });

      const [bookingWithMember] = await attachMemberDetails([
        { ...updatedBooking, schedule: booking.schedule },
      ]);

      if (bookingWithMember) {
        bookingWithMember.schedule = booking.schedule;
      }

      // Get schedule with trainer info for notification
      const scheduleWithTrainer = await prisma.schedule.findUnique({
        where: { id: booking.schedule_id },
        include: {
          trainer: true,
          gym_class: true,
        },
      });

      // Update schedule current_bookings
      await prisma.schedule.update({
        where: { id: booking.schedule_id },
        data: {
          current_bookings:
            booking.schedule.current_bookings && booking.schedule.current_bookings > 0
              ? {
                  decrement: 1,
                }
              : undefined,
        },
      });

      // Notify trainer about booking cancellation
      if (scheduleWithTrainer?.trainer?.user_id && global.io) {
        try {
          const member = bookingWithMember?.member || null;
          const memberName = member?.full_name || 'Thành viên';

          const notificationService = require('../services/notification.service.js');
          await notificationService.sendNotification({
            user_id: scheduleWithTrainer.trainer.user_id,
            type: 'CLASS_BOOKING',
            title: 'Hủy đặt lớp',
            message: `${memberName} đã hủy đặt lớp ${
              scheduleWithTrainer.gym_class?.name || 'Lớp học'
            }`,
            data: {
              booking_id: booking.id,
              schedule_id: booking.schedule_id,
              class_name: scheduleWithTrainer.gym_class?.name || 'Lớp học',
              member_name: memberName,
              member_id: booking.member_id,
              cancellation_reason: cancellation_reason || null,
              cancelled_at: updatedBooking.cancelled_at,
              role: 'MEMBER',
            },
            channels: ['IN_APP', 'PUSH'], // Ensure both in-app and push notifications
          });

          // Also emit socket event directly for real-time update
          const socketPayload = {
            booking_id: booking.id,
            schedule_id: booking.schedule_id,
            class_name: scheduleWithTrainer.gym_class?.name || 'Lớp học',
            member_name: memberName,
            member_id: booking.member_id,
            cancelled_at: updatedBooking.cancelled_at,
            cancellation_reason: cancellation_reason || null,
          };

          console.log(
            `[EMIT] Emitting booking:cancelled to trainer user:${scheduleWithTrainer.trainer.user_id}`
          );
          global.io
            .to(`user:${scheduleWithTrainer.trainer.user_id}`)
            .emit('booking:cancelled', socketPayload);
          console.log(`[SUCCESS] Socket event booking:cancelled emitted successfully to trainer`);
        } catch (notifError) {
          console.error('[ERROR] Error notifying trainer about booking cancellation:', notifError);
          // Don't fail the cancellation if notification fails
        }
      }

      // Try to promote someone from waitlist
      let promotedMember = null;
      try {
        const promotionResult = await waitlistService.promoteFromWaitlist(booking.schedule_id);
        if (promotionResult) {
          promotedMember = promotionResult.booking;
        }
      } catch (promotionError) {
        console.error('Auto-promote from waitlist error:', promotionError);
        // Don't fail the cancellation if promotion fails
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          booking: bookingWithMember || updatedBooking,
          promoted_member: promotedMember
            ? {
                member_id: promotedMember.member_id,
                message: 'Member promoted from waitlist',
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  async getScheduleBookings(req, res) {
    try {
      const { id } = req.params;

      const bookings = await prisma.booking.findMany({
        where: { schedule_id: id },
        include: {
          schedule: {
            include: {
              gym_class: true,
              trainer: true,
              room: true,
            },
          },
        },
        orderBy: { booked_at: 'desc' },
      });

      const bookingsWithMembers = await attachMemberDetails(bookings);

      res.json({
        success: true,
        message: 'Schedule bookings retrieved successfully',
        data: { bookings: bookingsWithMembers },
      });
    } catch (error) {
      console.error('Get schedule bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get waitlist for a specific schedule
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getWaitlistBySchedule(req, res) {
    try {
      const { schedule_id } = req.params;

      const waitlist = await waitlistService.getWaitlistBySchedule(schedule_id);
      const waitlistWithMembers = await attachMemberDetails(waitlist);

      res.json({
        success: true,
        message: 'Waitlist retrieved successfully',
        data: { waitlist: waitlistWithMembers },
      });
    } catch (error) {
      console.error('Get waitlist by schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Remove member from waitlist
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeFromWaitlist(req, res) {
    try {
      const { id } = req.params;

      const result = await waitlistService.removeFromWaitlist(id);

      res.json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (error) {
      console.error('Remove from waitlist error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Manually promote member from waitlist (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async promoteFromWaitlist(req, res) {
    try {
      const { id } = req.params; // booking id

      // First check if this is a waitlist booking
      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      if (!booking.is_waitlist) {
        return res.status(400).json({
          success: false,
          message: 'Booking is not in waitlist',
          data: null,
        });
      }

      // Check if schedule has capacity
      const hasCapacity = await waitlistService.hasCapacity(booking.schedule_id);
      if (!hasCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Schedule is still at full capacity',
          data: null,
        });
      }

      // Promote the specific member
      const result = await waitlistService.promoteFromWaitlist(booking.schedule_id);

      if (!result) {
        return res.status(400).json({
          success: false,
          message: 'No one available to promote from waitlist',
          data: null,
        });
      }

      res.json({
        success: true,
        message: result.message,
        data: { booking: result.booking },
      });
    } catch (error) {
      console.error('Promote from waitlist error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
        data: null,
      });
    }
  }

  /**
   * Get member booking history with filters and pagination
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMemberBookings(req, res) {
    try {
      const { member_id } = req.params;
      const { status, from, to, page = 1, limit = 10, include_waitlist = false } = req.query;

      // Build where clause
      const whereClause = { member_id };

      if (status) {
        whereClause.status = status;
      }

      if (from || to) {
        whereClause.schedule = {
          date: {},
        };
        if (from) {
          whereClause.schedule.date.gte = new Date(from);
        }
        if (to) {
          whereClause.schedule.date.lte = new Date(to);
        }
      }

      if (include_waitlist === 'false') {
        whereClause.is_waitlist = false;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [bookings, totalCount] = await Promise.all([
        prisma.booking.findMany({
          where: whereClause,
          include: {
            schedule: {
              include: {
                gym_class: true,
                trainer: true,
                room: true,
              },
            },
          },
          orderBy: { booked_at: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.booking.count({ where: whereClause }),
      ]);

      // Attach member details (don't fail if member service is unavailable)
      let bookingsWithMembers;
      try {
        bookingsWithMembers = await attachMemberDetails(bookings, { strict: false });
      } catch (memberError) {
        console.warn(
          '[WARNING] Failed to attach member details (non-critical):',
          memberError.message
        );
        // Return bookings without member details rather than failing
        bookingsWithMembers = bookings.map(booking => ({ ...booking, member: null }));
      }

      res.json({
        success: true,
        message: 'Member bookings retrieved successfully',
        data: {
          bookings: bookingsWithMembers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get member bookings error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
        data: null,
      });
    }
  }
}

module.exports = new BookingController();
