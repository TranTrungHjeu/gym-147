const { prisma } = require('../lib/prisma.js');
const memberService = require('../services/member.service.js');
const waitlistService = require('../services/waitlist.service.js');
const axios = require('axios');

// Import distributed lock utility
let distributedLock = null;
try {
  distributedLock =
    require('../../../../packages/shared-utils/dist/redis-lock.utils.js').distributedLock;
} catch (e) {
  try {
    distributedLock =
      require('../../../../packages/shared-utils/src/redis-lock.utils.ts').distributedLock;
  } catch (e2) {
    console.warn(
      '[WARNING] Distributed lock utility not available, booking operations will use database transactions only'
    );
  }
}

// BILLING_SERVICE_URL with fallback for Docker environment
const BILLING_SERVICE_URL =
  process.env.BILLING_SERVICE_URL ||
  (process.env.DOCKER_ENV === 'true' ? 'http://billing:3004' : 'http://localhost:3004');

if (!BILLING_SERVICE_URL) {
  throw new Error(
    'BILLING_SERVICE_URL environment variable is required. Please set it in your .env file.'
  );
}

console.log('[INFO] BILLING_SERVICE_URL:', BILLING_SERVICE_URL);

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

// Helper function to add date field to schedule (computed from start_time)
const addScheduleDate = schedule => {
  if (!schedule || !schedule.start_time) {
    return schedule;
  }
  const startTime = new Date(schedule.start_time);
  const date = startTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  return {
    ...schedule,
    date: date,
  };
};

// Helper function to add date field to schedules in bookings
const addScheduleDateToBookings = bookings => {
  return bookings.map(booking => ({
    ...booking,
    schedule: booking.schedule ? addScheduleDate(booking.schedule) : null,
  }));
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
      const bookingsWithScheduleDate = addScheduleDateToBookings(bookingsWithMembers);

      res.json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: { bookings: bookingsWithScheduleDate },
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
      const bookingWithScheduleDate = bookingWithMember.schedule
        ? { ...bookingWithMember, schedule: addScheduleDate(bookingWithMember.schedule) }
        : bookingWithMember;

      res.json({
        success: true,
        message: 'Booking retrieved successfully',
        data: { booking: bookingWithScheduleDate },
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
      // TC-EDGE-004: Normalize empty strings to null
      const normalizeEmptyString = value => {
        if (value === '' || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        return value;
      };

      let { schedule_id, member_id, special_needs, notes } = req.body;

      // Log request for debugging
      console.log('[BOOKING] createBooking request:', {
        schedule_id,
        member_id,
        hasSpecialNeeds: !!special_needs,
        hasNotes: !!notes,
        bodyKeys: Object.keys(req.body),
      });

      // Normalize empty strings to null
      special_needs = normalizeEmptyString(special_needs);
      notes = normalizeEmptyString(notes);

      if (!schedule_id || !member_id) {
        console.error('[BOOKING] Validation failed - missing required fields:', {
          schedule_id: !!schedule_id,
          member_id: !!member_id,
        });
        return res.status(400).json({
          success: false,
          message: 'schedule_id và member_id là bắt buộc',
          errorCode: 'MISSING_REQUIRED_FIELDS',
          data: {
            missing_fields: {
              schedule_id: !schedule_id,
              member_id: !member_id,
            },
          },
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
          message: 'Member không tồn tại. Vui lòng đăng ký hội viên trước khi đặt lịch.',
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
          errorCode: 'SCHEDULE_NOT_FOUND',
          data: null,
        });
      }

      // TC-BOOK-008: Check if schedule is CANCELLED (including auto-cancelled)
      if (schedule.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Lớp học đã bị hủy. Vui lòng chọn lớp học khác.',
          errorCode: 'SCHEDULE_CANCELLED',
          data: {
            schedule_id: schedule_id,
            cancellation_reason: schedule.special_notes?.includes('[Auto-cancelled]')
              ? 'Lớp học đã bị tự động hủy do không đủ số học viên tối thiểu'
              : 'Lớp học đã bị hủy',
          },
        });
      }

      if (!['SCHEDULED', 'IN_PROGRESS'].includes((schedule.status || '').toUpperCase())) {
        console.error('[BOOKING] Schedule not available:', {
          schedule_id,
          status: schedule.status,
        });
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch không còn hoạt động',
          errorCode: 'SCHEDULE_NOT_AVAILABLE',
          data: {
            schedule_id: schedule_id,
            status: schedule.status,
          },
        });
      }

      if (new Date(schedule.end_time) <= new Date()) {
        console.error('[BOOKING] Schedule already ended:', {
          schedule_id,
          end_time: schedule.end_time,
          now: new Date().toISOString(),
        });
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lịch đã kết thúc',
          errorCode: 'SCHEDULE_ALREADY_ENDED',
          data: {
            schedule_id: schedule_id,
            end_time: schedule.end_time,
          },
        });
      }

      // Check booking deadline: Cannot book within 1.5 hours (90 minutes) before class starts
      const now = new Date();
      const startTime = new Date(schedule.start_time);
      const timeUntilStart = startTime.getTime() - now.getTime();
      const deadlineMinutes = 90; // 1.5 hours = 90 minutes
      const deadlineMs = deadlineMinutes * 60 * 1000;

      if (timeUntilStart < deadlineMs && timeUntilStart > 0) {
        const remainingMinutes = Math.ceil(timeUntilStart / (60 * 1000));
        console.error('[BOOKING] Booking deadline passed:', {
          schedule_id,
          start_time: schedule.start_time,
          now: now.toISOString(),
          timeUntilStartMs: timeUntilStart,
          remainingMinutes,
          deadlineMinutes,
        });
        return res.status(400).json({
          success: false,
          message: `Không thể đặt chỗ. Lớp học bắt đầu trong ${remainingMinutes} phút. Vui lòng đăng ký trước ${deadlineMinutes} phút khi lớp học bắt đầu.`,
          errorCode: 'BOOKING_DEADLINE_PASSED',
          data: {
            schedule_id: schedule_id,
            start_time: schedule.start_time,
            remaining_minutes: remainingMinutes,
            deadline_minutes: deadlineMinutes,
          },
        });
      }

      // Also check if class has already started
      if (timeUntilStart <= 0) {
        console.error('[BOOKING] Class already started:', {
          schedule_id,
          start_time: schedule.start_time,
          now: now.toISOString(),
        });
        return res.status(400).json({
          success: false,
          message: 'Không thể đặt chỗ cho lớp học đã bắt đầu',
          errorCode: 'CLASS_ALREADY_STARTED',
          data: {
            schedule_id: schedule_id,
            start_time: schedule.start_time,
          },
        });
      }

      // Step 3: Check if member already booked this schedule (using actualMemberId)
      // Only check for non-cancelled bookings to allow re-booking after cancellation
      const existingBooking = await prisma.booking.findFirst({
        where: {
          schedule_id,
          member_id: actualMemberId,
          status: {
            not: 'CANCELLED', // Allow re-booking if previous booking was cancelled
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
        console.error('[BOOKING] Already booked:', {
          schedule_id,
          member_id: actualMemberId,
          existing_booking_status: existingBooking.status,
          existing_booking_payment_status: existingBooking.payment_status,
        });
        return res.status(400).json({
          success: false,
          message: 'Bạn đã đặt lịch này rồi',
          errorCode: 'ALREADY_BOOKED',
          data: {
            booking_id: existingBooking.id,
            status: existingBooking.status,
            payment_status: existingBooking.payment_status,
          },
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
          console.error('[BOOKING] Add to waitlist error:', {
            schedule_id,
            member_id: actualMemberId,
            error: waitlistError.message,
            stack: waitlistError.stack,
          });
          return res.status(400).json({
            success: false,
            message: waitlistError.message || 'Không thể thêm vào danh sách chờ',
            errorCode: 'WAITLIST_ERROR',
            data: {
              schedule_id,
              member_id: actualMemberId,
            },
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
      let bookingPrice = parseFloat(
        scheduleWithDetails.price_override || scheduleWithDetails.gym_class?.price || 0
      );

      // TC-EDGE-002: Validate booking price >= 0 (prevent negative prices)
      if (isNaN(bookingPrice) || bookingPrice < 0) {
        console.error(
          `[ERROR] Invalid booking price calculated: ${bookingPrice} for schedule ${schedule_id}`
        );
        bookingPrice = 0; // Set to 0 if invalid or negative
      }

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

          // TC-BOOK-008: Double-check schedule status in transaction (may have been cancelled)
          if (lockedSchedule.status === 'CANCELLED') {
            throw new Error('SCHEDULE_CANCELLED');
          }

          if (!['SCHEDULED', 'IN_PROGRESS'].includes(lockedSchedule.status)) {
            throw new Error('SCHEDULE_NOT_AVAILABLE');
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

          // 3. Check if there's a CANCELLED booking for this member and schedule
          // If exists, update it instead of creating new one (to respect unique constraint)
          const cancelledBooking = await tx.booking.findFirst({
            where: {
              schedule_id,
              member_id: actualMemberId,
              status: 'CANCELLED',
            },
          });

          let newBooking;
          if (cancelledBooking) {
            // Update cancelled booking to new booking
            newBooking = await tx.booking.update({
              where: { id: cancelledBooking.id },
              data: {
                status: 'CONFIRMED',
                payment_status: bookingPrice > 0 ? 'PENDING' : 'PAID',
                amount_paid: bookingPrice > 0 ? null : 0,
                is_waitlist: false,
                waitlist_position: null,
                special_needs,
                notes,
                cancelled_at: null,
                cancellation_reason: null,
                booked_at: new Date(), // Update booked_at to current time
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
              `[BOOKING] Updated cancelled booking ${cancelledBooking.id} to new booking`
            );
          } else {
            // Create new booking (with PENDING payment status if price > 0)
            newBooking = await tx.booking.create({
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
          }

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

        // Handle Prisma transaction error (P2028) - transaction not found/timeout
        if (txError.code === 'P2028') {
          console.error(
            '[BOOKING] Transaction error (P2028):',
            txError.message,
            'Schedule ID:',
            schedule_id
          );
          return res.status(500).json({
            success: false,
            message: 'Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.',
            errorCode: 'TRANSACTION_ERROR',
            data: null,
          });
        }

        // Handle Prisma unique constraint error (P2002) - duplicate booking
        if (
          txError.code === 'P2002' &&
          txError.meta?.target?.includes('schedule_id') &&
          txError.meta?.target?.includes('member_id')
        ) {
          // Check if existing booking exists (including cancelled bookings)
          const existingBooking = await prisma.booking.findFirst({
            where: {
              schedule_id,
              member_id: actualMemberId,
            },
            include: {
              schedule: {
                include: {
                  gym_class: true,
                },
              },
            },
          });

          if (existingBooking) {
            // If booking is CANCELLED, this should not happen (we handle it in transaction)
            // But if it does, allow re-booking by updating the cancelled booking
            if (existingBooking.status === 'CANCELLED') {
              console.log(
                `[BOOKING] Found CANCELLED booking ${existingBooking.id}, should have been handled in transaction`
              );
              // This case should be rare - retry the booking
              return res.status(409).json({
                success: false,
                message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
                errorCode: 'DUPLICATE_BOOKING_CANCELLED',
                data: {
                  schedule_id,
                  member_id: actualMemberId,
                },
              });
            }

            // If booking exists with PENDING payment, return it
            if (existingBooking.payment_status === 'PENDING') {
              return res.status(409).json({
                success: false,
                message: 'Bạn đã có booking đang chờ thanh toán cho lớp học này',
                errorCode: 'DUPLICATE_BOOKING',
                data: {
                  booking: existingBooking,
                  schedule_id,
                  member_id: actualMemberId,
                },
              });
            }

            // If booking already exists and is confirmed
            return res.status(409).json({
              success: false,
              message: 'Bạn đã đặt chỗ cho lớp học này rồi',
              errorCode: 'DUPLICATE_BOOKING',
              data: {
                booking_id: existingBooking.id,
                schedule_id,
                member_id: actualMemberId,
                booking_status: existingBooking.status,
                payment_status: existingBooking.payment_status,
              },
            });
          }

          // Generic duplicate error
          return res.status(409).json({
            success: false,
            message: 'Bạn đã đặt chỗ cho lớp học này rồi',
            errorCode: 'DUPLICATE_BOOKING',
            data: {
              schedule_id,
              member_id: actualMemberId,
            },
          });
        }

        // Handle transaction errors
        if (txError.message === 'SCHEDULE_NOT_FOUND') {
          return res.status(404).json({
            success: false,
            message: 'Schedule not found',
            errorCode: 'SCHEDULE_NOT_FOUND',
            data: null,
          });
        }

        // TC-BOOK-008: Handle schedule cancelled error
        if (txError.message === 'SCHEDULE_CANCELLED') {
          const cancelledSchedule = await prisma.schedule.findUnique({
            where: { id: schedule_id },
            select: { special_notes: true },
          });
          return res.status(400).json({
            success: false,
            message: 'Lớp học đã bị hủy. Vui lòng chọn lớp học khác.',
            errorCode: 'SCHEDULE_CANCELLED',
            data: {
              schedule_id: schedule_id,
              cancellation_reason: cancelledSchedule?.special_notes?.includes('[Auto-cancelled]')
                ? 'Lớp học đã bị tự động hủy do không đủ số học viên tối thiểu'
                : 'Lớp học đã bị hủy',
            },
          });
        }

        if (txError.message === 'SCHEDULE_NOT_AVAILABLE') {
          return res.status(400).json({
            success: false,
            message: 'Không thể đặt chỗ cho lịch không còn hoạt động',
            errorCode: 'SCHEDULE_NOT_AVAILABLE',
            data: {
              schedule_id: schedule_id,
            },
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

            // Don't create payment here - payment will be created when member pays after receiving slot notification
            const bookingPrice = parseFloat(
              waitlistResult.booking.schedule.price_override ||
                waitlistResult.booking.schedule.gym_class?.price ||
                0
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
              paymentRequired: bookingPrice > 0,
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
              message: `${member?.full_name || 'Hội viên'} đã đặt lớp ${
                booking.schedule.gym_class?.name || 'Lớp học'
              }`,
              data: {
                booking_id: booking.id,
                schedule_id: schedule_id,
                class_name: booking.schedule.gym_class?.name || 'Lớp học',
                member_name: member?.full_name || 'Hội viên',
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
            member_name: member?.full_name || 'Hội viên',
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

        // Create payment with timeout and proper error handling
        const paymentResponse = await axios.post(
          `${BILLING_SERVICE_URL}/payments/initiate`,
          paymentRequestData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 second timeout (similar to other services)
          }
        );

        console.log('💰 Payment creation response:', {
          success: paymentResponse.data?.success,
          hasPayment: !!paymentResponse.data?.data?.payment,
          paymentId: paymentResponse.data?.data?.payment?.id,
          paymentType: paymentResponse.data?.data?.payment?.payment_type,
          referenceId: paymentResponse.data?.data?.payment?.reference_id,
          fullResponse: paymentResponse.data,
        });

        if (paymentResponse.data?.success && paymentResponse.data?.data) {
          payment = paymentResponse.data.data.payment;
          paymentInitiationData = paymentResponse.data.data;

          console.log('[SUCCESS] Payment created successfully:', {
            paymentId: payment.id,
            paymentType: payment.payment_type,
            referenceId: payment.reference_id,
            bookingId: booking.id,
            memberId: payment.member_id,
            amount: payment.amount,
          });

          // Verify reference_id was saved correctly
          if (!payment.reference_id || payment.reference_id !== booking.id) {
            console.error('[ERROR] Payment reference_id mismatch!', {
              expected: booking.id,
              actual: payment.reference_id,
              paymentId: payment.id,
            });
          }
        }
      } catch (paymentError) {
        const errorCode = paymentError.code || '';
        const errorMessage = (paymentError.message || '').toLowerCase();
        const errorResponse = paymentError.response?.data;

        // Check if error is due to billing service being unavailable (connection/timeout errors)
        const isConnectionError =
          errorCode === 'ECONNREFUSED' ||
          errorCode === 'ETIMEDOUT' ||
          errorCode === 'ENOTFOUND' ||
          errorCode === 'ECONNRESET' ||
          errorCode === 'ETIMEDOUT' ||
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('etimedout') ||
          errorMessage.includes('enotfound') ||
          errorMessage.includes('connection refused') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('network error') ||
          (paymentError.response?.status >= 500 && paymentError.response?.status < 600); // 5xx server errors

        if (isConnectionError) {
          // If billing service is unavailable, allow booking to be created with PENDING payment
          // Payment can be created later when billing service is available
          console.warn(
            '[WARNING] Billing service unavailable. Booking created with PENDING payment status.'
          );
          console.warn('[WARNING] Error details:', {
            code: errorCode,
            message: paymentError.message,
            status: paymentError.response?.status,
            billingServiceUrl: BILLING_SERVICE_URL,
          });
          console.warn('[WARNING] Payment will need to be created manually or retried later.');

          // Update booking payment status to PENDING (already set during creation, but ensure it's correct)
          booking.payment_status = 'PENDING';
          booking.amount_paid = 0;

          // Continue with booking creation - don't delete it
          // Payment can be handled later via webhook or manual retry
        } else {
          // For other payment errors (validation, business logic, 4xx errors, etc.), delete booking
          console.error(
            '[ERROR] Payment creation failed due to business logic error. Rolling back booking.'
          );
          console.error('[ERROR] Error details:', {
            code: errorCode,
            message: paymentError.message,
            status: paymentError.response?.status,
            response: errorResponse,
          });

          await prisma.booking.delete({ where: { id: booking.id } });

          // Return appropriate error message based on error type
          let errorMessage = 'Không thể tạo thanh toán. Vui lòng thử lại.';
          if (errorResponse?.message) {
            errorMessage = errorResponse.message;
          } else if (paymentError.response?.status === 400) {
            errorMessage = 'Dữ liệu thanh toán không hợp lệ. Vui lòng kiểm tra lại.';
          } else if (paymentError.response?.status === 404) {
            errorMessage = 'Không tìm thấy dịch vụ thanh toán. Vui lòng liên hệ quản trị viên.';
          }

          return res.status(paymentError.response?.status || 500).json({
            success: false,
            message: errorMessage,
            error: errorResponse?.error || 'PAYMENT_CREATION_FAILED',
            data: null,
          });
        }
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
            message: `${member?.full_name || 'Hội viên'} đã đặt lớp ${
              booking.schedule.gym_class?.name || 'Lớp học'
            }${bookingPrice > 0 ? ' - Đang chờ thanh toán' : ''}`,
            data: {
              booking_id: booking.id,
              schedule_id: schedule_id,
              class_name: booking.schedule.gym_class?.name || 'Lớp học',
              member_name: member?.full_name || 'Hội viên',
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
          member_name: member?.full_name || 'Hội viên',
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
      // If payment was not created due to billing service being unavailable, inform client
      const paymentUnavailable = !payment && bookingPrice > 0;

      res.status(201).json({
        success: true,
        message: paymentUnavailable
          ? 'Booking created successfully. Payment service is temporarily unavailable. Payment will be processed when service is available.'
          : 'Booking created successfully. Payment required.',
        data: {
          booking: bookingWithMember,
          payment: payment,
          paymentRequired: bookingPrice > 0,
          paymentUnavailable: paymentUnavailable, // Flag to indicate payment service was unavailable
          paymentInitiation: paymentInitiationData, // Includes bank transfer QR code info (null if unavailable)
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
   * Initiate payment for waitlist booking (when slot becomes available)
   * POST /bookings/:id/initiate-payment
   */
  async initiateWaitlistPayment(req, res) {
    try {
      const { id } = req.params;
      const { member_id } = req.body;

      // Get booking with schedule details
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

      // Verify member owns this booking
      if (member_id && booking.member_id !== member_id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to initiate payment for this booking',
          data: null,
        });
      }

      // Check if booking is waitlist and payment is pending
      if (!booking.is_waitlist) {
        return res.status(400).json({
          success: false,
          message: 'This booking is not in waitlist',
          data: null,
        });
      }

      if (booking.payment_status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: `Payment status is ${booking.payment_status}, cannot initiate payment`,
          data: null,
        });
      }

      // Calculate booking price
      const bookingPrice = parseFloat(
        booking.schedule.price_override || booking.schedule.gym_class?.price || 0
      );

      if (bookingPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'This booking is free, no payment required',
          data: null,
        });
      }

      // Check if payment already exists
      try {
        const existingPaymentResponse = await axios.get(
          `${BILLING_SERVICE_URL}/payments?reference_id=${id}&payment_type=CLASS_BOOKING`,
          {
            timeout: 10000,
          }
        );

        if (
          existingPaymentResponse.data?.success &&
          existingPaymentResponse.data?.data?.length > 0
        ) {
          const existingPayment = existingPaymentResponse.data.data[0];
          // If payment exists and is not completed, return it
          if (existingPayment.status !== 'COMPLETED' && existingPayment.status !== 'SUCCESS') {
            // Get payment initiation data
            try {
              const paymentInitiationResponse = await axios.get(
                `${BILLING_SERVICE_URL}/payments/${existingPayment.id}/initiation`,
                {
                  timeout: 10000,
                }
              );

              if (paymentInitiationResponse.data?.success) {
                return res.json({
                  success: true,
                  message: 'Payment already initiated',
                  data: {
                    booking: booking,
                    payment: existingPayment,
                    paymentInitiation: paymentInitiationResponse.data.data,
                    paymentRequired: true,
                  },
                });
              }
            } catch (initError) {
              console.error('[ERROR] Failed to get payment initiation:', initError);
              // Continue to create new payment
            }
          }
        }
      } catch (checkError) {
        console.error('[ERROR] Failed to check existing payment:', checkError);
        // Continue to create new payment
      }

      // Create payment via billing service
      const paymentRequestData = {
        member_id: booking.member_id,
        amount: bookingPrice,
        payment_method: 'BANK_TRANSFER',
        payment_type: 'CLASS_BOOKING',
        reference_id: booking.id,
        description: `Thanh toán đặt lớp (waitlist): ${
          booking.schedule.gym_class?.name || 'Lớp học'
        }`,
      };

      console.log('💰 Initiating payment for waitlist booking:', {
        booking_id: booking.id,
        member_id: booking.member_id,
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
          timeout: 10000,
        }
      );

      if (paymentResponse.data?.success && paymentResponse.data?.data) {
        const payment = paymentResponse.data.data.payment;
        const paymentInitiationData = paymentResponse.data.data;

        console.log('[SUCCESS] Payment initiated for waitlist booking:', {
          paymentId: payment.id,
          bookingId: booking.id,
        });

        // Attach member details to booking
        const [bookingWithMember] = await attachMemberDetails([booking], { strict: false });

        return res.json({
          success: true,
          message: 'Payment initiated successfully',
          data: {
            booking: bookingWithMember || booking,
            payment: payment,
            paymentInitiation: paymentInitiationData,
            paymentRequired: true,
          },
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to initiate payment',
          data: null,
        });
      }
    } catch (error) {
      console.error('[ERROR] initiateWaitlistPayment error:', error);
      console.error('[ERROR] Error details:', {
        bookingId: req.params.id,
        error: error.message,
        response: error.response?.data,
      });

      // Handle connection errors
      const errorCode = error.code || '';
      const errorMessage = (error.message || '').toLowerCase();
      const isConnectionError =
        errorCode === 'ECONNREFUSED' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ENOTFOUND' ||
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('enotfound') ||
        (error.response?.status >= 500 && error.response?.status < 600);

      if (isConnectionError) {
        return res.status(503).json({
          success: false,
          message: 'Payment service is temporarily unavailable. Please try again later.',
          data: null,
        });
      }

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
        if (!member) {
          console.warn(
            `[WARNING] Member not found for booking ${id}, member_id: ${booking.member_id}`
          );
        }
      } catch (err) {
        console.error(`[ERROR] Failed to get member info for booking ${id}:`, err.message);
        // Try to get member name from booking if available
        // Silent fail - member info not critical for notification
      }

      // TC-BOOK-005: Update booking payment status and schedule capacity atomically
      // This handles the case where booking was created with payment pending
      const wasPending = booking.payment_status === 'PENDING';
      const isWaitlistBooking = booking.is_waitlist === true;
      let updatedBooking;
      let updatedSchedule = null;

      if (wasPending) {
        // Use transaction to ensure atomicity of booking update and capacity update
        const result = await prisma.$transaction(
          async tx => {
            // Check if booking is still in waitlist (may have been auto-promoted already)
            // Also check previous payment_status and waitlist history to determine if current_bookings was already incremented
            const currentBooking = await tx.booking.findUnique({
              where: { id },
              select: {
                is_waitlist: true,
                waitlist_position: true,
                payment_status: true, // Check previous payment status
              },
            });

            const stillInWaitlist = currentBooking?.is_waitlist === true;
            const wasPending = currentBooking?.payment_status === 'PENDING';
            // If booking has waitlist_position = null but wasPending, it means:
            // - Either it was created as non-waitlist with pending payment (not counted yet)
            // - Or it was auto-promoted from waitlist (already counted during promotion)
            // We can't distinguish these cases easily, so we use a safer approach:
            // Only increment if booking is still in waitlist OR if it was never in waitlist (waitlist_position is null from creation)

            // If this is a waitlist booking that hasn't been promoted yet, promote it
            const updateData = {
              payment_status: 'PAID',
              amount_paid: amount,
              status: 'CONFIRMED', // Ensure booking status is CONFIRMED when payment is confirmed
            };

            if (stillInWaitlist) {
              // Promote from waitlist: remove waitlist flag and position
              updateData.is_waitlist = false;
              updateData.waitlist_position = null;
            }

            // Update booking payment status and ensure status is CONFIRMED
            const updated = await tx.booking.update({
              where: { id },
              data: updateData,
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

            // Update schedule capacity atomically
            // Increment current_bookings in these cases:
            // 1. Booking was in waitlist and is being promoted now (increment + decrement waitlist_count)
            // 2. Booking was NOT in waitlist (confirmed from start) but payment was pending - now increment when paid
            //
            // Important: When a booking is auto-promoted from waitlist, current_bookings is already incremented
            // during promotion. However, we can't easily distinguish between:
            // - Booking created as non-waitlist with pending payment (not counted yet - NEED to increment)
            // - Booking auto-promoted from waitlist with pending payment (already counted - DON'T increment again)
            //
            // Solution: Check the schedule's current_bookings against confirmed bookings count
            // If they match, booking was likely already counted (from waitlist promotion)
            // If current_bookings < confirmed bookings, we need to increment
            const scheduleUpdateData = {};

            if (stillInWaitlist) {
              // Booking was just promoted from waitlist now, so increment current_bookings and decrement waitlist_count
              scheduleUpdateData.current_bookings = {
                increment: 1,
              };
              scheduleUpdateData.waitlist_count = {
                decrement: 1,
              };
            } else if (wasPending) {
              // Booking was NOT in waitlist (confirmed from start) but payment was pending
              // Check if current_bookings needs to be incremented by comparing with actual confirmed bookings
              const schedule = await tx.schedule.findUnique({
                where: { id: booking.schedule_id },
                select: { current_bookings: true },
              });

              // Count actual confirmed bookings (excluding waitlist and cancelled)
              const confirmedBookingsCount = await tx.booking.count({
                where: {
                  schedule_id: booking.schedule_id,
                  status: 'CONFIRMED',
                  payment_status: { in: ['PAID', 'PENDING'] },
                  is_waitlist: false,
                },
              });

              // If current_bookings is less than actual confirmed bookings, we need to increment
              // This handles the case where booking was created with payment_status='PENDING'
              // and current_bookings was not incremented at creation time
              if (schedule.current_bookings < confirmedBookingsCount) {
                scheduleUpdateData.current_bookings = {
                  increment: 1,
                };
              }
              // If current_bookings >= confirmedBookingsCount, booking was likely already counted
              // (e.g., from waitlist promotion), so don't increment again
            }

            if (Object.keys(scheduleUpdateData).length > 0) {
              await tx.schedule.update({
                where: { id: booking.schedule_id },
                data: scheduleUpdateData,
              });
            }

            // Get updated schedule with current_bookings count
            const schedule = await tx.schedule.findUnique({
              where: { id: booking.schedule_id },
              select: { current_bookings: true, max_capacity: true },
            });

            return { booking: updated, schedule, wasPromoted: stillInWaitlist };
          },
          {
            isolationLevel: 'ReadCommitted', // Sufficient for this case
            timeout: 30000,
          }
        );

        updatedBooking = result.booking;
        updatedSchedule = result.schedule;
        const wasPromotedInThisTransaction = result.wasPromoted;

        // If waitlist booking was promoted in this transaction, update waitlist positions
        if (wasPromotedInThisTransaction) {
          try {
            const waitlistService = require('../services/waitlist.service.js');
            await waitlistService.updateWaitlistPositions(booking.schedule_id);
            console.log(`[WAITLIST] Promoted waitlist booking ${id} after payment confirmation`);
          } catch (waitlistError) {
            console.error('[ERROR] Failed to update waitlist positions:', waitlistError);
            // Don't fail payment confirmation if waitlist update fails
          }
        } else if (isWaitlistBooking) {
          // Booking was already promoted earlier (e.g., auto-promoted when someone cancelled)
          console.log(
            `[WAITLIST] Booking ${id} was already promoted earlier, only updating payment status`
          );
        }

        console.log(
          `[SUCCESS] Booking ${id} payment_status updated to PAID and capacity incremented atomically`
        );
      } else {
        // If already paid, just update booking (capacity already updated)
        console.log(`Updating booking ${id} payment_status from ${booking.payment_status} to PAID`);
        updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            payment_status: 'PAID',
            amount_paid: amount,
            status: 'CONFIRMED', // Ensure booking status is CONFIRMED when payment is confirmed
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

        // Get schedule info
        updatedSchedule = await prisma.schedule.findUnique({
          where: { id: booking.schedule_id },
          select: { current_bookings: true, max_capacity: true },
        });

        console.log(
          `[SUCCESS] Booking ${id} payment_status updated to:`,
          updatedBooking.payment_status
        );
      }

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
            message: `${member?.full_name || 'Hội viên'} đã thanh toán và xác nhận đặt lớp ${
              booking.schedule.gym_class?.name || 'Lớp học'
            }`,
            data: {
              booking_id: updatedBooking.id,
              schedule_id: updatedBooking.schedule_id,
              class_name: updatedBooking.schedule.gym_class?.name || 'Lớp học',
              member_name: member?.full_name || 'Hội viên',
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
        // Ensure we have member name - try to get it if not already loaded
        let memberName = member?.full_name;
        if (!memberName && booking.member_id) {
          try {
            const memberData = await memberService.getMemberById(booking.member_id);
            memberName = memberData?.full_name;
            if (memberName) {
              member = memberData; // Update member object for consistency
            }
          } catch (err) {
            console.error(`[ERROR] Failed to get member name for socket event:`, err.message);
          }
        }

        const socketPayload = {
          booking_id: updatedBooking.id,
          schedule_id: updatedBooking.schedule_id,
          class_name: updatedBooking.schedule.gym_class?.name || 'Lớp học',
          member_name: memberName || 'Hội viên',
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
            message: `${member?.full_name || 'Hội viên'} đã thanh toán ${new Intl.NumberFormat(
              'vi-VN',
              { style: 'currency', currency: 'VND' }
            ).format(amount)} cho lớp ${booking.schedule.gym_class?.name || 'Lớp học'}`,
            data: {
              booking_id: updatedBooking.id,
              schedule_id: updatedBooking.schedule_id,
              class_name: booking.schedule.gym_class?.name || 'Lớp học',
              member_name: member?.full_name || 'Hội viên',
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
                  member_name: member?.full_name || 'Hội viên',
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

      // IMPROVEMENT: Require cancellation reason
      if (!cancellation_reason || cancellation_reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập lý do hủy để chúng tôi có thể cải thiện dịch vụ',
          errorCode: 'CANCELLATION_REASON_REQUIRED',
          data: null,
        });
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          schedule: {
            include: {
              gym_class: true,
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

      if (booking.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Booking is already cancelled',
          data: null,
        });
      }

      // IMPROVEMENT: Check cancellation penalty
      const bookingImprovementsService = require('../services/booking-improvements.service.js');
      const penaltyCheck = await bookingImprovementsService.checkCancellationPenalty(
        booking.member_id
      );

      if (penaltyCheck.penalty?.type === 'BLOCK_BOOKING') {
        return res.status(403).json({
          success: false,
          message: penaltyCheck.penalty.message,
          errorCode: 'BOOKING_BLOCKED',
          data: {
            penalty: penaltyCheck.penalty,
            recentCancellations: penaltyCheck.recentCancellations,
          },
        });
      }

      // IMPROVEMENT: Calculate refund based on cancellation policy
      const refundInfo = bookingImprovementsService.calculateCancellationRefund(
        booking,
        booking.schedule
      );

      console.log('[REFUND] Calculated refund info:', {
        bookingId: booking.id,
        refundAmount: refundInfo.refundAmount,
        refundPolicy: refundInfo.refundPolicy,
        hoursUntilStart: refundInfo.hoursUntilStart,
        originalAmount: refundInfo.originalAmount,
        payment_status: booking.payment_status,
        amount_paid: booking.amount_paid,
      });

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelled_at: new Date(),
          cancellation_reason: cancellation_reason.trim(),
        },
      });

      // IMPROVEMENT: Track cancellation history
      await bookingImprovementsService.trackCancellationHistory(
        booking.member_id,
        booking.id,
        cancellation_reason,
        refundInfo
      );

      // IMPROVEMENT: Process refund if applicable
      let refundResult = null;
      console.log('[REFUND] Checking refund eligibility:', {
        bookingId: booking.id,
        payment_status: booking.payment_status,
        refundAmount: refundInfo.refundAmount,
        refundPolicy: refundInfo.refundPolicy,
        hoursUntilStart: refundInfo.hoursUntilStart,
        originalAmount: refundInfo.originalAmount,
      });

      // Check if payment is paid (can be 'PAID' or 'COMPLETED')
      const isPaid = booking.payment_status === 'PAID' || booking.payment_status === 'COMPLETED';

      console.log('[REFUND] Eligibility check:', {
        refundAmount: refundInfo.refundAmount,
        isPaid,
        payment_status: booking.payment_status,
        willProcess: refundInfo.refundAmount > 0 && isPaid,
      });

      if (refundInfo.refundAmount > 0 && isPaid) {
        console.log('[REFUND] Processing refund for booking:', booking.id);
        refundResult = await bookingImprovementsService.processRefund(booking, refundInfo);
        console.log('[REFUND] Refund result:', JSON.stringify(refundResult, null, 2));

        // Note: Admin notification will be sent by billing service when refund is created
        // The billing service's createRefund method will call notifyAdminsAboutRefundRequest
        // when shouldAutoProcess = false (which is the case for system-initiated refunds)
      } else {
        console.log('[REFUND] Refund not processed. Reasons:', {
          refundAmount: refundInfo.refundAmount,
          isPaid,
          payment_status: booking.payment_status,
          condition1: refundInfo.refundAmount > 0,
          condition2: isPaid,
        });
      }

      // IMPROVEMENT: Apply penalty if needed
      if (penaltyCheck.penalty?.type === 'DEDUCT_POINTS') {
        // Call member service to deduct points
        try {
          const memberService = require('../services/member.service.js');
          // Note: This requires member service to have a deductPoints method
          // For now, we'll just log it
          console.log(
            '[PENALTY] Should deduct points:',
            penaltyCheck.penalty.points,
            'from member:',
            booking.member_id
          );
        } catch (penaltyError) {
          console.error('[ERROR] Failed to apply penalty:', penaltyError);
        }
      }

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
      // Only decrement if booking is not waitlist (waitlist bookings don't count toward current_bookings)
      let updatedSchedule = null;
      if (!booking.is_waitlist && booking.status !== 'WAITLIST') {
        updatedSchedule = await prisma.schedule.update({
          where: { id: booking.schedule_id },
          data: {
            current_bookings:
              booking.schedule.current_bookings && booking.schedule.current_bookings > 0
                ? {
                    decrement: 1,
                  }
                : undefined,
          },
          select: {
            id: true,
            current_bookings: true,
            max_capacity: true,
          },
        });

        // Emit socket event to update schedule for all users viewing this schedule
        if (global.io) {
          try {
            global.io.to(`schedule:${booking.schedule_id}`).emit('schedule:updated', {
              schedule_id: booking.schedule_id,
              current_bookings: updatedSchedule.current_bookings,
              max_capacity: updatedSchedule.max_capacity,
              action: 'booking_cancelled',
            });
            console.log(`[EMIT] Emitted schedule:updated for schedule ${booking.schedule_id}`);
          } catch (socketError) {
            console.error('[ERROR] Failed to emit schedule:updated event:', socketError);
            // Don't fail cancellation if socket emit fails
          }
        }
      }

      // Notify trainer about booking cancellation
      if (scheduleWithTrainer?.trainer?.user_id && global.io) {
        try {
          const member = bookingWithMember?.member || null;
          const memberName = member?.full_name || 'Hội viên';

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

      // Notify member about booking cancellation (if cancelled by trainer/admin)
      if (bookingWithMember?.member?.user_id) {
        try {
          const member = bookingWithMember.member;
          const memberName = member.full_name || 'Hội viên';
          const className = scheduleWithTrainer?.gym_class?.name || 'Lớp học';

          const notificationService = require('../services/notification.service.js');
          await notificationService.sendNotification({
            user_id: member.user_id,
            member_id: booking.member_id,
            type: 'BOOKING_CANCELLED',
            title: 'Đặt lớp đã bị hủy',
            message: `Đặt lớp ${className} của bạn đã bị hủy bởi trainer. Lý do: ${
              cancellation_reason || 'Chưa thanh toán'
            }`,
            data: {
              booking_id: booking.id,
              schedule_id: booking.schedule_id,
              class_name: className,
              cancellation_reason: cancellation_reason || 'Chưa thanh toán',
              cancelled_by: 'TRAINER',
              role: 'MEMBER',
            },
            channels: ['IN_APP', 'PUSH'],
          });

          // Also emit socket event directly for real-time update
          if (global.io) {
            const socketPayload = {
              booking_id: booking.id,
              schedule_id: booking.schedule_id,
              class_name: className,
              cancelled_at: updatedBooking.cancelled_at,
              cancellation_reason: cancellation_reason || 'Chưa thanh toán',
              cancelled_by: 'TRAINER',
            };

            console.log(`[EMIT] Emitting booking:cancelled to member user:${member.user_id}`);
            global.io.to(`user:${member.user_id}`).emit('booking:cancelled', socketPayload);
            console.log(`[SUCCESS] Socket event booking:cancelled emitted successfully to member`);
          }
        } catch (memberNotifError) {
          console.error(
            '[ERROR] Error notifying member about booking cancellation:',
            memberNotifError
          );
          // Don't fail cancellation if notification fails
        }
      }

      // Auto-promote first person from waitlist when a regular booking is cancelled (theo nghiệp vụ)
      // Chỉ promote nếu cancel booking thường (không phải waitlist booking)
      let waitlistPromoteResult = null;
      if (!booking.is_waitlist && booking.status !== 'WAITLIST') {
        try {
          const promoteResult = await waitlistService.promoteFromWaitlist(booking.schedule_id);
          if (promoteResult && promoteResult.booking) {
            waitlistPromoteResult = promoteResult;
            console.log(
              `[WAITLIST] Auto-promoted booking ${promoteResult.booking.id} from waitlist after cancellation`
            );
            // Notification đã được gửi trong promoteFromWaitlist() method
          } else {
            console.log('[WAITLIST] No one in waitlist to promote after cancellation');
          }
        } catch (promoteError) {
          console.error(
            '[ERROR] Failed to promote from waitlist after cancellation:',
            promoteError
          );
          // Don't fail cancellation if promotion fails
        }
      }

      // Prepare refund info for response
      let refundResponse = null;
      if (refundResult && refundResult.success && refundResult.refundId) {
        refundResponse = {
          refundId: refundResult.refundId,
          refundAmount: refundInfo.refundAmount,
          refundStatus: refundResult.refundStatus || 'PENDING',
          refundPolicy: refundInfo.refundPolicy,
          hoursUntilStart: refundInfo.hoursUntilStart,
          originalAmount: refundInfo.originalAmount,
        };
      } else if (refundInfo.refundAmount > 0) {
        // Refund was calculated but processing failed
        refundResponse = {
          refundAmount: refundInfo.refundAmount,
          refundStatus: refundResult?.refundStatus || 'FAILED',
          refundPolicy: refundInfo.refundPolicy,
          hoursUntilStart: refundInfo.hoursUntilStart,
          originalAmount: refundInfo.originalAmount,
          error: refundResult?.message || 'Refund processing failed',
        };
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: {
          booking: bookingWithMember || updatedBooking,
          refund: refundResponse,
          waitlist_promoted: waitlistPromoteResult
            ? {
                booking_id: waitlistPromoteResult.booking?.id || null,
                member_id: waitlistPromoteResult.booking?.member_id || null,
                message: 'First person from waitlist has been promoted',
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
      const bookingsWithScheduleDate = addScheduleDateToBookings(bookingsWithMembers);

      res.json({
        success: true,
        message: 'Schedule bookings retrieved successfully',
        data: { bookings: bookingsWithScheduleDate },
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
          start_time: {},
        };
        if (from) {
          whereClause.schedule.start_time.gte = new Date(from);
        }
        if (to) {
          // Set to end of day for 'to' date
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          whereClause.schedule.start_time.lte = toDate;
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

  /**
   * IMPROVEMENT: Get cancellation history for a member
   * GET /bookings/members/:member_id/cancellation-history
   */
  async getCancellationHistory(req, res) {
    try {
      const { member_id } = req.params;
      const { limit = 20 } = req.query;

      const bookingImprovementsService = require('../services/booking-improvements.service.js');
      const cancellationHistory = await bookingImprovementsService.getCancellationHistory(
        member_id,
        parseInt(limit)
      );

      return res.json({
        success: true,
        message: 'Cancellation history retrieved successfully',
        data: cancellationHistory,
      });
    } catch (error) {
      console.error('[ERROR] Get cancellation history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve cancellation history',
        error: error.message,
        data: null,
      });
    }
  }

  /**
   * Get refund info for a booking
   * GET /bookings/:id/refund
   */
  async getBookingRefund(req, res) {
    try {
      const { id } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
          data: null,
        });
      }

      const bookingImprovementsService = require('../services/booking-improvements.service.js');
      const refundInfo = await bookingImprovementsService.getRefundInfo(id);

      if (!refundInfo) {
        return res.json({
          success: true,
          message: 'No refund found for this booking',
          data: null,
        });
      }

      return res.json({
        success: true,
        message: 'Refund info retrieved successfully',
        data: refundInfo,
      });
    } catch (error) {
      console.error('[ERROR] Get booking refund error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve refund info',
        data: null,
      });
    }
  }
}

module.exports = new BookingController();
